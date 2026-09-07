/** Estados de apresentação do caixa do PDV. */

export type PdvCaixaEstado =
  | "carregando"
  | "fechado"
  | "abrindo"
  | "aberto"
  | "conflito"
  | "erro";

export interface PdvCaixa {
  id: string;
  abertoEm?: string;
  valorAbertura?: number;
}
