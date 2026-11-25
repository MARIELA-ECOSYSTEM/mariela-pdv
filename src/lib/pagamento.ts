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

/** Dinheiro: a única forma em que o valor recebido pode passar do total (troco). */
export function formaEhDinheiro(forma: string): boolean {
  return /dinheiro/i.test(forma);
}

function centavos(valor: number): number {
  return Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) : 0;
}

export interface PdvTroco {
  /** Valor a devolver à cliente — sai sempre do dinheiro recebido. */
  troco: number;
  /**
   * Valor acima do total que NÃO pode virar troco (porque não há dinheiro
   * suficiente para absorvê-lo — ex.: PIX/cartão acima do total). > 0 =
   * pagamento inválido, a venda não pode ser conferida.
   */
  excedente: number;
}

/**
 * O valor digitado numa linha de Dinheiro é o RECEBIDO da cliente. O que
 * passa do total da venda vira troco, limitado ao total recebido em dinheiro.
 * Linhas Fiado contam como cobertura (mesma regra da tela).
 */
export function calcularTroco(
  pagamentos: Array<{ forma: string; valor: number }>,
  total: number,
): PdvTroco {
  const cobertura = pagamentos.reduce((soma, p) => soma + centavos(p.valor), 0);
  const excesso = Math.max(0, cobertura - centavos(total));
  const dinheiro = pagamentos
    .filter((p) => formaEhDinheiro(p.forma))
    .reduce((soma, p) => soma + centavos(p.valor), 0);
  const troco = Math.min(excesso, dinheiro);
  return { troco: troco / 100, excedente: (excesso - troco) / 100 };
}

/**
 * Valor APLICADO à venda de cada linha: o troco é descontado das linhas de
 * Dinheiro (da última para a primeira); as demais ficam como estão.
 */
export function aplicarTroco<T extends { forma: string; valor: number }>(
  pagamentos: T[],
  total: number,
): Array<T & { valorAplicado: number }> {
  let restante = centavos(calcularTroco(pagamentos, total).troco);
  const aplicados = pagamentos.map((p) => centavos(p.valor));
  for (let i = pagamentos.length - 1; i >= 0 && restante > 0; i -= 1) {
    if (!formaEhDinheiro(pagamentos[i]!.forma)) continue;
    const desconto = Math.min(aplicados[i]!, restante);
    aplicados[i] = aplicados[i]! - desconto;
    restante -= desconto;
  }
  return pagamentos.map((p, i) => ({ ...p, valorAplicado: aplicados[i]! / 100 }));
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
 *
 * Dinheiro com troco: envia o valor APLICADO (recebido − troco), nunca o
 * recebido — o backend recusa pagamentos que somem mais que o valor final
 * ("A soma dos pagamentos não pode exceder o valor final"). O troco nunca vai
 * no payload. Linhas que ficam com valor zero não são enviadas (o DTO exige
 * valor positivo).
 */
export function montarPagamentosParaEnvio(
  pagamentos: Array<{ forma: string; valor: number; parcelas?: number | undefined }>,
  total: number,
): PdvPagamentosParaEnvio {
  const reais = aplicarTroco(pagamentos, total).filter(
    (p) => !formaEhFiado(p.forma) && p.valorAplicado > 0,
  );
  const linhaFiado = pagamentos.find((p) => formaEhFiado(p.forma));

  return {
    pagamentos: reais.map((p) => ({
      forma: p.forma,
      valor: p.valorAplicado,
      ...(p.parcelas ? { parcelas: p.parcelas } : {}),
    })),
    ...(linhaFiado?.parcelas ? { totalParcelas: linhaFiado.parcelas } : {}),
  };
}
