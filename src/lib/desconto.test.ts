import { describe, expect, it } from "vitest";
import {
  converterModalidade,
  descontoEmPercentual,
  descontoEmValor,
  limitarDesconto,
} from "./desconto";

describe("equivalência % ↔ R$", () => {
  it("10% de R$ 100 equivale a R$ 10,00", () => {
    expect(descontoEmValor(100, { tipo: "percentual", valor: 10 })).toBe(10);
  });

  it("R$ 10 de R$ 100 equivale a 10%", () => {
    expect(descontoEmPercentual(100, { tipo: "monetario", valor: 10 })).toBe(10);
  });

  it("20% de R$ 250 equivale a R$ 50,00 e R$ 50 equivale a 20%", () => {
    expect(descontoEmValor(250, { tipo: "percentual", valor: 20 })).toBe(50);
    expect(descontoEmPercentual(250, { tipo: "monetario", valor: 50 })).toBe(20);
  });

  it("não produz ruído de ponto flutuante", () => {
    expect(descontoEmValor(389.9, { tipo: "percentual", valor: 10 })).toBe(38.99);
    expect(descontoEmPercentual(0, { tipo: "monetario", valor: 10 })).toBe(0);
  });
});

describe("limites", () => {
  it("ignora valores negativos", () => {
    expect(descontoEmValor(100, { tipo: "monetario", valor: -50 })).toBe(0);
    expect(descontoEmPercentual(100, { tipo: "percentual", valor: -5 })).toBe(0);
  });

  it("percentual nunca passa de 100%", () => {
    expect(descontoEmValor(100, { tipo: "percentual", valor: 150 })).toBe(100);
    expect(limitarDesconto(100, { tipo: "percentual", valor: 150 }).valor).toBe(100);
  });

  it("monetário nunca passa da base", () => {
    expect(descontoEmValor(80, { tipo: "monetario", valor: 500 })).toBe(80);
    expect(limitarDesconto(80, { tipo: "monetario", valor: 500 }).valor).toBe(80);
  });
});

describe("troca de modalidade", () => {
  it("mantém o efeito financeiro ao alternar % → R$ e R$ → %", () => {
    expect(converterModalidade(100, { tipo: "percentual", valor: 10 }, "monetario")).toEqual({
      tipo: "monetario",
      valor: 10,
    });
    expect(converterModalidade(100, { tipo: "monetario", valor: 10 }, "percentual")).toEqual({
      tipo: "percentual",
      valor: 10,
    });
  });
});
