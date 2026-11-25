import { describe, expect, it } from "vitest";
import {
  calcularTotaisPagamento,
  calcularTotaisVenda,
  limitarDescontosDaVenda,
  totaisDoItem,
} from "./venda-totais";
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

describe("limitarDescontosDaVenda (desconto coerente com o carrinho atual)", () => {
  it("desconto da venda em R$ maior que o subtotal após remover um item é reduzido ao subtotal", () => {
    // Carrinho tinha 2 peças de R$ 100 e desconto de R$ 150; uma peça saiu.
    const r = limitarDescontosDaVenda([item({ quantidade: 1 })], { tipo: "monetario", valor: 150 });
    expect(r.descontoVenda).toEqual({ tipo: "monetario", valor: 100 });
    expect(calcularTotaisVenda(r.itens, r.descontoVenda).total).toBe(0);
  });

  it("a base do desconto da venda é o subtotal APÓS os descontos dos itens", () => {
    const r = limitarDescontosDaVenda(
      [item({ quantidade: 2, desconto: { tipo: "monetario", valor: 50 } })],
      { tipo: "monetario", valor: 200 },
    );
    expect(r.descontoVenda.valor).toBe(150);
  });

  it("desconto do item em R$ maior que a linha é reduzido ao valor da linha", () => {
    const r = limitarDescontosDaVenda(
      [item({ quantidade: 1, desconto: { tipo: "monetario", valor: 300 } })],
      { tipo: "monetario", valor: 0 },
    );
    expect(r.itens[0]?.desconto).toEqual({ tipo: "monetario", valor: 100 });
  });

  it("desconto inválido (negativo, NaN, % acima de 100) vira um valor aceito pelo backend", () => {
    expect(
      limitarDescontosDaVenda([item()], { tipo: "monetario", valor: -10 }).descontoVenda.valor,
    ).toBe(0);
    expect(
      limitarDescontosDaVenda([item()], { tipo: "monetario", valor: Number.NaN }).descontoVenda
        .valor,
    ).toBe(0);
    expect(
      limitarDescontosDaVenda([item()], { tipo: "percentual", valor: 150 }).descontoVenda.valor,
    ).toBe(100);
  });

  it("descontos válidos passam inalterados", () => {
    const r = limitarDescontosDaVenda(
      [item({ quantidade: 3, desconto: { tipo: "percentual", valor: 10 } })],
      { tipo: "monetario", valor: 20 },
    );
    expect(r.itens[0]?.desconto).toEqual({ tipo: "percentual", valor: 10 });
    expect(r.descontoVenda).toEqual({ tipo: "monetario", valor: 20 });
  });

  it("carrinho vazio zera desconto em R$", () => {
    expect(limitarDescontosDaVenda([], { tipo: "monetario", valor: 30 }).descontoVenda.valor).toBe(
      0,
    );
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

  it("valor acima do total fora do dinheiro não é troco: vira excedente", () => {
    const totais = calcularTotaisPagamento([pagamento({ forma: "PIX", valor: 550 })], 500);
    expect(totais.troco).toBe(0);
    expect(totais.excedente).toBe(50);
  });

  it("valor recebido em dinheiro menor que o total deixa pendente, sem troco", () => {
    const totais = calcularTotaisPagamento([pagamento({ valor: 300 })], 500);
    expect(totais.pendente).toBe(200);
    expect(totais.troco).toBe(0);
    expect(totais.excedente).toBe(0);
    expect(totais.situacao).toBe("parcial");
  });

  it("tarifa e valor líquido só entram quando o backend informar", () => {
    const totais = calcularTotaisPagamento(
      [pagamento({ valor: 600, parcelas: 6, tarifa: 18, valorLiquido: 582 })],
      600,
    );
    expect(totais.tarifaTotal).toBe(18);
    expect(totais.liquidoTotal).toBe(582);
  });

  it("fiado separa o valor pago no ato do saldo a receber", () => {
    const totais = calcularTotaisPagamento(
      [pagamento({ forma: "Dinheiro", valor: 100 }), pagamento({ forma: "Fiado", valor: 200 })],
      300,
    );
    expect(totais.situacao).toBe("fiado");
    expect(totais.fiado).toBe(200);
    expect(totais.pagoAgora).toBe(100);
    expect(totais.pendente).toBe(0);
  });
});
