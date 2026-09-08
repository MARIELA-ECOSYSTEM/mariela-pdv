/**
 * Totais de APRESENTAÇÃO da venda. Nenhum destes números é enviado como
 * autoridade ao backend: servem para o operador conferir a venda na tela.
 */
import { arredondarCentavos, descontoEmValor } from "@/lib/desconto";
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

export type PdvSituacaoPagamento = "pago" | "parcial" | "pendente";

export interface PdvPagamentoTotais {
  recebido: number;
  pendente: number;
  troco: number;
  tarifaTotal: number;
  liquidoTotal: number;
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
  const troco = arredondarCentavos(Math.max(0, recebido - total));
  const tarifaTotal = arredondarCentavos(pagamentos.reduce((soma, p) => soma + (p.tarifa ?? 0), 0));
  const liquidoTotal = arredondarCentavos(
    pagamentos.reduce((soma, p) => soma + ((p.valorLiquido ?? p.valor) || 0), 0),
  );
  const situacao: PdvSituacaoPagamento =
    pendente <= 0.001 && recebido > 0 ? "pago" : recebido > 0 ? "parcial" : "pendente";
  return { recebido, pendente, troco, tarifaTotal, liquidoTotal, situacao };
}
