/** SIMULADO: porta de produtos falsa (sem backend). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { PdvProduto } from "@/types/produto";
import { juntarPaginas, relerProdutosVendidos, substituirProdutos } from "./catalogo";

function produto(id: string, estoque = 5): PdvProduto {
  return {
    id,
    nome: `Produto ${id}`,
    codigo: `PROD-${id}`,
    preco: 100,
    imagemUrl: null,
    disponivel: estoque > 0,
    variantes: [
      {
        id: `${id}-v`,
        cor: "Preto",
        foto: null,
        quantidade: estoque,
        disponivel: estoque > 0,
        tamanhos: [{ id: `${id}-t`, tamanho: "M", quantidade: estoque, disponivel: estoque > 0 }],
      },
    ],
  };
}

describe("páginas do catálogo", () => {
  it("“Carregar mais” acrescenta a página seguinte sem repetir produtos", () => {
    const pagina1 = Array.from({ length: 60 }, (_, i) => produto(String(i + 1)));
    const pagina2 = [produto("60"), produto("61"), produto("62")];

    const lista = juntarPaginas(pagina1, pagina2);

    expect(lista).toHaveLength(62);
    expect(lista.map((p) => p.id).slice(-2)).toEqual(["61", "62"]);
  });
});

describe("estoque após venda", () => {
  it("relê só os produtos vendidos (um GET por produto distinto)", async () => {
    const obter = vi.fn(async (id: string) => produto(id, 1));

    const atualizados = await relerProdutosVendidos(["a", "b", "a"], { obter });

    expect(obter).toHaveBeenCalledTimes(2);
    expect(obter.mock.calls.map(([id]) => id)).toEqual(["a", "b"]);
    expect(atualizados.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("falha ao reler um produto não derruba os demais", async () => {
    const obter = vi.fn(async (id: string) => {
      if (id === "a") throw new Error("rede");
      return produto(id, 0);
    });
    expect((await relerProdutosVendidos(["a", "b"], { obter })).map((p) => p.id)).toEqual(["b"]);
  });

  it("estoque do produto e do tamanho/variante vendidos é substituído na lista; os outros ficam como estão", () => {
    const lista = [produto("a", 5), produto("b", 3), produto("c", 2)];
    const vendidoA = produto("a", 4);

    const nova = substituirProdutos(lista, [vendidoA]);

    expect(nova[0]?.variantes[0]?.quantidade).toBe(4);
    expect(nova[0]?.variantes[0]?.tamanhos[0]?.quantidade).toBe(4);
    expect(nova[1]).toBe(lista[1]);
    expect(nova[2]).toBe(lista[2]);
  });

  it("produto que esgotou aparece indisponível", () => {
    const nova = substituirProdutos([produto("a", 1)], [produto("a", 0)]);
    expect(nova[0]?.disponivel).toBe(false);
    expect(nova[0]?.variantes[0]?.tamanhos[0]?.disponivel).toBe(false);
  });

  it("sem atualização, a lista é a mesma", () => {
    const lista = [produto("a")];
    expect(substituirProdutos(lista, [])).toBe(lista);
  });
});

describe("busca sem filtro duplicado (verificação estática)", () => {
  it("a tela entrega ao catálogo exatamente o que a API devolveu, sem refiltrar no frontend", () => {
    const fonte = readFileSync(join(process.cwd(), "src", "routes", "index.tsx"), "utf8");
    expect(fonte).not.toContain("produtosFiltrados");
    expect(fonte).toContain("produtos={produtos}");
  });
});
