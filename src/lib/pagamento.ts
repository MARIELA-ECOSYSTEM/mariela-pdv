/**
 * `forma` é string livre por contrato do backend: as formas vêm de
 * GET /pdv/pagamentos/formas (cadastro do Backoffice) e o backend NÃO informa
 * a modalidade de cada uma. Estas funções reconhecem, pelo rótulo, quando a
 * forma é de cartão (débito/crédito — exige adquirente) e quando é dinheiro
 * (troco).
 *
 * A tarifa e as regras de parcelamento NÃO são cadastradas no PDV: vêm da
 * configuração do Backoffice pela API. Aqui não existe cálculo fixo de tarifa.
 */
import { encontrarAdquirente, parcelasPermitidas, suportaModalidade } from "@/lib/adquirente";
import { formatMoeda } from "@/lib/format";
import type { PdvAdquirente, PdvModalidadeCartao } from "@/types/adquirente";

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
 * Modalidade técnica (`pagamentos[].modalidade` de POST /pdv/vendas) de uma
 * forma de cartão; `undefined` para as demais (enviadas sem modalidade,
 * como o contrato permite). Crédito tem precedência se o rótulo citar ambos.
 */
export function modalidadeCartao(forma: string): PdvModalidadeCartao | undefined {
  if (formaEhCredito(forma)) return "credito";
  if (formaEhDebito(forma)) return "debito";
  return undefined;
}

/**
 * Forma que fala em cartão mas não diz se é débito ou crédito (ex.: "Cartão").
 * O PDV NÃO adivinha a modalidade: enviar sem modalidade faria o backend
 * registrar um pagamento de cartão sem maquininha e sem tarifa. Fica
 * indisponível até o cadastro no Backoffice deixar a modalidade explícita.
 */
export function formaCartaoAmbigua(forma: string): boolean {
  return /cart[aã]o/i.test(forma) && !modalidadeCartao(forma);
}

/** Dinheiro: a única forma em que o valor recebido pode passar do total (troco). */
export function formaEhDinheiro(forma: string): boolean {
  return /dinheiro/i.test(forma);
}

/**
 * Rótulo local do saldo pendente. No backend fiado NÃO é forma de pagamento:
 * a linha nunca é enviada (vira `valorPendente` + `totalParcelas`).
 */
export const FORMA_FIADO = "Fiado";

/**
 * Botões de forma de pagamento: exatamente as formas cadastradas (sem vazios
 * nem repetidas), mais a opção local Fiado quando a loja não a cadastrou.
 */
export function formasParaExibir(formas: string[]): string[] {
  const vistas = new Set<string>();
  const lista: string[] = [];
  for (const bruta of formas) {
    const forma = bruta.trim();
    const chave = forma.toLowerCase();
    if (!forma || vistas.has(chave)) continue;
    vistas.add(chave);
    lista.push(forma);
  }
  if (!lista.some(formaEhFiado)) lista.push(FORMA_FIADO);
  return lista;
}

/**
 * Texto do bloqueio "falta receber" de `validarPagamentos`. Exposto para a tela
 * reconhecer esse caso e mostrá-lo uma só vez (na situação do pagamento).
 */
export function mensagemFaltaReceber(falta: number): string {
  return `Falta receber ${formatMoeda(falta)}. Adicione outro pagamento ou lance a diferença no Fiado.`;
}

/**
 * Problema que impede conferir a venda, em linguagem da vendedora — ou null.
 * O backend continua sendo a autoridade; aqui só se evita enviar o que ele
 * recusaria ou registraria de forma diferente do que a tela mostra:
 *  - forma de cartão ambígua (sem débito/crédito no nome);
 *  - cartão (`validarPagamentoEstruturado`): adquirente obrigatória, que aceite
 *    a modalidade e, no crédito, parcelamento configurado nela;
 *  - pagamento abaixo do total sem a diferença lançada no Fiado: o backend
 *    transformaria a falta em saldo pendente (venda fiada) sem ninguém ver;
 *  - Fiado sem cliente: o backend exige cliente para saldo pendente
 *    ("Cliente é obrigatório para vendas com saldo pendente").
 * Linhas sem valor (ex.: dinheiro todo absorvido pelo troco) não são enviadas
 * e por isso não passam pelas regras de cartão.
 */
export function validarPagamentos(
  pagamentos: Array<{
    forma: string;
    valor: number;
    parcelas?: number | undefined;
    adquirenteId?: string | undefined;
  }>,
  total: number,
  adquirentes: PdvAdquirente[],
  temCliente = false,
): string | null {
  const ambigua = pagamentos.find((p) => formaCartaoAmbigua(p.forma));
  if (ambigua) {
    return `“${ambigua.forma}” não informa se é débito ou crédito. Remova este pagamento e use uma forma de débito ou crédito.`;
  }

  for (const p of aplicarTroco(pagamentos, total)) {
    const modalidade = modalidadeCartao(p.forma);
    if (!modalidade || p.valorAplicado <= 0) continue;
    const adquirente = encontrarAdquirente(adquirentes, p.adquirenteId);
    if (!adquirente) return `Escolha a maquininha do pagamento em ${p.forma}.`;
    if (!suportaModalidade(adquirente, modalidade)) {
      return `A maquininha ${adquirente.nome} não aceita ${modalidade === "credito" ? "crédito" : "débito"}.`;
    }
    if (modalidade === "credito" && !parcelasPermitidas(adquirente).includes(p.parcelas ?? 0)) {
      return `Escolha o parcelamento do pagamento em ${p.forma}.`;
    }
  }

  const cobertura = pagamentos.reduce((soma, p) => soma + centavos(p.valor), 0);
  const falta = centavos(total) - cobertura;
  if (falta > 0) return mensagemFaltaReceber(falta / 100);

  const fiado = pagamentos
    .filter((p) => formaEhFiado(p.forma))
    .reduce((soma, p) => soma + centavos(p.valor), 0);
  if (fiado > 0 && !temCliente) {
    return "Venda no Fiado precisa de cliente. Selecione a cliente antes de conferir.";
  }
  return null;
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
  /** Só em débito/crédito (exige `adquirenteId`). */
  modalidade?: PdvModalidadeCartao | undefined;
  adquirenteId?: string | undefined;
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
  pagamentos: Array<{
    forma: string;
    valor: number;
    parcelas?: number | undefined;
    adquirenteId?: string | undefined;
  }>,
  total: number,
): PdvPagamentosParaEnvio {
  const reais = aplicarTroco(pagamentos, total).filter(
    (p) => !formaEhFiado(p.forma) && p.valorAplicado > 0,
  );
  const linhaFiado = pagamentos.find((p) => formaEhFiado(p.forma));

  return {
    pagamentos: reais.map((p) => {
      const modalidade = modalidadeCartao(p.forma);
      // Cartão: modalidade + adquirenteId reais (da lista da API). Débito é
      // sempre 1x no backend — `parcelas` só vai no crédito, onde é obrigatório.
      if (modalidade) {
        return {
          forma: p.forma,
          valor: p.valorAplicado,
          modalidade,
          adquirenteId: p.adquirenteId,
          ...(modalidade === "credito" && p.parcelas ? { parcelas: p.parcelas } : {}),
        };
      }
      return {
        forma: p.forma,
        valor: p.valorAplicado,
        ...(p.parcelas ? { parcelas: p.parcelas } : {}),
      };
    }),
    ...(linhaFiado?.parcelas ? { totalParcelas: linhaFiado.parcelas } : {}),
  };
}
