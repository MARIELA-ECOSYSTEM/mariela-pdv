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
    desconto: 0,
    itens: [{ produtoId: "p1", varianteId: "p1-m", quantidade: 1 }],
    pagamentos: [{ forma: "PIX", valor: 100 }],
  };

  it("envia a chave de idempotência no header", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "v1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await vendasApi.criar(payload, "chave-1");

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("chave-1");
  });

  it("retry da mesma tentativa reutiliza a mesma chave", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "v1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(vendasApi.criar(payload, "chave-2")).rejects.toBeTruthy();
    await vendasApi.criar(payload, "chave-2");

    const chaves = fetchMock.mock.calls.map(
      ([, init]) => (init as RequestInit).headers as Record<string, string>,
    );
    expect(chaves.map((h) => h["Idempotency-Key"])).toEqual(["chave-2", "chave-2"]);
  });
});
