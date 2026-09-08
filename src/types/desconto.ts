/**
 * Desconto como INTENÇÃO do operador — nunca como autoridade financeira.
 *
 * O operador informa um único número e escolhe a modalidade (% ou R$). O
 * frontend só calcula a equivalência para feedback visual; o valor definitivo
 * do desconto, do total e da venda continua sendo do backend.
 */
export type PdvDescontoTipo = "percentual" | "monetario";

export interface PdvDesconto {
  tipo: PdvDescontoTipo;
  /** Valor digitado, na modalidade escolhida. Nunca negativo. */
  valor: number;
}

export const DESCONTO_ZERO: PdvDesconto = { tipo: "percentual", valor: 0 };
