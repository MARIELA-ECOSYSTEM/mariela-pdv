/**
 * `forma` é string livre por contrato do backend. Estas funções apenas
 * reconhecem, para fins de interface, quando a forma escolhida é de cartão
 * (tarifa da adquirente) e quando exige parcelamento.
 *
 * A tarifa e as regras de parcelamento NÃO são cadastradas no PDV: virão da
 * configuração do Backoffice pela API. Aqui não existe cálculo fixo de tarifa.
 */

export function formaEhCredito(forma: string): boolean {
  return /cr[eé]dito/i.test(forma);
}

export function formaEhDebito(forma: string): boolean {
  return /d[eé]bito/i.test(forma);
}

export function formaEhCartao(forma: string): boolean {
  return formaEhCredito(forma) || formaEhDebito(forma);
}

/**
 * NÃO é regra de negócio: as parcelas oferecidas ao operador vêm sempre da
 * configuração da adquirente (ver src/lib/adquirente.ts). Este helper existe
 * apenas como utilitário genérico de lista e não é usado no fluxo de crédito.
 */
export const MAX_PARCELAS_PADRAO = 12;

export function opcoesParcelas(maximo = MAX_PARCELAS_PADRAO): number[] {
  const limite = Math.max(1, Math.floor(maximo));
  return Array.from({ length: limite }, (_, i) => i + 1);
}
