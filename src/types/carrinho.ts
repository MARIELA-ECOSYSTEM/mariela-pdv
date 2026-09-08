/**
 * Carrinho é 100% local e existe apenas na sessão operacional atual.
 *
 * `produtoId`/`varianteId`/`tamanhoId`/`quantidade` são os únicos campos com
 * autoridade real: são exatamente os que POST /api/v1/pdv/vendas exige por
 * item (`ItemVendaPdvDto`) e vêm sempre de um `PdvProdutoVariante`/
 * `PdvProdutoTamanho` reais escolhidos em `ProdutoDialog` — nunca fabricados
 * no frontend. Os demais campos são só apresentação (rótulo, foto, preço
 * exibido) e nunca substituem o que o backend recalcula na venda.
 */
export interface PdvItemCarrinho {
  /** Chave local do item — produto + variante + tamanho (única no carrinho). */
  linhaId: string;
  produtoId: string;
  varianteId: string;
  tamanhoId: string;
  quantidade: number;

  // Apresentação apenas — nunca enviados como autoridade de preço/estoque.
  nome: string;
  codigo?: string | undefined;
  cor: string;
  tamanho: string;
  imagemUrl?: string | null | undefined;
  /** Preço vindo da API. O frontend nunca é autoridade sobre preço. */
  precoUnitario: number;
  estoqueDisponivel: number;
}
