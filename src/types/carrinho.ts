/** Carrinho é 100% local e existe apenas na sessão operacional atual. */

export interface PdvItemCarrinho {
  /** Chave local do item (produto + variante). */
  linhaId: string;
  produtoId: string;
  varianteId?: string;
  nome: string;
  codigo?: string;
  cor?: string;
  tamanho?: string;
  imagemUrl?: string | null;
  /** Preço vindo da API. O frontend nunca é autoridade sobre preço. */
  precoUnitario: number;
  quantidade: number;
  estoqueDisponivel?: number;
}
