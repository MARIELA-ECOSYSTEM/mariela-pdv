import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdvTokenStorage } from "@/lib/pdv-token-storage";
import { _resetRefreshState } from "./client";
import { vendasApi } from "./vendas.api";
import type { PdvVendaPayload } from "@/types/venda";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  localStorage.clear();
  _resetRefreshState();
  PdvTokenStorage.setTokens("access", "refresh");
});

afterEach(() => vi.restoreAllMocks());

const PAYLOAD: PdvVendaPayload = {
  clienteId: "cli1",
  descontoVenda: { tipo: "monetario", valor: 10 },
  itens: [{ produtoId: "p1", varianteId: "v1", tamanhoId: "t1", quantidade: 2 }],
  pagamentos: [{ forma: "dinheiro", valor: 189.9 }],
};

describe("vendasApi.criar", () => {
  it("envia apenas a intenção permitida pelo DTO (ids reais, descontoVenda, idempotencyKey)", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "venda1", status: "concluida" }));
    vi.stubGlobal("fetch", fetchMock);

    const venda = await vendasApi.criar(PAYLOAD, "chave-1");

    expect(venda).toEqual({ id: "venda1", status: "concluida" });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://backend.test/api/v1/pdv/vendas");
    const corpo = JSON.parse((init.body as string) ?? "{}") as Record<string, unknown>;

    expect(corpo["idempotencyKey"]).toBe("chave-1");
    // "monetario" (vocabulário do frontend) → "valor" (nome real do backend, TIPOS_DESCONTO).
    expect(corpo["descontoVenda"]).toEqual({ tipo: "valor", valor: 10 });
    expect(corpo["itens"]).toEqual([
      { produtoId: "p1", varianteId: "v1", tamanhoId: "t1", quantidade: 2 },
    ]);

    // Nenhum valor financeiro calculado pelo frontend pode ir no corpo.
    for (const proibido of [
      "preco",
      "precoUnitario",
      "subtotal",
      "total",
      "valorFinal",
      "troco",
      "vendedorId",
      "caixaId",
    ]) {
      expect(corpo[proibido]).toBeUndefined();
    }
    const item = (corpo["itens"] as Array<Record<string, unknown>>)[0]!;
    expect(Object.keys(item).sort()).toEqual([
      "produtoId",
      "quantidade",
      "tamanhoId",
      "varianteId",
    ]);
  });

  it("reutiliza a mesma idempotencyKey no retry da mesma tentativa", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ id: "venda1" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(vendasApi.criar(PAYLOAD, "chave-2")).rejects.toThrow();
    await vendasApi.criar(PAYLOAD, "chave-2");

    const chaves = fetchMock.mock.calls.map((c) => {
      const init = c[1] as RequestInit;
      return JSON.parse((init.body as string) ?? "{}")["idempotencyKey"];
    });
    expect(chaves).toEqual(["chave-2", "chave-2"]);
  });

  it("desconto por item é enviado e traduzido (ItemVendaPdvDto.desconto, desconto-pdv.dto.ts)", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "venda1" }));
    vi.stubGlobal("fetch", fetchMock);

    const payload: PdvVendaPayload = {
      itens: [
        {
          produtoId: "p1",
          varianteId: "v1",
          tamanhoId: "t1",
          quantidade: 1,
          desconto: { tipo: "percentual", valor: 15 },
        },
      ],
      pagamentos: [{ forma: "dinheiro", valor: 85 }],
    };

    await vendasApi.criar(payload, "chave-item-desconto");

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const corpo = JSON.parse((init.body as string) ?? "{}") as {
      itens: Array<Record<string, unknown>>;
    };
    // "percentual" já é o mesmo nome dos dois lados — só "monetario" muda para "valor".
    expect(corpo.itens[0]?.["desconto"]).toEqual({ tipo: "percentual", valor: 15 });
  });

  it("desconto zerado (DESCONTO_ZERO) não é enviado — nem no item nem na venda", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "venda1" }));
    vi.stubGlobal("fetch", fetchMock);

    const payload: PdvVendaPayload = {
      descontoVenda: { tipo: "percentual", valor: 0 },
      itens: [
        {
          produtoId: "p1",
          varianteId: "v1",
          tamanhoId: "t1",
          quantidade: 1,
          desconto: { tipo: "percentual", valor: 0 },
        },
      ],
      pagamentos: [{ forma: "dinheiro", valor: 100 }],
    };

    await vendasApi.criar(payload, "chave-sem-desconto");

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const corpo = JSON.parse((init.body as string) ?? "{}") as {
      descontoVenda?: unknown;
      itens: Array<Record<string, unknown>>;
    };
    expect(corpo.descontoVenda).toBeUndefined();
    expect(corpo.itens[0]?.["desconto"]).toBeUndefined();
  });
});
