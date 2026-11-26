/**
 * SIMULADO (jsdom, sem backend): componentes REAIS renderizados com
 * react-dom/client + act — mesmo harness de useCarrinho.test.ts, sem novas
 * dependências. Cobrem F-01 a F-07 da Fase F.1. Não substituem homologação
 * visual em navegador.
 */
import { act, createElement, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CarrinhoPanel } from "@/components/pdv/carrinho/CarrinhoPanel";
import { CatalogoProdutos } from "@/components/pdv/catalogo/CatalogoProdutos";
import { PagamentoPanel } from "@/components/pdv/pagamento/PagamentoPanel";
import { ProdutoDialog } from "@/components/pdv/produto/ProdutoDialog";
import { ConferenciaDialog } from "@/components/pdv/venda/ConferenciaDialog";
import { validarPagamentos } from "@/lib/pagamento";
import { calcularTotaisPagamento, calcularTotaisVenda } from "@/lib/venda-totais";
import type { PdvAdquirente } from "@/types/adquirente";
import type { PdvItemCarrinho } from "@/types/carrinho";
import type { PdvCliente } from "@/types/cliente";
import type { PdvDesconto } from "@/types/desconto";
import type { PdvProduto } from "@/types/produto";
import type { PdvPagamentoLinha } from "@/types/venda";

// React 19: marca o ambiente como de testes com act.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;
function render(el: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container!);
    root.render(el);
  });
}
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  document.body.innerHTML = "";
  root = undefined;
});
const textoDoc = () => (document.body.textContent ?? "").replace(/\s+/g, " ");
const botao = (nome: RegExp | string) =>
  [...document.querySelectorAll("button")].find((b) =>
    typeof nome === "string" ? b.textContent?.trim() === nome : nome.test(b.textContent ?? ""),
  );

const ITEM: PdvItemCarrinho = {
  linhaId: "p1:v1:t1",
  produtoId: "p1",
  varianteId: "v1",
  tamanhoId: "t1",
  quantidade: 1,
  nome: "Vestido Midi Plissado",
  cor: "Lilás",
  tamanho: "M",
  imagemUrl: null,
  precoUnitario: 389.9,
  estoqueDisponivel: 5,
};
const CLIENTE: PdvCliente = { id: "c2", codigo: "CLI-0002", nome: "Carolina Duarte", telefone: "" };
const ADQ: PdvAdquirente[] = [
  {
    id: "a",
    nome: "Maquininha A",
    modalidades: {
      debito: { tarifaPercentual: 1 },
      credito: { opcoes: [{ parcelas: 1, tarifaPercentual: 2 }] },
    },
  },
  {
    id: "b",
    nome: "Maquininha B",
    modalidades: { debito: null, credito: { opcoes: [{ parcelas: 1, tarifaPercentual: 2 }] } },
  },
];

function renderPagamento(
  pagamentos: PdvPagamentoLinha[],
  extra: {
    cliente?: PdvCliente | null;
    bloqueado?: boolean;
    onSelecionarCliente?: () => void;
  } = {},
) {
  const totaisVenda = calcularTotaisVenda([ITEM], undefined);
  const totais = calcularTotaisPagamento(pagamentos, totaisVenda.total);
  const problema = validarPagamentos(pagamentos, totaisVenda.total, ADQ, !!extra.cliente);
  render(
    createElement(PagamentoPanel, {
      pagamentos,
      totaisVenda,
      totais,
      formas: { estado: "success", dados: ["Dinheiro", "PIX", "Débito", "Crédito"] },
      adquirentes: { estado: "success", dados: ADQ },
      problema,
      onRecarregarOpcoes: () => {},
      ...(extra.onSelecionarCliente ? { onSelecionarCliente: extra.onSelecionarCliente } : {}),
      cliente: extra.cliente ?? null,
      enviando: false,
      bloqueado: extra.bloqueado ?? false,
      onAdicionar: () => {},
      onAlterarValor: () => {},
      onAlterarParcelas: () => {},
      onAlterarAdquirente: () => {},
      onRemover: () => {},
      onVoltar: () => {},
      onConferir: () => {},
    }),
  );
  return { botaoConferir: botao(/CONFERIR VENDA/) as HTMLButtonElement };
}
const situacao = () => document.querySelector("[data-situacao]");

describe("F-01 — situação coerente com o bloqueio", () => {
  it("PIX acima do total: não mostra 'Pagamento completo' e a conferência segue bloqueada", () => {
    const { botaoConferir } = renderPagamento([{ id: "1", forma: "PIX", valor: 500 }]);
    expect(textoDoc()).not.toContain("Pagamento completo");
    expect(situacao()?.getAttribute("data-situacao")).toBe("ajustar");
    expect(textoDoc()).toContain("Os pagamentos passam do total");
    expect(botaoConferir.disabled).toBe(true);
  });

  it("crédito sem maquininha: não mostra 'Pagamento completo'; o motivo aparece uma vez", () => {
    renderPagamento([{ id: "1", forma: "Crédito", valor: 389.9, parcelas: 1 }]);
    expect(textoDoc()).not.toContain("Pagamento completo");
    expect(textoDoc().split("Escolha a maquininha do pagamento").length - 1).toBe(1);
  });

  it("pagamento válido: 'Pagamento completo' e conferência liberada", () => {
    const { botaoConferir } = renderPagamento([{ id: "1", forma: "PIX", valor: 389.9 }]);
    expect(situacao()?.textContent).toContain("Pagamento completo");
    expect(botaoConferir.disabled).toBe(false);
  });

  it("insuficiente: 'Falta receber' uma única vez", () => {
    renderPagamento([{ id: "1", forma: "PIX", valor: 100 }]);
    expect(situacao()?.getAttribute("data-situacao")).toBe("falta");
    expect(textoDoc().split("Falta receber").length - 1).toBe(1);
  });

  it("caixa fechado com valores corretos: 'Venda bloqueada', não 'completo'", () => {
    renderPagamento([{ id: "1", forma: "PIX", valor: 389.9 }], { bloqueado: true });
    expect(situacao()?.textContent).toContain("Venda bloqueada");
    expect(textoDoc()).not.toContain("Pagamento completo");
  });
});

describe("F-03 — Fiado sem cliente oferece 'Selecionar cliente'", () => {
  const pagamentos: PdvPagamentoLinha[] = [
    { id: "1", forma: "PIX", valor: 100 },
    { id: "2", forma: "Fiado", valor: 289.9, parcelas: 1 },
  ];

  it("o botão aparece junto do aviso e abre o diálogo existente (callback)", () => {
    const abrir = vi.fn();
    renderPagamento(pagamentos, { onSelecionarCliente: abrir });
    const b = botao("Selecionar cliente");
    expect(b).toBeDefined();
    expect(b?.closest('[role="alert"]')?.textContent).toContain(
      "Venda no Fiado precisa de cliente",
    );
    act(() => b!.click());
    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it("com cliente: aviso e botão somem; a situação mostra o Fiado da cliente", () => {
    renderPagamento(pagamentos, { cliente: CLIENTE, onSelecionarCliente: () => {} });
    expect(botao("Selecionar cliente")).toBeUndefined();
    expect(situacao()?.textContent).toMatch(/Fiado: R\$\s289,90 a receber de Carolina Duarte/);
  });

  it("sem Fiado, nenhum botão de cliente aparece", () => {
    renderPagamento([{ id: "1", forma: "PIX", valor: 389.9 }], { onSelecionarCliente: () => {} });
    expect(botao("Selecionar cliente")).toBeUndefined();
  });
});

describe("F-05 — valores de pagamento com duas casas", () => {
  it("campos exibem 289,90 e 100,00", () => {
    renderPagamento([
      { id: "1", forma: "PIX", valor: 100 },
      { id: "2", forma: "Fiado", valor: 289.9, parcelas: 1 },
    ]);
    const valores = [...document.querySelectorAll("li input")].map(
      (i) => (i as HTMLInputElement).value,
    );
    expect(valores).toEqual(["100,00", "289,90"]);
  });
});

describe("F-02 — caixa fechado bloqueia os produtos", () => {
  const PRODUTO: PdvProduto = {
    id: "p1",
    nome: "Vestido Midi Plissado",
    codigo: "VST-1042",
    preco: 389.9,
    imagemUrl: null,
    disponivel: true,
    variantes: [
      {
        id: "v1",
        cor: "Lilás",
        foto: null,
        quantidade: 3,
        disponivel: true,
        tamanhos: [{ id: "t1", tamanho: "M", quantidade: 3, disponivel: true }],
      },
    ],
  };
  function renderCatalogo(bloqueado: boolean, onSelecionar = vi.fn()) {
    render(
      createElement(CatalogoProdutos, {
        produtos: [PRODUTO],
        estado: "success",
        busca: "",
        onBuscaChange: () => {},
        onSelecionar,
        onTentarNovamente: () => {},
        bloqueado,
      }),
    );
    return onSelecionar;
  }

  it("com caixa fechado: busca e card desabilitados, explicação visível, clique não abre o produto", () => {
    const onSelecionar = renderCatalogo(true);
    const card = botao(/Vestido Midi Plissado/) as HTMLButtonElement;
    expect((document.querySelector("input") as HTMLInputElement).disabled).toBe(true);
    expect(card.disabled).toBe(true);
    expect(textoDoc()).toContain("Produtos bloqueados enquanto o caixa não estiver aberto.");
    act(() => card.click());
    expect(onSelecionar).not.toHaveBeenCalled();
  });

  it("com caixa aberto: card abre o produto e informa o próprio card como origem", () => {
    const onSelecionar = renderCatalogo(false);
    const card = botao(/Vestido Midi Plissado/) as HTMLButtonElement;
    expect(card.disabled).toBe(false);
    act(() => card.click());
    expect(onSelecionar).toHaveBeenCalledWith(PRODUTO, card);
  });
});

describe("F-06 — Fiado uma única vez na conferência", () => {
  it("PIX + Fiado com cliente: Fiado aparece uma vez, com a cliente; 'Pago agora' preservado", () => {
    const pagamentos: PdvPagamentoLinha[] = [
      { id: "1", forma: "PIX", valor: 100 },
      { id: "2", forma: "Fiado", valor: 289.9, parcelas: 1 },
    ];
    const totais = calcularTotaisVenda([ITEM], undefined);
    render(
      createElement(ConferenciaDialog, {
        aberto: true,
        cliente: CLIENTE,
        itens: [ITEM],
        totais,
        pagamentos,
        pagamentoTotais: calcularTotaisPagamento(pagamentos, totais.total),
        adquirentes: ADQ,
        enviando: false,
        pendencia: undefined,
        onVoltar: () => {},
        onConfirmar: () => {},
        onRegistrarComoNovaVenda: () => {},
      }),
    );
    const t = textoDoc();
    expect(t.split("Fiado").length - 1).toBe(1);
    expect(t).toContain("Fiado — a receber");
    expect(t).toContain("de Carolina Duarte");
    expect(t).not.toContain("Pagamento posterior");
    expect(t).toMatch(/Pago agora\s*R\$\s100,00/);
    expect(t).toMatch(/R\$\s289,90/);
  });
});

describe("F-07 — equivalência do desconto da venda uma única vez", () => {
  it("R$ 50 de desconto: '16,84%' aparece uma vez", () => {
    const desconto: PdvDesconto = { tipo: "monetario", valor: 50 };
    const item = { ...ITEM, precoUnitario: 296.91 };
    render(
      createElement(CarrinhoPanel, {
        itens: [item],
        descontoVenda: desconto,
        totais: calcularTotaisVenda([item], desconto),
        onRemoverItem: () => {},
        onAlterarQuantidade: () => {},
        onAlterarDescontoItem: () => {},
        onDescontoVendaChange: () => {},
        onSeguirParaPagamento: () => {},
      }),
    );
    expect(textoDoc().split("16,84%").length - 1).toBe(1);
    expect(textoDoc()).toMatch(/Total\s*R\$\s246,91/i);
  });
});

describe("F-04 — diálogo do produto informa o fechamento para a tela decidir o foco", () => {
  const PRODUTO: PdvProduto = {
    id: "p5",
    nome: "Blazer Estruturado",
    codigo: "BLZ-5120",
    preco: 599,
    imagemUrl: null,
    disponivel: true,
    variantes: [
      {
        id: "uva",
        cor: "Uva",
        foto: null,
        quantidade: 1,
        disponivel: true,
        tamanhos: [{ id: "m", tamanho: "M", quantidade: 1, disponivel: true }],
      },
    ],
  };
  function Harness({
    onAposFechar,
    onAdicionar,
  }: {
    onAposFechar: (a: boolean) => void;
    onAdicionar: () => void;
  }) {
    const [aberto, setAberto] = useState(true);
    return createElement(ProdutoDialog, {
      produto: PRODUTO,
      aberto,
      onFechar: () => setAberto(false),
      onAdicionar,
      onAposFechar,
    });
  }

  // O Radix dispara o fim do fechamento (onCloseAutoFocus) num setTimeout(0) interno.
  const proximoTick = () =>
    act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

  it("Cancelar → onAposFechar(false) (a tela devolve o foco ao card)", async () => {
    const aposFechar = vi.fn();
    render(createElement(Harness, { onAposFechar: aposFechar, onAdicionar: vi.fn() }));
    act(() => botao("Cancelar")!.click());
    await proximoTick();
    expect(aposFechar).toHaveBeenCalledWith(false);
  });

  it("Adicionar → onAposFechar(true) (a tela foca a busca)", async () => {
    const aposFechar = vi.fn();
    const adicionar = vi.fn();
    render(createElement(Harness, { onAposFechar: aposFechar, onAdicionar: adicionar }));
    act(() => botao("Adicionar ao carrinho")!.click());
    await proximoTick();
    expect(adicionar).toHaveBeenCalledTimes(1);
    expect(aposFechar).toHaveBeenCalledWith(true);
  });
});
