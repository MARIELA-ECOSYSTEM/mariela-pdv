import type { PdvItemCarrinho } from "./carrinho";
import type { PdvDesconto } from "./desconto";

/**
 * `forma` é string livre por contrato do backend — não transformar em enum
 * fechado no frontend.
 *
 * `parcelas`, `tarifa` e `valorLiquido` existem apenas no estado local: a
 * tarifa da adquirente e as regras de parcelamento são configuradas no
 * Backoffice e chegarão pela API. O frontend nunca calcula tarifa e, enquanto
 * o contrato de venda não receber esses campos, envia somente `forma` e `valor`.
 */
export interface PdvPagamentoLinha {
  /** Identificador local da linha (apenas UI). Não é enviado ao backend. */
  id: string;
  forma: string;
  valor: number;
  /** Quantidade de parcelas no crédito (1 quando à vista). */
  parcelas?: number | undefined;
  /** Tarifa da maquininha informada pelo backend — nunca calculada aqui. */
  tarifa?: number | null | undefined;
  /** Valor líquido informado pelo backend — nunca calculado aqui. */
  valorLiquido?: number | null | undefined;
}

export type PdvVendaEstado = "rascunho" | "processando" | "em_pagamento" | "concluida" | "erro";

/**
 * Corpo de POST /api/v1/pdv/vendas (espelha CriarVendaPdvDto).
 * O frontend envia intenção: itens, quantidades, desconto, pagamentos e cliente.
 * NÃO envia preço, total nem troco — o backend é a autoridade sobre valores,
 * estoque e regras de negócio.
 *
 * Item espelha exatamente `ItemVendaPdvDto`: `varianteId`/`tamanhoId` são
 * obrigatórios (nunca fabricados no frontend — vêm do carrinho, que por sua
 * vez só os aceita de um `PdvProdutoVariante`/`PdvProdutoTamanho` reais).
 */
export interface PdvVendaPayload {
  clienteId?: string | undefined;
  /** Nome de campo do backend é `descontoVenda`, não `desconto`. */
  descontoVenda: number;
  itens: Array<{
    produtoId: string;
    varianteId: string;
    tamanhoId: string;
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
