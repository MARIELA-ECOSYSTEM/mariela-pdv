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
    act(() => hook!.atual.adicionar(item({ quantidade: 1 })));
    act(() => hook!.atual.adicionar(item({ quantidade: 2 })));

    expect(hook.atual.itens).toHaveLength(1);
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
});
