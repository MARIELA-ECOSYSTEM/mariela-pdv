import { describe, expect, it } from "vitest";
import { calcularTotaisPagamento, calcularTotaisVenda, totaisDoItem } from "./venda-totais";
import type { PdvItemCarrinho } from "@/types/carrinho";
import type { PdvPagamentoLinha } from "@/types/venda";

function item(overrides: Partial<PdvItemCarrinho> = {}): PdvItemCarrinho {
  return {
    linhaId: "l1",
    produtoId: "p1",
    varianteId: "v1",
    tamanhoId: "t1",
    quantidade: 1,
    nome: "Peça",
    cor: "Preto",
    tamanho: "M",
    imagemUrl: null,
    precoUnitario: 100,
    estoqueDisponivel: 10,
    ...overrides,
  };
}

function pagamento(overrides: Partial<PdvPagamentoLinha> = {}): PdvPagamentoLinha {
  return { id: "pg1", forma: "Dinheiro", valor: 0, ...overrides };
}

describe("desconto por item", () => {
  it("R$ 100 com 10% resulta em R$ 90,00", () => {
    const t = totaisDoItem(item({ desconto: { tipo: "percentual", valor: 10 } }));
    expect(t.desconto).toBe(10);
    expect(t.liquido).toBe(90);
  });

  it("R$ 100 com R$ 10 mostra 10%", () => {
    const t = totaisDoItem(item({ desconto: { tipo: "monetario", valor: 10 } }));
    expect(t.percentualDesconto).toBe(10);
    expect(t.liquido).toBe(90);
  });
});

describe("desconto do subtotal", () => {
  it("subtotal R$ 500 com 10% resulta em R$ 450,00", () => {
    const totais = calcularTotaisVenda([item({ quantidade: 5 })], {
      tipo: "percentual",
      valor: 10,
    });
    expect(totais.subtotalBruto).toBe(500);
    expect(totais.descontoVenda).toBe(50);
    expect(totais.total).toBe(450);
  });

  it("combina desconto de item e desconto da venda sem substituir um pelo outro", () => {
    const totais = calcularTotaisVenda(
      [item({ linhaId: "a", desconto: { tipo: "monetario", valor: 20 } }), item({ linhaId: "b" })],
      { tipo: "percentual", valor: 10 },
    );
    expect(totais.subtotalBruto).toBe(200);
    expect(totais.descontoItens).toBe(20);
    expect(totais.subtotalAposItens).toBe(180);
    expect(totais.descontoVenda).toBe(18);
    expect(totais.total).toBe(162);
  });
});

describe("pagamentos", () => {
  it("múltiplos pagamentos somam o recebido e deixam o pendente separado", () => {
    const totais = calcularTotaisPagamento(
      [
        pagamento({ id: "1", forma: "PIX", valor: 100 }),
        pagamento({ id: "2", forma: "Dinheiro", valor: 50 }),
        pagamento({ id: "3", forma: "Crédito", valor: 50, parcelas: 3 }),
      ],
      500,
    );
    expect(totais.recebido).toBe(200);
    expect(totais.pendente).toBe(300);
    expect(totais.troco).toBe(0);
    expect(totais.situacao).toBe("parcial");
  });

  it("venda sem pagamento fica pendente", () => {
    expect(calcularTotaisPagamento([], 500).situacao).toBe("pendente");
  });

  it("pagamento completo fica pago e troco é independente do pendente", () => {
    const totais = calcularTotaisPagamento([pagamento({ valor: 550 })], 500);
    expect(totais.situacao).toBe("pago");
    expect(totais.pendente).toBe(0);
    expect(totais.troco).toBe(50);
  });

  it("tarifa e valor líquido só entram quando o backend informar", () => {
    const totais = calcularTotaisPagamento(
      [pagamento({ valor: 600, parcelas: 6, tarifa: 18, valorLiquido: 582 })],
      600,
    );
    expect(totais.tarifaTotal).toBe(18);
    expect(totais.liquidoTotal).toBe(582);
  });
});
