import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdvTokenStorage } from "@/lib/pdv-token-storage";
import { caixaApi } from "./caixa.api";
import { _resetRefreshState } from "./client";

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

describe("caixaApi.atual", () => {
  it("{ data: null } (nenhum caixa aberto) vira null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(null)),
    );

    const atual = await caixaApi.atual();

    expect(atual).toBeNull();
  });

  it("{ data: {...} } vira o objeto do caixa", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          id: "c1",
          codigo: "CAIXA-0001",
          status: "aberto",
          abertura: { dataHora: "2026-09-07T10:00:00.000Z", valorInicial: 200 },
        }),
      ),
    );

    const atual = await caixaApi.atual();

    expect(atual).toMatchObject({ id: "c1", status: "aberto" });
  });
});

describe("caixaApi.abrir", () => {
  it("envia o valor digitado como `valorInicial` (não `valorAbertura`)", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "c1", codigo: "CAIXA-0001" }));
    vi.stubGlobal("fetch", fetchMock);

    await caixaApi.abrir(250);

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const corpo = JSON.parse((init.body as string) ?? "{}") as Record<string, unknown>;
    expect(corpo).toEqual({ valorInicial: 250 });
    expect(corpo["valorAbertura"]).toBeUndefined();
  });
});
