/** SIMULADO: regras puras de pré-seleção (sem interface e sem backend). */
import { describe, expect, it } from "vitest";
import type { PdvProduto, PdvProdutoTamanho, PdvProdutoVariante } from "@/types/produto";
import {
  corComEstoque,
  corInicial,
  disponivelParaAdicionar,
  tamanhoAutomatico,
} from "./selecao-produto";

function tam(id: string, quantidade: number, disponivel = quantidade > 0): PdvProdutoTamanho {
  return { id, tamanho: id.toUpperCase(), quantidade, disponivel };
}

function cor(id: string, tamanhos: PdvProdutoTamanho[]): PdvProdutoVariante {
  const quantidade = tamanhos.reduce((s, t) => s + t.quantidade, 0);
  return { id, cor: id, foto: null, quantidade, disponivel: quantidade > 0, tamanhos };
}

function produto(variantes: PdvProdutoVariante[]): PdvProduto {
  return {
    id: "p1",
    nome: "Vestido",
    codigo: "PROD-0001",
    preco: 100,
    imagemUrl: null,
    disponivel: true,
    variantes,
  };
}

const carrinhoVazio = () => 0;
/** Carrinho falso: quantidades por linhaId (produto:variante:tamanho). */
function carrinho(linhas: Record<string, number>) {
  return (linhaId: string) => linhas[linhaId] ?? 0;
}

describe("cor inicial", () => {
  it("a primeira cor sem estoque não é marcada: vai para a primeira com estoque", () => {
    const p = produto([cor("preto", [tam("p", 0), tam("m", 0)]), cor("azul", [tam("m", 2)])]);
    expect(corInicial(p, carrinhoVazio)).toBe("azul");
  });

  it("primeira cor com estoque continua sendo a escolhida (comportamento atual)", () => {
    const p = produto([cor("preto", [tam("m", 1)]), cor("azul", [tam("m", 2)])]);
    expect(corInicial(p, carrinhoVazio)).toBe("preto");
  });

  it("nenhuma cor com estoque: nada é marcado", () => {
    const p = produto([cor("preto", [tam("m", 0)]), cor("azul", [tam("g", 0)])]);
    expect(corInicial(p, carrinhoVazio)).toBeUndefined();
  });

  it("tamanho marcado indisponível pela API não conta, mesmo com quantidade", () => {
    const p = produto([cor("preto", [tam("m", 3, false)]), cor("azul", [tam("m", 1)])]);
    expect(corInicial(p, carrinhoVazio)).toBe("azul");
  });

  it("considera o carrinho: cor com todo o estoque já no carrinho é pulada", () => {
    const p = produto([cor("preto", [tam("m", 2)]), cor("azul", [tam("m", 2)])]);
    expect(corInicial(p, carrinho({ "p1:preto:m": 2 }))).toBe("azul");
  });

  it("tudo já no carrinho: nada é marcado", () => {
    const p = produto([cor("preto", [tam("m", 1)])]);
    expect(corInicial(p, carrinho({ "p1:preto:m": 1 }))).toBeUndefined();
  });
});

describe("tamanho automático", () => {
  it("um único tamanho disponível na cor: marcado sozinho", () => {
    const p = produto([cor("preto", [tam("p", 0), tam("m", 3), tam("g", 0)])]);
    expect(tamanhoAutomatico(p, "preto", carrinhoVazio)).toBe("m");
  });

  it("mais de um tamanho disponível: escolha manual (nada marcado)", () => {
    const p = produto([cor("preto", [tam("p", 1), tam("m", 3)])]);
    expect(tamanhoAutomatico(p, "preto", carrinhoVazio)).toBeUndefined();
  });

  it("nenhum tamanho disponível: nada marcado", () => {
    const p = produto([cor("preto", [tam("p", 0), tam("m", 0)])]);
    expect(tamanhoAutomatico(p, "preto", carrinhoVazio)).toBeUndefined();
  });

  it("considera o carrinho: tamanho esgotado no carrinho sai da conta e o outro é marcado", () => {
    const p = produto([cor("preto", [tam("p", 1), tam("m", 3)])]);
    expect(tamanhoAutomatico(p, "preto", carrinho({ "p1:preto:p": 1 }))).toBe("m");
  });

  it("sem cor escolhida ou cor inexistente: nada marcado", () => {
    const p = produto([cor("preto", [tam("m", 3)])]);
    expect(tamanhoAutomatico(p, undefined, carrinhoVazio)).toBeUndefined();
    expect(tamanhoAutomatico(p, "inexistente", carrinhoVazio)).toBeUndefined();
  });
});

describe("estoque adicionável (limite da Fase D)", () => {
  it("estoque da API menos o que já está no carrinho, nunca negativo", () => {
    const t = tam("m", 3);
    expect(disponivelParaAdicionar("p1", "preto", t, carrinhoVazio)).toBe(3);
    expect(disponivelParaAdicionar("p1", "preto", t, carrinho({ "p1:preto:m": 2 }))).toBe(1);
    expect(disponivelParaAdicionar("p1", "preto", t, carrinho({ "p1:preto:m": 5 }))).toBe(0);
  });

  it("tamanho sem estoque ou marcado indisponível: zero", () => {
    expect(disponivelParaAdicionar("p1", "preto", tam("m", 0), carrinhoVazio)).toBe(0);
    expect(disponivelParaAdicionar("p1", "preto", tam("m", 4, false), carrinhoVazio)).toBe(0);
  });

  it("cor com estoque na API é selecionável; sem estoque fica indisponível", () => {
    expect(corComEstoque(cor("preto", [tam("p", 0), tam("m", 1)]))).toBe(true);
    expect(corComEstoque(cor("preto", [tam("p", 0)]))).toBe(false);
  });
});
