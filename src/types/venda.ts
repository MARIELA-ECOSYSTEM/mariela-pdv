import type { PdvItemCarrinho } from "./carrinho";

/**
 * `forma` é string livre por contrato do backend — não transformar em enum
 * fechado no frontend.
 */
export interface PdvPagamentoLinha {
  /** Identificador local da linha (apenas UI). Não é enviado ao backend. */
  id: string;
  forma: string;
  valor: number;
}

export type PdvVendaEstado = "rascunho" | "processando" | "em_pagamento" | "concluida" | "erro";

/**
 * Corpo de POST /api/v1/pdv/vendas.
 * O frontend envia intenção: itens, quantidades, desconto, pagamentos e cliente.
 * NÃO envia preço, total nem troco — o backend é a autoridade sobre valores,
 * estoque e regras de negócio.
 */
export interface PdvVendaPayload {
  clienteId?: string | undefined;
  desconto: number;
  itens: Array<{
    produtoId: string;
    varianteId?: string | undefined;
    quantidade: number;
  }>;
  pagamentos: Array<{ forma: string; valor: number }>;
}

/** Resposta de POST /api/v1/pdv/vendas. Campos além de `id` a confirmar no backend. */
export interface PdvVendaCriada {
  id: string;
  status?: string | undefined;
}

/** Estado local da tentativa de venda (somente frontend). */
export interface PdvVendaTentativa {
  /** Reutilizada em retries da MESMA tentativa. */
  idempotencyKey: string;
  estado: PdvVendaEstado;
  mensagemErro?: string | undefined;
  itens?: PdvItemCarrinho[] | undefined;
  /** Total calculado no cliente apenas para exibição. */
  total?: number | undefined;
  vendaId?: string | undefined;
}
