import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdvTokenStorage } from "@/lib/pdv-token-storage";
import { PdvApiClient, PdvHttpError, _resetRefreshState, onSessaoExpirada } from "./client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  localStorage.clear();
  _resetRefreshState();
  PdvTokenStorage.setTokens("access-antigo", "refresh-valido");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PdvApiClient", () => {
  it("sucesso: envia Bearer token e desembrulha o envelope { data }", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ data: [{ id: "c1", nome: "Ana" }] }));
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await PdvApiClient.get<Array<{ id: string }>>("/api/v1/pdv/clientes");

    expect(resultado[0]?.id).toBe("c1");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://backend.test/api/v1/pdv/clientes");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer access-antigo");
  });

  it("sucesso: { data: null } (ex.: caixa/atual sem caixa aberto) vira null, não um objeto truthy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ data: null })),
    );

    const resultado = await PdvApiClient.get<{ id: string } | null>("/api/v1/pdv/caixa/atual");

    expect(resultado).toBeNull();
  });

  it("erro HTTP: converte status em PdvHttpError com mensagem operacional", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ code: "CAIXA_CONFLITO" }, 409)),
    );

    await expect(PdvApiClient.get("/api/v1/pdv/caixa/atual")).rejects.toMatchObject({
      name: "PdvHttpError",
      status: 409,
      code: "CAIXA_CONFLITO",
    });
  });

  it("token expirado: faz refresh e repete a requisição uma única vez", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "expirado" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({ data: { accessToken: "access-novo", refreshToken: "r2" } }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(PdvApiClient.get("/api/v1/pdv/auth/me")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(PdvTokenStorage.getAccessToken()).toBe("access-novo");
  });

  it("refresh concorrente: um único POST /auth/refresh para várias chamadas", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/refresh")) {
        await new Promise((r) => setTimeout(r, 20));
        return jsonResponse({ data: { accessToken: "access-novo" } });
      }
      const token = PdvTokenStorage.getAccessToken();
      return token === "access-novo" ? jsonResponse({ data: { ok: true } }) : jsonResponse({}, 401);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await Promise.all([
      PdvApiClient.get("/api/v1/pdv/produtos"),
      PdvApiClient.get("/api/v1/pdv/clientes"),
      PdvApiClient.get("/api/v1/pdv/caixa/atual"),
    ]);

    const refreshes = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/auth/refresh"));
    expect(refreshes).toHaveLength(1);
  });

  it("logout: refresh falhando limpa tokens e avisa a sessão expirada", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({}, 401)),
    );
    const aviso = vi.fn();
    const cancelar = onSessaoExpirada(aviso);

    await expect(PdvApiClient.get("/api/v1/pdv/auth/me")).rejects.toBeInstanceOf(PdvHttpError);

    expect(aviso).toHaveBeenCalledTimes(1);
    expect(PdvTokenStorage.getAccessToken()).toBeNull();
    expect(PdvTokenStorage.getRefreshToken()).toBeNull();
    cancelar();
  });

  it("API indisponível: falha de rede vira mensagem de conexão", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    await expect(PdvApiClient.get("/api/v1/pdv/produtos")).rejects.toMatchObject({
      message: "Não foi possível falar com o servidor. Verifique a conexão.",
    });
  });
});
