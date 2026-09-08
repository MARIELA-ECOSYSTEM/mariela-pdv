/**
 * Entrada e apresentação de números no padrão brasileiro.
 *
 * `,` é o separador decimal e `.` o separador de milhares. Nenhuma função aqui
 * usa parseInt: valores financeiros e percentuais preservam as casas decimais
 * durante entrada, conversão e apresentação. O backend permanece a autoridade
 * dos valores financeiros definitivos.
 */

/**
 * Normaliza o texto digitado mantendo as casas decimais:
 * "20,5" → "20,5" · "20.5" → "20,5" · "1.234,56" → "1234,56".
 */
export function sanitizarDecimal(texto: string, maxDecimais = 2): string {
  let limpo = (texto ?? "").replace(/[^\d.,]/g, "");
  if (limpo.includes(",")) {
    // Vírgula presente → pontos são milhares.
    limpo = limpo.replace(/\./g, "");
  } else {
    // Só pontos → o operador usou ponto como decimal.
    limpo = limpo.replace(/\./g, ",");
  }
  const partes = limpo.split(",");
  const inteiro = partes.shift() ?? "";
  if (partes.length === 0) return inteiro;
  const decimais = partes.join("").slice(0, Math.max(0, maxDecimais));
  return maxDecimais > 0 ? `${inteiro},${decimais}` : inteiro;
}

/** Converte texto brasileiro em número, sem perder casas decimais. */
export function parseDecimalBr(texto: string): number {
  const normalizado = sanitizarDecimal(texto, 10).replace(",", ".");
  const numero = Number.parseFloat(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

/** Apresenta o número no padrão brasileiro, sem zeros decorativos à direita. */
export function formatarDecimalBr(valor: number, maxDecimais = 2): string {
  if (!Number.isFinite(valor)) return "";
  const fixo = valor.toFixed(Math.max(0, maxDecimais));
  const limpo = fixo.includes(".") ? fixo.replace(/0+$/, "").replace(/\.$/, "") : fixo;
  return limpo.replace(".", ",");
}
