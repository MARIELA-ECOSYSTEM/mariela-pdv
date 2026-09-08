import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdvTokenStorage } from "@/lib/pdv-token-storage";
import { _resetRefreshState } from "./client";
import { vendasApi } from "./vendas.api";

beforeEach(() => {
  localStorage.clear();
  _resetRefreshState();
  PdvTokenStorage.setTokens("access", "refresh");
});

afterEach(() => vi.restoreAllMocks());

describe("POST /api/v1/pdv/vendas", () => {
  const payload = {
    descontoVenda: 0,
    itens: [{ produtoId: "p1", varianteId: "p1-preto", tamanhoId: "p1-preto-m", quantidade: 1 }],
    pagamentos: [{ forma: "PIX", valor: 100 }],
  };

  function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify({ data: body }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  it("envia descontoVenda (não `desconto`) no corpo", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "v1" }));
    vi.stubGlobal("fetch", fetchMock);

    await vendasApi.criar(payload, "chave-desconto");

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const corpo = JSON.parse((init.body as string) ?? "{}") as Record<string, unknown>;
    expect(corpo["descontoVenda"]).toBe(0);
    expect(corpo["desconto"]).toBeUndefined();
  });

  it("cada item contém produtoId, varianteId, tamanhoId e quantidade — os IDs reais exigidos por ItemVendaPdvDto", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "v1" }));
    vi.stubGlobal("fetch", fetchMock);

    await vendasApi.criar(payload, "chave-itens");

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const corpo = JSON.parse((init.body as string) ?? "{}") as { itens: Record<string, unknown>[] };
    expect(corpo.itens).toEqual([
      { produtoId: "p1", varianteId: "p1-preto", tamanhoId: "p1-preto-m", quantidade: 1 },
    ]);
  });

  it("o payload nunca carrega preço/subtotal/valorFinal/troco/vendedorId/caixaId como autoridade", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "v1" }));
    vi.stubGlobal("fetch", fetchMock);

    await vendasApi.criar(payload, "chave-sem-financeiro");

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const corpo = JSON.parse((init.body as string) ?? "{}") as Record<string, unknown>;
    for (const campoProibido of [
      "preco",
      "precoUnitario",
      "subtotal",
      "valorFinal",
      "troco",
      "vendedorId",
      "caixaId",
    ]) {
      expect(corpo[campoProibido]).toBeUndefined();
    }
  });

  it("envia a chave de idempotência no header E no corpo (CriarVendaPdvDto exige o campo)", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "v1" }));
    vi.stubGlobal("fetch", fetchMock);

    await vendasApi.criar(payload, "chave-1");

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("chave-1");
    const corpo = JSON.parse((init.body as string) ?? "{}") as Record<string, unknown>;
    expect(corpo["idempotencyKey"]).toBe("chave-1");
  });

  it("retry da mesma tentativa reutiliza a mesma chave (header e corpo)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ id: "v1" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(vendasApi.criar(payload, "chave-2")).rejects.toBeTruthy();
    await vendasApi.criar(payload, "chave-2");

    const chamadas = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const chavesHeader = chamadas.map(
      ([, init]) => (init.headers as Record<string, string>)["Idempotency-Key"],
    );
    const chavesCorpo = chamadas.map(
      ([, init]) =>
        (JSON.parse((init.body as string) ?? "{}") as Record<string, unknown>)["idempotencyKey"],
    );
    expect(chavesHeader).toEqual(["chave-2", "chave-2"]);
    expect(chavesCorpo).toEqual(["chave-2", "chave-2"]);
  });
});
