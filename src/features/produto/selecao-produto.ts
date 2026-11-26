/**
 * Pré-seleção de cor e tamanho no diálogo do produto, para adicionar com
 * menos toques — sem inventar estoque: usa só o estoque do tamanho vindo da
 * API (`tamanho.quantidade`/`disponivel`) menos o que já está no carrinho
 * (mesmo limite da Fase D). O backend continua sendo a autoridade.
 *
 *  - Cor: a primeira que tenha algum tamanho ainda disponível; nenhuma se
 *    não houver (a vendedora não é levada a uma opção indisponível).
 *  - Tamanho: marcado sozinho só quando há EXATAMENTE um disponível naquela
 *    cor; com mais de um, a escolha é da vendedora.
 */
import { linhaDoCarrinho } from "@/features/carrinho/useCarrinho";
import type { PdvProduto, PdvProdutoTamanho, PdvProdutoVariante } from "@/types/produto";

export type QuantidadeNoCarrinho = (linhaId: string) => number;

/** Tamanho com estoque na API (independente do carrinho). */
export function tamanhoComEstoque(tamanho: PdvProdutoTamanho): boolean {
  return tamanho.disponivel && tamanho.quantidade > 0;
}

/** Cor com algum tamanho em estoque na API (independente do carrinho). */
export function corComEstoque(variante: PdvProdutoVariante): boolean {
  return variante.tamanhos.some(tamanhoComEstoque);
}

/** Quantas peças daquele tamanho ainda podem ir para o carrinho. */
export function disponivelParaAdicionar(
  produtoId: string,
  varianteId: string,
  tamanho: PdvProdutoTamanho,
  noCarrinho: QuantidadeNoCarrinho,
): number {
  if (!tamanhoComEstoque(tamanho)) return 0;
  return Math.max(
    0,
    tamanho.quantidade - noCarrinho(linhaDoCarrinho(produtoId, varianteId, tamanho.id)),
  );
}

function tamanhosAdicionaveis(
  produto: PdvProduto,
  variante: PdvProdutoVariante,
  noCarrinho: QuantidadeNoCarrinho,
): PdvProdutoTamanho[] {
  return variante.tamanhos.filter(
    (t) => disponivelParaAdicionar(produto.id, variante.id, t, noCarrinho) > 0,
  );
}

/** Cor a marcar ao abrir o produto: a primeira com algo ainda adicionável. */
export function corInicial(
  produto: PdvProduto,
  noCarrinho: QuantidadeNoCarrinho,
): string | undefined {
  return produto.variantes.find((v) => tamanhosAdicionaveis(produto, v, noCarrinho).length > 0)?.id;
}

/** Tamanho a marcar sozinho: só quando há exatamente um adicionável na cor. */
export function tamanhoAutomatico(
  produto: PdvProduto,
  varianteId: string | undefined,
  noCarrinho: QuantidadeNoCarrinho,
): string | undefined {
  const variante = produto.variantes.find((v) => v.id === varianteId);
  if (!variante) return undefined;
  const adicionaveis = tamanhosAdicionaveis(produto, variante, noCarrinho);
  return adicionaveis.length === 1 ? adicionaveis[0]!.id : undefined;
}
