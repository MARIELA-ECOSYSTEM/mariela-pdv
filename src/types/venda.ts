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
  /**
   * Adquirente (maquininha) escolhida pelo operador. A lista de adquirentes é
   * configuração do Backoffice — o frontend não mantém lista fixa.
   */
  adquirenteId?: string | undefined;

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
 *
 * `desconto`/`descontoVenda` usam o vocabulário do frontend (`PdvDesconto`,
 * tipo "percentual"|"monetario") — a tradução para o formato real do backend
 * (`{tipo: "percentual"|"valor", valor}`, `desconto-pdv.dto.ts`) acontece em
 * `services/api/vendas.api.ts`, mesmo padrão de tradução já usado em
 * `auth.api.ts`/`produtos.api.ts`. Enviar a INTENÇÃO bruta do operador (não
 * um valor em R$ pré-calculado no frontend) deixa o backend recalcular contra
 * o preço real dele, na mesma ordem que já usa (bruto do item → desconto do
 * item → subtotal do item → soma = subtotal da venda → desconto da venda
 * sobre esse subtotal — `VendasService.criar`, confirmado linha a linha).
 *
 * `pagamentos` nunca inclui uma linha "Fiado": ela representa saldo NÃO
 * recebido no ato, então é excluída do array antes do envio (ver
 * `routes/index.tsx`) — o próprio `valorPendente` do backend (valorFinal
 * menos os pagamentos reais) já cobre esse saldo, e `totalParcelas` informa
 * em quantas parcelas ele deve ser dividido.
 */
export interface PdvVendaPayload {
  clienteId?: string | undefined;
  /** Nome de campo do backend é `descontoVenda`, não `desconto`. Omitido quando zero. */
  descontoVenda?: PdvDesconto | undefined;
  itens: Array<{
    produtoId: string;
    varianteId: string;
    tamanhoId: string;
    quantidade: number;
    /** Desconto sobre o preço praticado desta linha. Omitido quando zero. */
    desconto?: PdvDesconto | undefined;
  }>;
  /** Nunca inclui a linha local "Fiado" — ver nota acima. */
  pagamentos: Array<{ forma: string; valor: number; parcelas?: number | undefined }>;
  /** Quantidade de parcelas para dividir o saldo pendente (Fiado), quando houver. */
  totalParcelas?: number | undefined;
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
