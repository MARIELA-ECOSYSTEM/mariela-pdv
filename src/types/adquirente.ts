/**
 * Adquirente (maquininha) como CONFIGURAÇÃO — nunca como regra de negócio do PDV.
 *
 * Cadastrada no Backoffice e entregue por GET /api/v1/pdv/pagamentos/adquirentes
 * (`AdquirentePdv`, mariela-backend `pdv-pagamentos.types.ts`):
 *
 *   Adquirente { id, nome, modalidades }
 *   └── modalidades
 *       ├── debito  → { tarifaPercentual } | null  (null = não aceita débito)
 *       └── credito → { opcoes: [{ parcelas, tarifaPercentual }] } | null
 *
 * `id` é o `adquirenteId` exigido por POST /pdv/vendas em débito/crédito.
 * O frontend NUNCA calcula a tarifa oficial: o backend aplica e devolve
 * `tarifaAplicada` na venda.
 */

export interface PdvAdquirenteParcelaConfig {
  /** Quantidade de parcelas autorizada (1x = crédito à vista). */
  parcelas: number;
  /** Tarifa informada pela configuração. Ausente = não exibir tarifa. */
  tarifaPercentual?: number | null | undefined;
}

export interface PdvAdquirenteModalidades {
  debito?: { tarifaPercentual?: number | null | undefined } | null | undefined;
  credito?: { opcoes: PdvAdquirenteParcelaConfig[] } | null | undefined;
}

export interface PdvAdquirente {
  id: string;
  nome: string;
  observacao?: string | null | undefined;
  modalidades: PdvAdquirenteModalidades;
}

export type PdvModalidadeCartao = "debito" | "credito";
