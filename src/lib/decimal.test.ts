import { describe, expect, it } from "vitest";
import {
  formatarDecimalBr,
  formatarDecimalFixoBr,
  parseDecimalBr,
  sanitizarDecimal,
} from "./decimal";

describe("formatarDecimalFixoBr — valor em dinheiro com duas casas (F-05)", () => {
  it("sempre duas casas, vírgula decimal", () => {
    expect(formatarDecimalFixoBr(289.9)).toBe("289,90");
    expect(formatarDecimalFixoBr(100)).toBe("100,00");
    expect(formatarDecimalFixoBr(0.1)).toBe("0,10");
    expect(formatarDecimalFixoBr(1234.56)).toBe("1234,56");
  });

  it("é só exibição: o texto exibido volta ao mesmo número", () => {
    for (const v of [289.9, 100, 0.1, 89.9]) {
      expect(parseDecimalBr(formatarDecimalFixoBr(v))).toBe(v);
    }
  });

  it("valor inválido não vira texto", () => {
    expect(formatarDecimalFixoBr(Number.NaN)).toBe("");
  });
});

describe("entrada decimal brasileira", () => {
  it("aceita casas decimais com vírgula", () => {
    expect(parseDecimalBr("20,5")).toBe(20.5);
    expect(parseDecimalBr("20,50")).toBe(20.5);
    expect(parseDecimalBr("10,25")).toBe(10.25);
    expect(parseDecimalBr("99,90")).toBe(99.9);
  });

  it("aceita ponto como decimal quando não há vírgula", () => {
    expect(parseDecimalBr("20.5")).toBe(20.5);
  });

  it("trata ponto como milhar quando há vírgula", () => {
    expect(parseDecimalBr("1.234,56")).toBe(1234.56);
    expect(parseDecimalBr("10.000,00")).toBe(10000);
  });

  it("não trunca o que está sendo digitado", () => {
    expect(sanitizarDecimal("20,")).toBe("20,");
    expect(sanitizarDecimal("20,5")).toBe("20,5");
    expect(sanitizarDecimal("20,555")).toBe("20,55");
    expect(sanitizarDecimal("abc12,3x")).toBe("12,3");
  });

  it("ignora texto inválido", () => {
    expect(parseDecimalBr("")).toBe(0);
    expect(parseDecimalBr("abc")).toBe(0);
  });

  it("apresenta sem zeros decorativos", () => {
    expect(formatarDecimalBr(20.5)).toBe("20,5");
    expect(formatarDecimalBr(10.25)).toBe("10,25");
    expect(formatarDecimalBr(100)).toBe("100");
  });
});
