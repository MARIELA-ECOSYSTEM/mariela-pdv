/**
 * SIMULADO: `fetch` substituído; as respostas reproduzem o contrato real
 * coberto pelo e2e do backend (`pdv-pagamentos.http.e2e.spec.ts`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdvTokenStorage } from "@/lib/pdv-token-storage";
import { PdvHttpError, _resetRefreshState } from "./client";
import { apiDataSource } from "./index";
import { pagamentosApi } from "./pagamentos.api";

function resposta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const ADQUIRENTES_DA_API = [
  {
    id: "665f1c2e9b1d4a0012345678",
    nome: "Stone",
    modalidades: {
      debito: { tarifaPercentual: 1.2 },
      credito: {
        opcoes: [
          { parcelas: 1, tarifaPercentual: 2.9 },
          { parcelas: 6, tarifaPercentual: 4.5 },
        ],
      },
    },
  },
  {
    id: "665f1c2e9b1d4a0087654321",
    nome: "Cielo",
    modalidades: { debito: null, credito: { opcoes: [{ parcelas: 3, tarifaPercentual: 3.3 }] } },
  },
];

beforeEach(() => {
  localStorage.clear();
  _resetRefreshState();
  PdvTokenStorage.setTokens("access", "refresh");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/v1/pdv/pagamentos/formas", () => {
  it("chama o endpoint real com o token do PDV e devolve as formas cadastradas", async () => {
    const fetchMock = vi.fn(async () =>
      resposta({ data: ["Dinheiro", "PIX", "Cartão de Crédito"] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const formas = await pagamentosApi.listarFormas();

    expect(formas).toEqual(["Dinheiro", "PIX", "Cartão de Crédito"]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://backend.test/api/v1/pdv/pagamentos/formas");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer access");
  });

  it("lista vazia é devolvida como vazia (sem fallback para lista fixa)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => resposta({ data: [] })),
    );
    expect(await pagamentosApi.listarFormas()).toEqual([]);
  });

  it("falha da API vira PdvHttpError (sem fallback)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => resposta({ message: "erro" }, 500)),
    );
    await expect(pagamentosApi.listarFormas()).rejects.toBeInstanceOf(PdvHttpError);
  });
});

describe("GET /api/v1/pdv/pagamentos/adquirentes", () => {
  it("devolve as adquirentes reais, com ids e modalidades tal como a API envia", async () => {
    const fetchMock = vi.fn(async () => resposta({ data: ADQUIRENTES_DA_API }));
    vi.stubGlobal("fetch", fetchMock);

    const adquirentes = await pagamentosApi.listarAdquirentes();

    expect(adquirentes).toEqual(ADQUIRENTES_DA_API);
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("http://backend.test/api/v1/pdv/pagamentos/adquirentes");
  });

  it("falha da API vira PdvHttpError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))),
    );
    await expect(pagamentosApi.listarAdquirentes()).rejects.toBeInstanceOf(PdvHttpError);
  });
});

it("o adaptador de API real usa pagamentosApi (não o mock)", () => {
  expect(apiDataSource.pagamentos).toBe(pagamentosApi);
});
