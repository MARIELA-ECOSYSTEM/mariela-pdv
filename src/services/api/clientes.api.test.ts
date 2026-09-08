import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdvTokenStorage } from "@/lib/pdv-token-storage";
import { clientesApi } from "./clientes.api";
import { _resetRefreshState } from "./client";

beforeEach(() => {
  localStorage.clear();
  _resetRefreshState();
  PdvTokenStorage.setTokens("access", "refresh");
});

afterEach(() => vi.restoreAllMocks());

describe("clientesApi.listar", () => {
  it("desembrulha { data, meta } e envia o termo como `busca`", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: "cli1",
                codigo: "CLI-0001",
                nome: "Ana Souza",
                foto: null,
                telefone: "11999990000",
              },
            ],
            meta: { total: 1 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const lista = await clientesApi.listar({ busca: "ana souza" });

    expect(lista).toEqual([
      { id: "cli1", codigo: "CLI-0001", nome: "Ana Souza", foto: null, telefone: "11999990000" },
    ]);
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("http://backend.test/api/v1/pdv/clientes?busca=ana%20souza");
  });
});
