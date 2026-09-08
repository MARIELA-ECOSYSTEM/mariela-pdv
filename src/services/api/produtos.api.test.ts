import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdvTokenStorage } from "@/lib/pdv-token-storage";
import { _resetRefreshState } from "./client";
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

describe("produtosApi.listar", () => {
  it("desembrulha { data: [...], meta } e traduz codProduto/precoEfetivo/imagem, preservando variantes/tamanhos", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([PRODUTO_BRUTO])));

    const lista = await produtosApi.listar();

    expect(lista).toEqual([PRODUTO_TRADUZIDO]);
    // Os ids reais de variante/tamanho nunca são reescritos na tradução.
    expect(lista[0]?.variantes[0]?.id).toBe("v1");
    expect(lista[0]?.variantes[0]?.tamanhos[0]?.id).toBe("t1");
  });
});

describe("produtosApi.obter", () => {
  it("desembrulha { data: {...} } e traduz da mesma forma que a listagem", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(PRODUTO_BRUTO)));

    const produto = await produtosApi.obter("p1");

    expect(produto).toEqual(PRODUTO_TRADUZIDO);
  });
});
