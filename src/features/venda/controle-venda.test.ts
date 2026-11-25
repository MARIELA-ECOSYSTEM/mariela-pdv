/**
 * Testes SIMULADOS (sem backend real): o controle de venda roda sobre o
 * `vendasApi`/`PdvApiClient` reais, e o `fetch` é substituído por um backend
 * falso que reproduz a idempotência de `VendasService.criar`:
 *   - mesma chave + mesmos itens → devolve a venda já registrada;
 *   - mesma chave + itens diferentes → 409 "Esta idempotencyKey já foi usada
 *     para registrar uma venda diferente..." (texto real do backend).
 * A "perda de resposta" simula o pior caso: o backend REGISTRA a venda e a
 * resposta não chega ao PDV (timeout/queda de rede).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PDV_REQUEST_TIMEOUT_MS, PDV_VENDA_TIMEOUT_MS } from "@/config/pdv.config";
import { PdvTokenStorage } from "@/lib/pdv-token-storage";
import { montarPagamentosParaEnvio } from "@/lib/pagamento";
import { PdvHttpError, _resetRefreshState } from "@/services/api/client";
import { vendasApi } from "@/services/api/vendas.api";
import type { PdvVendaPayload, PdvVendaTentativa } from "@/types/venda";
import { classificarFalhaVenda, criarControleVenda, type ResumoVenda } from "./controle-venda";

type Falha = "perde-resposta" | "rede-antes" | "erro-500-antes" | "estoque";

interface CorpoVenda {
  idempotencyKey: string;
  itens: Array<{ produtoId: string; varianteId: string; quantidade: number }>;
  pagamentos: Array<{ forma: string; valor: number }>;
  [campo: string]: unknown;
}

function resposta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function erroDeRede() {
  return new TypeError("Failed to fetch");
}

function criarBackendSimulado() {
  const vendas = new Map<string, { id: string; assinatura: string }>();
  const corpos: CorpoVenda[] = [];
  const falhas: Falha[] = [];

  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const corpo = JSON.parse(init.body as string) as CorpoVenda;
    corpos.push(corpo);
    const falha = falhas.shift();

    // Falhas que acontecem ANTES de o backend registrar algo.
    if (falha === "rede-antes") throw erroDeRede();
    if (falha === "erro-500-antes") return resposta({ message: "boom" }, 500);
    if (falha === "estoque") {
      return resposta(
        {
          code: "VALIDATION_ERROR",
          message: "Dados inválidos.",
          errors: [
            { field: "quantidade", message: "Estoque insuficiente para Vestido. Disponível: 0." },
          ],
        },
        400,
      );
    }

    const assinatura = JSON.stringify(
      corpo.itens.map((i) => [i.produtoId, i.varianteId, i.quantidade]),
    );
    const existente = vendas.get(corpo.idempotencyKey);
    if (existente && existente.assinatura !== assinatura) {
      return resposta(
        {
          code: "CONFLICT",
          message:
            "Esta idempotencyKey já foi usada para registrar uma venda diferente. Gere uma nova chave para esta operação.",
        },
        409,
      );
    }
    const venda = existente ?? { id: `venda-${vendas.size + 1}`, assinatura };
    vendas.set(corpo.idempotencyKey, venda);

    // A venda FOI registrada, mas a resposta se perde no caminho.
    if (falha === "perde-resposta") throw erroDeRede();

    return resposta({
      data: { id: venda.id, codigo: `VND-${venda.id}`, valorFinal: 89.9, status: "concluida" },
    });
  });

  return { vendas, corpos, falhas, fetchMock };
}

const RESUMO: ResumoVenda = { itens: [], total: 89.9 };

function payload(quantidade = 1, pagamentos = [{ forma: "PIX", valor: 89.9 }]): PdvVendaPayload {
  return {
    itens: [{ produtoId: "p1", varianteId: "v1", tamanhoId: "t1", quantidade }],
    pagamentos,
  };
}

let backend: ReturnType<typeof criarBackendSimulado>;
let estados: Array<PdvVendaTentativa | null>;
let contadorChaves: number;

function novoControle() {
  return criarControleVenda({
    enviar: (p, chave) => vendasApi.criar(p, chave),
    gerarChave: () => `chave-${++contadorChaves}`,
    aoMudar: (t) => estados.push(t),
  });
}

beforeEach(() => {
  localStorage.clear();
  _resetRefreshState();
  PdvTokenStorage.setTokens("access", "refresh");
  backend = criarBackendSimulado();
  vi.stubGlobal("fetch", backend.fetchMock);
  estados = [];
  contadorChaves = 0;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("idempotência da venda", () => {
  it("fluxo normal: uma venda, uma chave, confirmação oficial do backend", async () => {
    const controle = novoControle();

    await controle.finalizar(payload(), RESUMO);

    expect(controle.tentativa).toMatchObject({
      estado: "concluida",
      idempotencyKey: "chave-1",
      vendaId: "venda-1",
      codigo: "VND-venda-1",
      valorFinal: 89.9,
    });
    expect(backend.vendas.size).toBe(1);
  });

  it("resposta perdida depois de o backend registrar: resultado DESCONHECIDO e repetição com a MESMA chave não duplica", async () => {
    const controle = novoControle();
    backend.falhas.push("perde-resposta");

    await controle.finalizar(payload(), RESUMO);
    expect(controle.tentativa).toMatchObject({
      estado: "desconhecida",
      pendencia: "desconhecida",
      idempotencyKey: "chave-1",
    });
    expect(controle.tentativa?.mensagemErro).toMatch(/PODE ter sido registrada/);

    await controle.finalizar(payload(), RESUMO); // "Tentar novamente"

    expect(controle.tentativa).toMatchObject({ estado: "concluida", vendaId: "venda-1" });
    expect(controle.tentativa?.pendencia).toBeUndefined();
    expect(backend.corpos.map((c) => c.idempotencyKey)).toEqual(["chave-1", "chave-1"]);
    expect(backend.vendas.size).toBe(1);
  });

  it("falha de rede ANTES de registrar: a repetição com a mesma chave registra exatamente uma venda", async () => {
    const controle = novoControle();
    backend.falhas.push("rede-antes");

    await controle.finalizar(payload(), RESUMO);
    expect(controle.tentativa?.estado).toBe("desconhecida");
    expect(backend.vendas.size).toBe(0);

    await controle.finalizar(payload(), RESUMO);
    expect(controle.tentativa?.estado).toBe("concluida");
    expect(backend.vendas.size).toBe(1);
  });

  it("erro 5xx é tratado como resultado desconhecido (não gera chave nova)", async () => {
    const controle = novoControle();
    backend.falhas.push("erro-500-antes");

    await controle.finalizar(payload(), RESUMO);
    expect(controle.tentativa).toMatchObject({ estado: "desconhecida", idempotencyKey: "chave-1" });

    await controle.finalizar(payload(), RESUMO);
    expect(backend.corpos.map((c) => c.idempotencyKey)).toEqual(["chave-1", "chave-1"]);
  });

  it("duplo clique em concluir: só um envio sai", async () => {
    const controle = novoControle();

    const primeiro = controle.finalizar(payload(), RESUMO);
    const segundo = controle.finalizar(payload(), RESUMO);
    expect(primeiro).not.toBeNull();
    expect(segundo).toBeNull();
    await primeiro;

    expect(backend.fetchMock).toHaveBeenCalledTimes(1);
    expect(backend.vendas.size).toBe(1);
  });

  it("depois de concluída, a mesma venda não pode ser reenviada", async () => {
    const controle = novoControle();
    await controle.finalizar(payload(), RESUMO);

    expect(controle.finalizar(payload(), RESUMO)).toBeNull();
    expect(backend.fetchMock).toHaveBeenCalledTimes(1);
  });

  it("voltar ao carrinho após resultado desconhecido mantém a chave e a pendência; finalizar de novo não duplica", async () => {
    const controle = novoControle();
    backend.falhas.push("perde-resposta");
    await controle.finalizar(payload(), RESUMO);

    controle.voltarAoCarrinho();
    expect(controle.tentativa).toMatchObject({
      estado: "rascunho",
      idempotencyKey: "chave-1",
      pendencia: "desconhecida",
    });
    // Sem resolução, "nova venda" não pode descartar a chave.
    expect(controle.iniciarNovaVenda()).toBe(false);

    await controle.finalizar(payload(), RESUMO);
    expect(controle.tentativa?.estado).toBe("concluida");
    expect(backend.vendas.size).toBe(1);
  });

  it("carrinho editado depois de uma venda registrada sem confirmação: o backend acusa conflito e NÃO cria segunda venda", async () => {
    const controle = novoControle();
    backend.falhas.push("perde-resposta");
    await controle.finalizar(payload(1), RESUMO);
    controle.voltarAoCarrinho();

    // Vendedora altera a quantidade e finaliza de novo: mesma chave.
    await controle.finalizar(payload(2), RESUMO);

    expect(controle.tentativa).toMatchObject({ estado: "conflito", pendencia: "conflito" });
    expect(controle.tentativa?.mensagemErro).toMatch(/JÁ FOI registrada/);
    expect(backend.vendas.size).toBe(1);

    // Reenviar fica bloqueado até a decisão consciente.
    controle.voltarAoCarrinho();
    expect(controle.finalizar(payload(2), RESUMO)).toBeNull();
    expect(controle.iniciarNovaVenda()).toBe(false);
    expect(backend.vendas.size).toBe(1);
  });

  it("chave só é renovada por decisão consciente após conflito", async () => {
    const controle = novoControle();
    backend.falhas.push("perde-resposta");
    await controle.finalizar(payload(1), RESUMO);
    controle.voltarAoCarrinho();
    await controle.finalizar(payload(2), RESUMO);
    controle.voltarAoCarrinho();

    expect(controle.registrarComoNovaVenda()).toBe(true);
    expect(controle.tentativa).toBeNull();

    await controle.finalizar(payload(2), RESUMO);
    expect(controle.tentativa).toMatchObject({ estado: "concluida", idempotencyKey: "chave-2" });
    expect(backend.vendas.size).toBe(2);
  });

  it("registrarComoNovaVenda é recusado sem conflito (ex.: resultado apenas desconhecido)", async () => {
    const controle = novoControle();
    backend.falhas.push("perde-resposta");
    await controle.finalizar(payload(), RESUMO);

    expect(controle.registrarComoNovaVenda()).toBe(false);
    expect(controle.tentativa?.idempotencyKey).toBe("chave-1");
  });

  it("recusa do backend (4xx): nada foi criado, mensagem do backend é exibida e a chave é mantida para corrigir e reenviar", async () => {
    const controle = novoControle();
    backend.falhas.push("estoque");

    await controle.finalizar(payload(), RESUMO);
    expect(controle.tentativa).toMatchObject({ estado: "erro", idempotencyKey: "chave-1" });
    expect(controle.tentativa?.pendencia).toBeUndefined();
    expect(controle.tentativa?.mensagemErro).toMatch(/Estoque insuficiente/);

    controle.voltarAoCarrinho();
    await controle.finalizar(payload(), RESUMO);
    expect(controle.tentativa).toMatchObject({ estado: "concluida", idempotencyKey: "chave-1" });
    expect(backend.vendas.size).toBe(1);
  });

  it("recusa depois de um resultado desconhecido NÃO apaga a pendência", async () => {
    const controle = novoControle();
    backend.falhas.push("perde-resposta", "estoque");

    await controle.finalizar(payload(), RESUMO);
    await controle.finalizar(payload(), RESUMO);

    expect(controle.tentativa).toMatchObject({ estado: "erro", pendencia: "desconhecida" });
    expect(controle.iniciarNovaVenda()).toBe(false);
  });

  it("nova venda depois de concluída gera chave nova", async () => {
    const controle = novoControle();
    await controle.finalizar(payload(), RESUMO);

    expect(controle.iniciarNovaVenda()).toBe(true);
    await controle.finalizar(payload(), RESUMO);

    expect(backend.corpos.map((c) => c.idempotencyKey)).toEqual(["chave-1", "chave-2"]);
    expect(backend.vendas.size).toBe(2);
  });

  it("estado é publicado para a interface a cada transição", async () => {
    const controle = novoControle();
    await controle.finalizar(payload(), RESUMO);
    expect(estados.map((e) => e?.estado)).toEqual(["processando", "concluida"]);
  });
});

describe("timeout do POST /pdv/vendas", () => {
  it("usa o timeout próprio da venda e trata o estouro como resultado desconhecido", async () => {
    expect(PDV_VENDA_TIMEOUT_MS).toBeGreaterThan(PDV_REQUEST_TIMEOUT_MS);
    vi.useFakeTimers();
    const fetchPendurado = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
          );
        }),
    );
    vi.stubGlobal("fetch", fetchPendurado);
    const controle = novoControle();

    const envio = controle.finalizar(payload(), RESUMO);
    await vi.advanceTimersByTimeAsync(PDV_REQUEST_TIMEOUT_MS + 1);
    expect(controle.tentativa?.estado).toBe("processando");

    await vi.advanceTimersByTimeAsync(PDV_VENDA_TIMEOUT_MS);
    await envio;
    expect(controle.tentativa).toMatchObject({ estado: "desconhecida", idempotencyKey: "chave-1" });
  });
});

describe("payload enviado ao backend com dinheiro e troco", () => {
  it("dinheiro R$ 100 numa venda de R$ 89,90: envia R$ 89,90, sem troco, com a idempotencyKey", async () => {
    const controle = novoControle();
    const { pagamentos } = montarPagamentosParaEnvio([{ forma: "Dinheiro", valor: 100 }], 89.9);

    await controle.finalizar(payload(1, pagamentos), RESUMO);

    const corpo = backend.corpos[0]!;
    expect(corpo.pagamentos).toEqual([{ forma: "Dinheiro", valor: 89.9 }]);
    expect(corpo["troco"]).toBeUndefined();
    expect(corpo.idempotencyKey).toBe("chave-1");
    expect(controle.tentativa?.estado).toBe("concluida");
  });
});

describe("payload com cartão (Fase B) sobre a idempotência da Fase A", () => {
  it("crédito com adquirente real: modalidade, adquirenteId e parcelas vão no corpo; retry reaproveita a chave", async () => {
    const controle = novoControle();
    backend.falhas.push("perde-resposta");
    const { pagamentos } = montarPagamentosParaEnvio(
      [{ forma: "Crédito", valor: 89.9, adquirenteId: "665f1c2e9b1d4a0012345678", parcelas: 6 }],
      89.9,
    );

    await controle.finalizar(payload(1, pagamentos), RESUMO);
    await controle.finalizar(payload(1, pagamentos), RESUMO);

    expect(backend.corpos.map((c) => c.pagamentos)).toEqual([
      [
        {
          forma: "Crédito",
          valor: 89.9,
          modalidade: "credito",
          adquirenteId: "665f1c2e9b1d4a0012345678",
          parcelas: 6,
        },
      ],
      [
        {
          forma: "Crédito",
          valor: 89.9,
          modalidade: "credito",
          adquirenteId: "665f1c2e9b1d4a0012345678",
          parcelas: 6,
        },
      ],
    ]);
    expect(backend.corpos.map((c) => c.idempotencyKey)).toEqual(["chave-1", "chave-1"]);
    expect(controle.tentativa?.estado).toBe("concluida");
    expect(backend.vendas.size).toBe(1);
  });
});

describe("classificarFalhaVenda", () => {
  it.each([
    [new PdvHttpError("A operação demorou demais."), "desconhecida"],
    [new PdvHttpError("Sem conexão."), "desconhecida"],
    [new PdvHttpError("indisponível", 503), "desconhecida"],
    [new PdvHttpError("conflito de escrita", 409), "desconhecida"],
    [
      new PdvHttpError(
        "Esta idempotencyKey já foi usada para registrar uma venda diferente. Gere uma nova chave para esta operação.",
        409,
      ),
      "conflito",
    ],
    [new PdvHttpError("Estoque insuficiente", 400), "erro"],
    [new PdvHttpError("Sessão expirada", 401), "erro"],
    [new Error("VITE_API_URL não está configurada."), "erro"],
  ] as const)("%s → %s", (erro, esperado) => {
    expect(classificarFalhaVenda(erro).tipo).toBe(esperado);
  });

  it("conflito nunca mostra o texto técnico de idempotencyKey à vendedora", () => {
    const { mensagem } = classificarFalhaVenda(
      new PdvHttpError("Esta idempotencyKey já foi usada para registrar uma venda diferente.", 409),
    );
    expect(mensagem).not.toMatch(/idempotency/i);
  });
});
