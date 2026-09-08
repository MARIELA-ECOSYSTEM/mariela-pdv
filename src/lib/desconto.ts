/**
 * Equivalência % ↔ R$ do desconto, usada apenas para apresentação/UX.
 * O backend permanece a autoridade do cálculo final da venda.
 */
import { DESCONTO_ZERO, type PdvDesconto, type PdvDescontoTipo } from "@/types/desconto";

/** Arredonda para 2 casas evitando ruído de ponto flutuante na apresentação. */
export function arredondarCentavos(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function normalizar(valor: number): number {
  return Number.isFinite(valor) && valor > 0 ? valor : 0;
}

/** Valor em R$ do desconto aplicado sobre `base`, já limitado à base. */
export function descontoEmValor(base: number, desconto: PdvDesconto | undefined): number {
  const baseSegura = normalizar(base);
  if (!desconto) return 0;
  const valor = normalizar(desconto.valor);
  if (desconto.tipo === "percentual") {
    return arredondarCentavos((baseSegura * Math.min(valor, 100)) / 100);
  }
  return arredondarCentavos(Math.min(valor, baseSegura));
}

/** Percentual equivalente do desconto sobre `base`. */
export function descontoEmPercentual(base: number, desconto: PdvDesconto | undefined): number {
  const baseSegura = normalizar(base);
  if (!desconto) return 0;
  if (desconto.tipo === "percentual") return Math.min(normalizar(desconto.valor), 100);
  if (baseSegura <= 0) return 0;
  return arredondarCentavos((descontoEmValor(baseSegura, desconto) / baseSegura) * 100);
}

/** Limita a entrada do operador: nunca negativa, % até 100, R$ até a base. */
export function limitarDesconto(base: number, desconto: PdvDesconto): PdvDesconto {
  const valor = normalizar(desconto.valor);
  const limite = desconto.tipo === "percentual" ? 100 : normalizar(base);
  return { tipo: desconto.tipo, valor: arredondarCentavos(Math.min(valor, limite)) };
}

/**
 * Troca a modalidade preservando o efeito financeiro atual
 * (10% de R$ 100 → R$ 10,00 e vice-versa).
 */
export function converterModalidade(
  base: number,
  desconto: PdvDesconto,
  tipo: PdvDescontoTipo,
): PdvDesconto {
  if (tipo === desconto.tipo) return desconto;
  if (tipo === "monetario") return { tipo, valor: descontoEmValor(base, desconto) };
  return { tipo, valor: descontoEmPercentual(base, desconto) };
}

export { DESCONTO_ZERO };
