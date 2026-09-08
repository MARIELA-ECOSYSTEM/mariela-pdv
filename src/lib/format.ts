const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatMoeda(valor: number): string {
  return brl.format(Number.isFinite(valor) ? valor : 0);
}

/** Converte texto digitado ("12,50") em número. */
export function parseValor(texto: string): number {
  const limpo = texto
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number.parseFloat(limpo);
  return Number.isFinite(n) ? n : 0;
}
