import { parseDecimalBr } from "@/lib/decimal";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatMoeda(valor: number): string {
  return brl.format(Number.isFinite(valor) ? valor : 0);
}

/** Converte texto digitado ("12,50", "1.234,56") em número, preservando decimais. */
export function parseValor(texto: string): number {
  return parseDecimalBr(texto);
}
