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
 * FIADO: o cliente não paga no ato e fica com saldo a receber. O frontend
 * apenas representa essa intenção (valor pendente e nº de parcelas); as regras
 * de cobrança e vencimentos são autoridade do backend.
 */
export function formaEhFiado(forma: string): boolean {
  return /fiad/i.test(forma);
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

/** Pagamento pronto para POST /pdv/vendas — só os campos que o DTO aceita. */
export interface PdvPagamentoParaEnvio {
  forma: string;
  valor: number;
  parcelas?: number | undefined;
}

export interface PdvPagamentosParaEnvio {
  pagamentos: PdvPagamentoParaEnvio[];
  /** Quantidade de parcelas para o saldo pendente (Fiado), quando houver. */
  totalParcelas?: number | undefined;
}

/**
 * Traduz as linhas de pagamento do estado local para o que POST /pdv/vendas
 * aceita. A linha "Fiado" NUNCA é enviada como pagamento: ela representa
 * saldo NÃO recebido no ato, não dinheiro de verdade. O backend já calcula
 * `valorPendente` (valorFinal − soma dos pagamentos reais enviados) e gera as
 * parcelas a partir de `totalParcelas` — enviar a linha Fiado como pagamento
 * faria o backend registrar a venda como totalmente paga.
 */
export function montarPagamentosParaEnvio(
  pagamentos: Array<{ forma: string; valor: number; parcelas?: number | undefined }>,
): PdvPagamentosParaEnvio {
  const reais = pagamentos.filter((p) => !formaEhFiado(p.forma));
  const linhaFiado = pagamentos.find((p) => formaEhFiado(p.forma));

  return {
    pagamentos: reais.map((p) => ({
      forma: p.forma,
      valor: p.valor,
      ...(p.parcelas ? { parcelas: p.parcelas } : {}),
    })),
    ...(linhaFiado?.parcelas ? { totalParcelas: linhaFiado.parcelas } : {}),
  };
}
