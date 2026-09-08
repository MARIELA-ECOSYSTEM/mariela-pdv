import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdvTokenStorage } from "@/lib/pdv-token-storage";
import { authApi } from "./auth.api";
import { _resetRefreshState, PdvHttpError } from "./client";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  localStorage.clear();
  _resetRefreshState();
});

afterEach(() => vi.restoreAllMocks());

describe("authApi.login", () => {
  it("envia { codigo, senha } — o backend não aceita `login`", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        accessToken: "access-1",
        refreshToken: "refresh-1",
        expiresIn: 1800,
        vendedor: { id: "v1", codigo: "VEN-0001", nome: "Ana Paula", foto: null, ativo: true },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await authApi.login({ login: "VEN-0001", senha: "minhasenha" });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const corpo = JSON.parse((init.body as string) ?? "{}") as Record<string, unknown>;
    expect(corpo).toEqual({ codigo: "VEN-0001", senha: "minhasenha" });
    expect(corpo["login"]).toBeUndefined();
  });

  it("desembrulha { data } e devolve o vendedor + grava os tokens", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          accessToken: "access-2",
          refreshToken: "refresh-2",
          vendedor: { id: "v1", codigo: "VEN-0001", nome: "Ana Paula", foto: null, ativo: true },
        }),
      ),
    );

    const vendedor = await authApi.login({ login: "VEN-0001", senha: "minhasenha" });

    expect(vendedor).toEqual({ id: "v1", codigo: "VEN-0001", nome: "Ana Paula", foto: null, ativo: true });
    expect(PdvTokenStorage.getAccessToken()).toBe("access-2");
    expect(PdvTokenStorage.getRefreshToken()).toBe("refresh-2");
  });
});

describe("authApi.logout", () => {
  it("envia o refreshToken salvo no corpo da requisição", async () => {
    PdvTokenStorage.setTokens("access", "refresh-atual");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await authApi.logout();

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const corpo = JSON.parse((init.body as string) ?? "{}") as Record<string, unknown>;
    expect(corpo).toEqual({ refreshToken: "refresh-atual" });
  });

  it("limpa a sessão local mesmo quando a API de logout falha", async () => {
    PdvTokenStorage.setTokens("access", "refresh-atual");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );

    // authApi.logout() propaga o erro (quem absorve é PdvAuthProvider.sair(),
    // com .catch(() => undefined)) — mas a sessão local já foi limpa no
    // `finally` antes do erro subir, independentemente do resultado da API.
    await expect(authApi.logout()).rejects.toBeInstanceOf(PdvHttpError);

    expect(PdvTokenStorage.getAccessToken()).toBeNull();
    expect(PdvTokenStorage.getRefreshToken()).toBeNull();
  });

  it("sem refresh token local, não chama a API e apenas limpa a sessão", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await authApi.logout();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(PdvTokenStorage.getAccessToken()).toBeNull();
  });
});

describe("authApi.me", () => {
  it("desembrulha { data } e devolve o vendedor diretamente", async () => {
    PdvTokenStorage.setTokens("access", "refresh");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ id: "v1", codigo: "VEN-0001", nome: "Ana Paula", foto: null, ativo: true }),
      ),
    );

    const vendedor = await authApi.me();

    expect(vendedor).toEqual({
      id: "v1",
      codigo: "VEN-0001",
      nome: "Ana Paula",
      foto: null,
      ativo: true,
    });
  });
});
