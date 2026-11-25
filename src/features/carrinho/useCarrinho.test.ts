import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { PdvItemCarrinho } from "@/types/carrinho";
import { useCarrinho } from "./useCarrinho";

/**
 * Sem @testing-library/react no projeto: harness mínimo com react-dom/client
 * + act (React 19) para exercitar o hook real, sem adicionar dependências.
 */
function montarHook() {
  let resultado!: ReturnType<typeof useCarrinho>;
  function Harness() {
    resultado = useCarrinho();
    return null;
  }
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;
  act(() => {
    root = createRoot(container);
    root.render(createElement(Harness));
  });
  return {
    get atual() {
      return resultado;
    },
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function item(overrides: Partial<PdvItemCarrinho> = {}): PdvItemCarrinho {
  return {
    linhaId: "p1:p1-preto:p1-preto-m",
    produtoId: "p1",
    varianteId: "p1-preto",
    tamanhoId: "p1-preto-m",
    quantidade: 1,
    nome: "Vestido Midi Plissado",
    codigo: "VST-1042",
    cor: "Preto",
    tamanho: "M",
    imagemUrl: null,
    precoUnitario: 389.9,
    estoqueDisponivel: 2,
    ...overrides,
  };
}

describe("useCarrinho", () => {
  let hook: ReturnType<typeof montarHook> | undefined;

  afterEach(() => {
    hook?.unmount();
    hook = undefined;
  });

  it("adicionar preserva produtoId, varianteId e tamanhoId — autoridade da venda", () => {
    hook = montarHook();
    act(() => hook!.atual.adicionar(item()));

    expect(hook.atual.itens).toEqual([item()]);
  });

  it("adicionar o mesmo linhaId duas vezes soma quantidade em vez de duplicar a linha", () => {
    hook = montarHook();
    act(() => hook!.atual.adicionar(item({ quantidade: 1, estoqueDisponivel: 5 })));
    act(() => hook!.atual.adicionar(item({ quantidade: 2, estoqueDisponivel: 5 })));

    expect(hook.atual.itens).toHaveLength(1);
    expect(hook.atual.itens[0]?.quantidade).toBe(3);
    expect(hook.atual.quantidadeDaLinha(item().linhaId)).toBe(3);
  });

  it("adicionar repetidamente nunca passa do estoque conhecido do tamanho", () => {
    hook = montarHook();
    act(() => hook!.atual.adicionar(item({ quantidade: 1, estoqueDisponivel: 2 })));
    act(() => hook!.atual.adicionar(item({ quantidade: 1, estoqueDisponivel: 2 })));
    act(() => hook!.atual.adicionar(item({ quantidade: 1, estoqueDisponivel: 2 })));

    expect(hook.atual.itens[0]?.quantidade).toBe(2);
  });

  it("adicionar mais do que o estoque de uma vez fica limitado ao estoque", () => {
    hook = montarHook();
    act(() => hook!.atual.adicionar(item({ quantidade: 9, estoqueDisponivel: 4 })));
    expect(hook.atual.itens[0]?.quantidade).toBe(4);
  });

  it("tamanho sem estoque não entra no carrinho", () => {
    hook = montarHook();
    act(() => hook!.atual.adicionar(item({ quantidade: 1, estoqueDisponivel: 0 })));
    expect(hook.atual.itens).toHaveLength(0);
  });

  it("o estoque é por tamanho/variante: outro tamanho do mesmo produto tem limite próprio", () => {
    hook = montarHook();
    act(() => hook!.atual.adicionar(item({ quantidade: 2, estoqueDisponivel: 2 })));
    act(() =>
      hook!.atual.adicionar(
        item({
          linhaId: "p1:p1-preto:p1-preto-g",
          tamanhoId: "p1-preto-g",
          tamanho: "G",
          quantidade: 3,
          estoqueDisponivel: 3,
        }),
      ),
    );
    expect(hook.atual.itens.map((i) => i.quantidade)).toEqual([2, 3]);
    expect(hook.atual.quantidadeDaLinha("p1:p1-preto:p1-preto-g")).toBe(3);
    expect(hook.atual.quantidadeDaLinha("inexistente")).toBe(0);
  });

  it("estoque mais recente informado prevalece ao somar", () => {
    hook = montarHook();
    act(() => hook!.atual.adicionar(item({ quantidade: 1, estoqueDisponivel: 5 })));
    act(() => hook!.atual.adicionar(item({ quantidade: 5, estoqueDisponivel: 3 })));
    expect(hook.atual.itens[0]?.quantidade).toBe(3);
    expect(hook.atual.itens[0]?.estoqueDisponivel).toBe(3);
  });

  it("aumentar a quantidade de um item já no carrinho para no estoque", () => {
    hook = montarHook();
    act(() => hook!.atual.adicionar(item({ quantidade: 1, estoqueDisponivel: 3 })));
    act(() => hook!.atual.alterarQuantidade(item().linhaId, 2));
    act(() => hook!.atual.alterarQuantidade(item().linhaId, 3));
    act(() => hook!.atual.alterarQuantidade(item().linhaId, 4));
    expect(hook.atual.itens[0]?.quantidade).toBe(3);
  });

  it("alterarQuantidade nunca ultrapassa estoqueDisponivel (não é autoridade, só limite de UX)", () => {
    hook = montarHook();
    act(() => hook!.atual.adicionar(item({ estoqueDisponivel: 2 })));
    act(() => hook!.atual.alterarQuantidade(item().linhaId, 10));

    expect(hook.atual.itens[0]?.quantidade).toBe(2);
  });

  it("alterarQuantidade para 0 remove o item", () => {
    hook = montarHook();
    act(() => hook!.atual.adicionar(item()));
    act(() => hook!.atual.alterarQuantidade(item().linhaId, 0));

    expect(hook.atual.itens).toHaveLength(0);
  });

  it("remover tira o item do carrinho", () => {
    hook = montarHook();
    act(() => hook!.atual.adicionar(item()));
    act(() => hook!.atual.remover(item().linhaId));

    expect(hook.atual.itens).toHaveLength(0);
  });

  it("alterarDesconto aplica desconto do item e reflete nos totais do carrinho", () => {
    hook = montarHook();
    act(() => hook!.atual.adicionar(item({ precoUnitario: 100 })));
    act(() => hook!.atual.alterarDesconto(item().linhaId, { tipo: "percentual", valor: 10 }));

    expect(hook.atual.itens[0]?.desconto).toEqual({ tipo: "percentual", valor: 10 });
    expect(hook.atual.subtotal).toBe(100);
    expect(hook.atual.descontoItens).toBe(10);
    expect(hook.atual.subtotalAposItens).toBe(90);
  });

  it("diminuir a quantidade reduz sozinho um desconto em R$ que ficou maior que a linha", () => {
    hook = montarHook();
    act(() => hook!.atual.adicionar(item({ precoUnitario: 100, quantidade: 2 })));
    act(() => hook!.atual.alterarDesconto(item().linhaId, { tipo: "monetario", valor: 150 }));
    act(() => hook!.atual.alterarQuantidade(item().linhaId, 1));

    expect(hook.atual.itens[0]?.desconto).toEqual({ tipo: "monetario", valor: 100 });
    expect(hook.atual.subtotalAposItens).toBe(0);
  });

  it("desconto em R$ ainda válido e desconto em % não mudam ao alterar a quantidade", () => {
    hook = montarHook();
    act(() => hook!.atual.adicionar(item({ linhaId: "a", precoUnitario: 100, quantidade: 2 })));
    act(() => hook!.atual.adicionar(item({ linhaId: "b", precoUnitario: 100, quantidade: 2 })));
    act(() => hook!.atual.alterarDesconto("a", { tipo: "monetario", valor: 30 }));
    act(() => hook!.atual.alterarDesconto("b", { tipo: "percentual", valor: 10 }));
    act(() => hook!.atual.alterarQuantidade("a", 1));
    act(() => hook!.atual.alterarQuantidade("b", 1));

    expect(hook.atual.itens.map((i) => i.desconto)).toEqual([
      { tipo: "monetario", valor: 30 },
      { tipo: "percentual", valor: 10 },
    ]);
    expect(hook.atual.subtotalAposItens).toBe(160);
  });

  it("incluir mais unidades do mesmo produto mantém o desconto do item", () => {
    hook = montarHook();
    act(() => hook!.atual.adicionar(item({ precoUnitario: 100 })));
    act(() => hook!.atual.alterarDesconto(item().linhaId, { tipo: "monetario", valor: 20 }));
    act(() => hook!.atual.adicionar(item({ precoUnitario: 100 })));

    expect(hook.atual.itens[0]?.quantidade).toBe(2);
    expect(hook.atual.itens[0]?.desconto).toEqual({ tipo: "monetario", valor: 20 });
    expect(hook.atual.subtotalAposItens).toBe(180);
  });

  it("desconto monetário do item nunca passa do valor da linha", () => {
    hook = montarHook();
    act(() => hook!.atual.adicionar(item({ precoUnitario: 100 })));
    act(() => hook!.atual.alterarDesconto(item().linhaId, { tipo: "monetario", valor: 500 }));

    expect(hook.atual.itens[0]?.desconto?.valor).toBe(100);
    expect(hook.atual.subtotalAposItens).toBe(0);
  });
});
