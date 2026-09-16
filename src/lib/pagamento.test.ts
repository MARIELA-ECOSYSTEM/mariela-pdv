import { describe, expect, it } from "vitest";
import {
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
    const resultado = montarPagamentosParaEnvio([
      { forma: "Dinheiro", valor: 50 },
      { forma: "Crédito", valor: 50, parcelas: 3 },
    ]);

    expect(resultado.pagamentos).toEqual([
      { forma: "Dinheiro", valor: 50 },
      { forma: "Crédito", valor: 50, parcelas: 3 },
    ]);
    expect(resultado.totalParcelas).toBeUndefined();
  });

  it("a linha Fiado NUNCA é enviada como pagamento — só vira totalParcelas", () => {
    const resultado = montarPagamentosParaEnvio([
      { forma: "Dinheiro", valor: 100 },
      { forma: "Fiado", valor: 200, parcelas: 4 },
    ]);

    expect(resultado.pagamentos).toEqual([{ forma: "Dinheiro", valor: 100 }]);
    expect(resultado.pagamentos.some((p) => p.forma === "Fiado")).toBe(false);
    expect(resultado.totalParcelas).toBe(4);
  });

  it("Fiado sem parcelas definidas não envia totalParcelas (o backend usa o padrão dele)", () => {
    const resultado = montarPagamentosParaEnvio([{ forma: "Fiado", valor: 200 }]);

    expect(resultado.pagamentos).toEqual([]);
    expect(resultado.totalParcelas).toBeUndefined();
  });

  it("venda 100% fiado gera um payload de pagamentos vazio (backend calcula o pendente sozinho)", () => {
    const resultado = montarPagamentosParaEnvio([{ forma: "Fiado", valor: 300, parcelas: 2 }]);

    expect(resultado.pagamentos).toEqual([]);
    expect(resultado.totalParcelas).toBe(2);
  });
});
