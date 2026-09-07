import type { PdvItemCarrinho } from "./carrinho";

/** `forma` é string livre por contrato — não criar enum rígido. */
export interface PdvPagamentoLinha {
  id: string;
  forma: string;
  valor: number;
}

export type PdvVendaEstado =
  | "rascunho"
  | "processando"
  | "em_pagamento"
  | "concluida"
  | "erro";

export interface PdvVendaPayload {
  clienteId?: string;
  desconto: number;
  itens: Array<{
    produtoId: string;
    varianteId?: string;
    quantidade: number;
  }>;
  pagamentos: Array<{ forma: string; valor: number }>;
}

export interface PdvVendaTentativa {
  /** Reutilizada em retries da mesma tentativa. */
  idempotencyKey: string;
  estado: PdvVendaEstado;
  mensagemErro?: string;
  itens?: PdvItemCarrinho[];
  total?: number;
}
