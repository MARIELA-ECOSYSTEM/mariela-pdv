import { describe, expect, it } from "vitest";
import { formaEhCartao, formaEhCredito, formaEhDebito, opcoesParcelas } from "./pagamento";

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

  it("oferece parcelas de 1x até o máximo permitido", () => {
    expect(opcoesParcelas(6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(opcoesParcelas()[0]).toBe(1);
  });
});
