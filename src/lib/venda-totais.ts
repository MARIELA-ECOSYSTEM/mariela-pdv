/**
 * Totais de APRESENTAÇÃO da venda. Nenhum destes números é enviado como
 * autoridade ao backend: servem para o operador conferir a venda na tela.
 */
import { arredondarCentavos, descontoEmValor, limitarDesconto } from "@/lib/desconto";
import { calcularTroco, formaEhFiado } from "@/lib/pagamento";
import type { PdvItemCarrinho } from "@/types/carrinho";
import type { PdvDesconto } from "@/types/desconto";
import type { PdvPagamentoLinha } from "@/types/venda";

export interface PdvItemTotais {
  bruto: number;
  desconto: number;
  liquido: number;
  percentualDesconto: number;
}

export function totaisDoItem(item: PdvItemCarrinho): PdvItemTotais {
  const bruto = arredondarCentavos(item.precoUnitario * item.quantidade);
  const desconto = descontoEmValor(bruto, item.desconto);
  const liquido = arredondarCentavos(bruto - desconto);
  return {
    bruto,
    desconto,
    liquido,
    percentualDesconto: bruto > 0 ? arredondarCentavos((desconto / bruto) * 100) : 0,
  };
}

export interface PdvVendaTotais {
  /** Soma dos itens sem nenhum desconto. */
  subtotalBruto: number;
  /** Soma dos descontos aplicados item a item. */
  descontoItens: number;
  /** Subtotal já com os descontos dos itens. */
  subtotalAposItens: number;
  /** Desconto aplicado sobre o subtotal (conceito separado do desconto do item). */
  descontoVenda: number;
  /** Total da venda para exibição. */
  total: number;
}

export function calcularTotaisVenda(
  itens: PdvItemCarrinho[],
  descontoVenda: PdvDesconto | undefined,
): PdvVendaTotais {
  let subtotalBruto = 0;
  let descontoItens = 0;
  for (const item of itens) {
    const t = totaisDoItem(item);
    subtotalBruto = arredondarCentavos(subtotalBruto + t.bruto);
    descontoItens = arredondarCentavos(descontoItens + t.desconto);
  }
  const subtotalAposItens = arredondarCentavos(subtotalBruto - descontoItens);
  const descontoVendaValor = descontoEmValor(subtotalAposItens, descontoVenda);
  return {
    subtotalBruto,
    descontoItens,
    subtotalAposItens,
    descontoVenda: descontoVendaValor,
    total: arredondarCentavos(subtotalAposItens - descontoVendaValor),
  };
}

/**
 * Descontos ajustados ao carrinho ATUAL, na mesma regra do backend
 * (`resolverDesconto`): nunca negativo, % até 100 e R$ até a base sobre a
 * qual incide — base do item = preço × quantidade; base da venda = subtotal
 * após os descontos dos itens. Usado para manter o estado coerente quando o
 * carrinho muda e para garantir que o payload envie exatamente o desconto
 * que a tela mostra.
 */
export function limitarDescontosDaVenda(
  itens: PdvItemCarrinho[],
  descontoVenda: PdvDesconto,
): { itens: PdvItemCarrinho[]; descontoVenda: PdvDesconto } {
  const ajustados = itens.map((item) =>
    item.desconto
      ? { ...item, desconto: limitarDesconto(item.precoUnitario * item.quantidade, item.desconto) }
      : item,
  );
  const base = calcularTotaisVenda(ajustados, undefined).subtotalAposItens;
  return { itens: ajustados, descontoVenda: limitarDesconto(base, descontoVenda) };
}

/**
 * Desconto da venda a manter quando o carrinho muda.
 *
 * Regra definitiva: carrinho COMPLETAMENTE vazio encerra a composição daquela
 * venda — o desconto em R$ é zerado e não volta quando novos produtos forem
 * adicionados (não existe recuperação de desconto antigo). O desconto em %
 * segue o comportamento de sempre (continua valendo, limitado a 100%).
 * Com itens, vale o mesmo limite do backend (ver limitarDescontosDaVenda).
 */
export function descontoVendaParaCarrinho(
  itens: PdvItemCarrinho[],
  descontoVenda: PdvDesconto,
): PdvDesconto {
  if (itens.length === 0 && descontoVenda.tipo === "monetario") {
    return { tipo: "monetario", valor: 0 };
  }
  return limitarDescontosDaVenda(itens, descontoVenda).descontoVenda;
}

export type PdvSituacaoPagamento = "pago" | "parcial" | "pendente" | "fiado";

export interface PdvPagamentoTotais {
  recebido: number;
  pendente: number;
  /** Troco — só existe a partir do dinheiro recebido. */
  troco: number;
  /** Valor acima do total que não é dinheiro (não vira troco). > 0 = pagamento inválido. */
  excedente: number;
  tarifaTotal: number;
  liquidoTotal: number;
  /** Soma das linhas em FIADO (valor a receber depois da venda). */
  fiado: number;
  /** Valor efetivamente pago no ato (entrada), sem as linhas em FIADO. */
  pagoAgora: number;
  situacao: PdvSituacaoPagamento;
}

/**
 * Pagamento parcial, desconto e troco são conceitos independentes:
 * `pendente` é o que falta receber, `troco` é o que sobra do recebido.
 */
export function calcularTotaisPagamento(
  pagamentos: PdvPagamentoLinha[],
  total: number,
): PdvPagamentoTotais {
  const recebido = arredondarCentavos(pagamentos.reduce((soma, p) => soma + (p.valor || 0), 0));
  const pendente = arredondarCentavos(Math.max(0, total - recebido));
  const { troco, excedente } = calcularTroco(pagamentos, total);
  const tarifaTotal = arredondarCentavos(pagamentos.reduce((soma, p) => soma + (p.tarifa ?? 0), 0));
  const liquidoTotal = arredondarCentavos(
    pagamentos.reduce((soma, p) => soma + ((p.valorLiquido ?? p.valor) || 0), 0),
  );
  // FIADO é cobertura da venda, mas não é dinheiro recebido no ato.
  const fiado = arredondarCentavos(
    pagamentos.reduce((soma, p) => soma + (formaEhFiado(p.forma) ? p.valor || 0 : 0), 0),
  );
  const pagoAgora = arredondarCentavos(recebido - fiado);
  const situacao: PdvSituacaoPagamento =
    fiado > 0.001
      ? "fiado"
      : pendente <= 0.001 && recebido > 0
        ? "pago"
        : recebido > 0
          ? "parcial"
          : "pendente";
  return {
    recebido,
    pendente,
    troco,
    excedente,
    tarifaTotal,
    liquidoTotal,
    fiado,
    pagoAgora,
    situacao,
  };
}
