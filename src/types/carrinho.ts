/** Carrinho é 100% local e existe apenas na sessão operacional atual. */

export interface PdvItemCarrinho {
  /** Chave local do item (produto + variante). */
  linhaId: string;
  produtoId: string;
  varianteId?: string | undefined;
  nome: string;
  codigo?: string | undefined;
  cor?: string | undefined;
  tamanho?: string | undefined;
  imagemUrl?: string | null | undefined;
  /** Preço vindo da API. O frontend nunca é autoridade sobre preço. */
  precoUnitario: number;
  quantidade: number;
  estoqueDisponivel?: number | undefined;
}
