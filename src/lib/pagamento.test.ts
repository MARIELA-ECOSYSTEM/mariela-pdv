import { describe, expect, it } from "vitest";
import {
  aplicarTroco,
  calcularTroco,
  formaEhCartao,
  formaEhCredito,
  formaEhDebito,
  formaEhFiado,
  montarPagamentosParaEnvio,
  opcoesParcelas,
} from "./pagamento";

describe("formas de pagamento", () => {
  it("reconhece crédito e débito com ou sem acento", () => {
    expect(formaEhCredito("Crédito")).toBe(true);
    expect(formaEhCredito("credito")).toBe(true);
    expect(formaEhDebito("Débito")).toBe(true);
    expect(formaEhCartao("Débito")).toBe(true);
  });

  it("dinheiro e PIX não são cartão", () => {
    expect(formaEhCartao("Dinheiro")).toBe(false);
    expect(formaEhCartao("PIX")).toBe(false);
  });

  it("reconhece fiado e não confunde com cartão", () => {
    expect(formaEhFiado("Fiado")).toBe(true);
    expect(formaEhFiado("fiado 3x")).toBe(true);
    expect(formaEhFiado("Crédito")).toBe(false);
    expect(formaEhCartao("Fiado")).toBe(false);
  });

  it("oferece parcelas de 1x até o máximo permitido", () => {
    expect(opcoesParcelas(6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(opcoesParcelas()[0]).toBe(1);
  });
});

describe("montarPagamentosParaEnvio (contrato de POST /pdv/vendas)", () => {
  it("uma venda sem Fiado envia todos os pagamentos tal como estão", () => {
    const resultado = montarPagamentosParaEnvio(
      [
        { forma: "Dinheiro", valor: 50 },
        { forma: "Crédito", valor: 50, parcelas: 3 },
      ],
      100,
    );

    expect(resultado.pagamentos).toEqual([
      { forma: "Dinheiro", valor: 50 },
      { forma: "Crédito", valor: 50, parcelas: 3 },
    ]);
    expect(resultado.totalParcelas).toBeUndefined();
  });

  it("a linha Fiado NUNCA é enviada como pagamento — só vira totalParcelas", () => {
    const resultado = montarPagamentosParaEnvio(
      [
        { forma: "Dinheiro", valor: 100 },
        { forma: "Fiado", valor: 200, parcelas: 4 },
      ],
      300,
    );

    expect(resultado.pagamentos).toEqual([{ forma: "Dinheiro", valor: 100 }]);
    expect(resultado.pagamentos.some((p) => p.forma === "Fiado")).toBe(false);
    expect(resultado.totalParcelas).toBe(4);
  });

  it("Fiado sem parcelas definidas não envia totalParcelas (o backend usa o padrão dele)", () => {
    const resultado = montarPagamentosParaEnvio([{ forma: "Fiado", valor: 200 }], 200);

    expect(resultado.pagamentos).toEqual([]);
    expect(resultado.totalParcelas).toBeUndefined();
  });

  it("venda 100% fiado gera um payload de pagamentos vazio (backend calcula o pendente sozinho)", () => {
    const resultado = montarPagamentosParaEnvio([{ forma: "Fiado", valor: 300, parcelas: 2 }], 300);

    expect(resultado.pagamentos).toEqual([]);
    expect(resultado.totalParcelas).toBe(2);
  });
});

describe("dinheiro e troco", () => {
  it("dinheiro com troco: recebe R$ 100 numa venda de R$ 89,90 → envia R$ 89,90 e troco R$ 10,10", () => {
    const pagamentos = [{ forma: "Dinheiro", valor: 100 }];

    expect(calcularTroco(pagamentos, 89.9)).toEqual({ troco: 10.1, excedente: 0 });
    const envio = montarPagamentosParaEnvio(pagamentos, 89.9);
    expect(envio.pagamentos).toEqual([{ forma: "Dinheiro", valor: 89.9 }]);
    // Respeita a regra do backend: soma dos pagamentos ≤ valor final.
    expect(envio.pagamentos.reduce((s, p) => s + p.valor, 0)).toBeLessThanOrEqual(89.9);
  });

  it("dinheiro exato: sem troco e o valor vai inalterado", () => {
    const pagamentos = [{ forma: "Dinheiro", valor: 89.9 }];

    expect(calcularTroco(pagamentos, 89.9)).toEqual({ troco: 0, excedente: 0 });
    expect(montarPagamentosParaEnvio(pagamentos, 89.9).pagamentos).toEqual([
      { forma: "Dinheiro", valor: 89.9 },
    ]);
  });

  it("dinheiro menor que o total: sem troco, envia o recebido (o restante fica pendente)", () => {
    const pagamentos = [{ forma: "Dinheiro", valor: 50 }];

    expect(calcularTroco(pagamentos, 89.9)).toEqual({ troco: 0, excedente: 0 });
    expect(montarPagamentosParaEnvio(pagamentos, 89.9).pagamentos).toEqual([
      { forma: "Dinheiro", valor: 50 },
    ]);
  });

  it("PIX + dinheiro: o troco sai só do dinheiro", () => {
    const pagamentos = [
      { forma: "PIX", valor: 60 },
      { forma: "Dinheiro", valor: 50 },
    ];

    expect(calcularTroco(pagamentos, 100)).toEqual({ troco: 10, excedente: 0 });
    expect(montarPagamentosParaEnvio(pagamentos, 100).pagamentos).toEqual([
      { forma: "PIX", valor: 60 },
      { forma: "Dinheiro", valor: 40 },
    ]);
  });

  it("cartão cobre o total e ainda há dinheiro: a linha de dinheiro vira troco integral e não é enviada", () => {
    const pagamentos = [
      { forma: "Crédito", valor: 100, parcelas: 1 },
      { forma: "Dinheiro", valor: 20 },
    ];

    expect(calcularTroco(pagamentos, 100)).toEqual({ troco: 20, excedente: 0 });
    expect(montarPagamentosParaEnvio(pagamentos, 100).pagamentos).toEqual([
      { forma: "Crédito", valor: 100, parcelas: 1 },
    ]);
  });

  it("valor acima do total sem dinheiro não vira troco: é excedente (pagamento inválido)", () => {
    expect(calcularTroco([{ forma: "PIX", valor: 120 }], 100)).toEqual({
      troco: 0,
      excedente: 20,
    });
  });

  it("troco desconta da última linha de dinheiro primeiro", () => {
    const aplicados = aplicarTroco(
      [
        { forma: "Dinheiro", valor: 50 },
        { forma: "Dinheiro", valor: 70 },
      ],
      100,
    );
    expect(aplicados.map((p) => p.valorAplicado)).toEqual([50, 50]);
  });

  it("dinheiro + fiado com troco: o fiado nunca é enviado e o dinheiro vai só pelo aplicado", () => {
    const envio = montarPagamentosParaEnvio(
      [
        { forma: "Dinheiro", valor: 100 },
        { forma: "Fiado", valor: 50, parcelas: 2 },
      ],
      120,
    );
    expect(envio.pagamentos).toEqual([{ forma: "Dinheiro", valor: 70 }]);
    expect(envio.totalParcelas).toBe(2);
  });

  it("centavos sem ruído de ponto flutuante", () => {
    const envio = montarPagamentosParaEnvio(
      [
        { forma: "PIX", valor: 0.1 },
        { forma: "Dinheiro", valor: 0.3 },
      ],
      0.3,
    );
    expect(envio.pagamentos).toEqual([
      { forma: "PIX", valor: 0.1 },
      { forma: "Dinheiro", valor: 0.2 },
    ]);
  });
});
