import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdvTokenStorage } from "@/lib/pdv-token-storage";
import { PdvHttpError, _resetRefreshState } from "./client";
import { produtosApi } from "./produtos.api";

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

/** Shape real de ProdutoCatalogoPdv (backend) usado nos mocks de resposta. */
const PRODUTO_BRUTO = {
  id: "p1",
  codProduto: "PROD-0007",
  nome: "Vestido Midi Amalfi",
  imagem: "https://cdn.mariela.test/p1.jpg",
  precoEfetivo: 199.9,
  disponivel: true,
  variantes: [
    {
      id: "v1",
      cor: "Azul",
      foto: "https://cdn.mariela.test/p1-azul.jpg",
      quantidade: 4,
      disponivel: true,
      tamanhos: [{ id: "t1", tamanho: "M", quantidade: 4, disponivel: true }],
    },
  ],
};

const PRODUTO_TRADUZIDO = {
  id: "p1",
  codigo: "PROD-0007",
  nome: "Vestido Midi Amalfi",
  imagemUrl: "https://cdn.mariela.test/p1.jpg",
  preco: 199.9,
  disponivel: true,
  variantes: PRODUTO_BRUTO.variantes,
};

/** Envelope real de listagem: { data: [...], meta: { total, page, limit, totalPages } }. */
function paginaResponse(
  data: unknown[],
  meta: { total: number; page: number; limit: number; totalPages: number },
  status = 200,
) {
  return new Response(JSON.stringify({ data, meta }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** SIMULADO: `fetch` substituído; formato conforme pdv-produtos.http.e2e.spec.ts do backend. */
describe("produtosApi.listar", () => {
  it("traduz codProduto/precoEfetivo/imagem, preservando variantes/tamanhos, e devolve o meta da página", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        paginaResponse([PRODUTO_BRUTO], { total: 1, page: 1, limit: 60, totalPages: 1 }),
      ),
    );

    const pagina = await produtosApi.listar();

    expect(pagina).toEqual({ itens: [PRODUTO_TRADUZIDO], pagina: 1, totalPaginas: 1, total: 1 });
    // Os ids reais de variante/tamanho nunca são reescritos na tradução.
    expect(pagina.itens[0]?.variantes[0]?.id).toBe("v1");
    expect(pagina.itens[0]?.variantes[0]?.tamanhos[0]?.id).toBe("t1");
  });

  it("envia busca, page e limit que o backend aceita (ListarProdutosPdvQueryDto)", async () => {
    const fetchMock = vi.fn(async () =>
      paginaResponse([], { total: 0, page: 2, limit: 60, totalPages: 1 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await produtosApi.listar({ busca: "PROD-0031", page: 2, limit: 60 });

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("http://backend.test/api/v1/pdv/produtos?busca=PROD-0031&page=2&limit=60");
  });

  it("produto além dos primeiros: a página 2 traz os itens seguintes e o total real", async () => {
    const produto61 = { ...PRODUTO_BRUTO, id: "p61", codProduto: "PROD-0061" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        paginaResponse([produto61], { total: 61, page: 2, limit: 60, totalPages: 2 }),
      ),
    );

    const pagina = await produtosApi.listar({ page: 2, limit: 60 });

    expect(pagina.itens.map((p) => p.codigo)).toEqual(["PROD-0061"]);
    expect(pagina).toMatchObject({ pagina: 2, totalPaginas: 2, total: 61 });
  });

  it("lista vazia", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => paginaResponse([], { total: 0, page: 1, limit: 60, totalPages: 1 })),
    );
    expect(await produtosApi.listar({ busca: "nada" })).toEqual({
      itens: [],
      pagina: 1,
      totalPaginas: 1,
      total: 0,
    });
  });

  it("resposta sem meta: uma única página com o que veio", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([PRODUTO_BRUTO])),
    );
    expect(await produtosApi.listar()).toEqual({
      itens: [PRODUTO_TRADUZIDO],
      pagina: 1,
      totalPaginas: 1,
      total: 1,
    });
  });

  it("falha da API é propagada (a tela mostra o erro)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(null, 500)),
    );
    await expect(produtosApi.listar()).rejects.toBeInstanceOf(PdvHttpError);
  });
});

describe("produtosApi.obter", () => {
  it("desembrulha { data: {...} } e traduz da mesma forma que a listagem", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(PRODUTO_BRUTO)),
    );

    const produto = await produtosApi.obter("p1");

    expect(produto).toEqual(PRODUTO_TRADUZIDO);
  });
});
