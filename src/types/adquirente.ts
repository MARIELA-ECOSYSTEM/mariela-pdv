/**
 * Adquirente (maquininha) como CONFIGURAÇÃO — nunca como regra de negócio do PDV.
 *
 * A configuração real é cadastrada no Backoffice e será fornecida pela API do
 * mariela-backend. O contrato oficial ainda não existe, então estes tipos
 * descrevem apenas a forma que a interface precisa consumir:
 *
 *   Adquirente
 *   ├── nome
 *   ├── observacao
 *   └── modalidades
 *       ├── debito  → tarifa
 *       └── credito → opções de parcelamento autorizadas (com tarifa opcional)
 *
 * O frontend NUNCA calcula tarifa: só exibe o que a configuração/API informar.
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
