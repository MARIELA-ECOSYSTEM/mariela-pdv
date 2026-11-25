/**
 * Regras simples do catálogo do PDV (sem cache nem índice local):
 *  - a busca é sempre do backend (nome, código ou categoria) — nada é
 *    refiltrado aqui;
 *  - "Carregar mais" acrescenta a próxima página do mesmo resultado;
 *  - depois de uma venda concluída, só os produtos vendidos são relidos
 *    (GET /pdv/produtos/:id) para o estoque exibido não ficar velho.
 */
import type { PdvProdutosPort } from "@/services/ports";
import type { PdvProduto } from "@/types/produto";

/** Acrescenta a página seguinte, sem repetir produto já listado. */
export function juntarPaginas(atuais: PdvProduto[], novos: PdvProduto[]): PdvProduto[] {
  const ids = new Set(atuais.map((p) => p.id));
  return [...atuais, ...novos.filter((p) => !ids.has(p.id))];
}

/** Troca, na lista exibida, os produtos que foram relidos do backend. */
export function substituirProdutos(lista: PdvProduto[], atualizados: PdvProduto[]): PdvProduto[] {
  if (atualizados.length === 0) return lista;
  const porId = new Map(atualizados.map((p) => [p.id, p]));
  return lista.map((p) => porId.get(p.id) ?? p);
}

/**
 * Relê do backend os produtos de uma venda concluída (um GET por produto
 * distinto). Falha individual é ignorada: aquele produto só continua com o
 * dado anterior — o backend segue sendo a autoridade na próxima venda.
 */
export async function relerProdutosVendidos(
  produtoIds: string[],
  porta: Pick<PdvProdutosPort, "obter">,
): Promise<PdvProduto[]> {
  const distintos = [...new Set(produtoIds)];
  const resultados = await Promise.allSettled(distintos.map((id) => porta.obter(id)));
  return resultados.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
}
