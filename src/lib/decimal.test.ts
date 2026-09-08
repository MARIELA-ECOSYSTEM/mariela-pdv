import { describe, expect, it } from "vitest";
import { formatarDecimalBr, parseDecimalBr, sanitizarDecimal } from "./decimal";

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
