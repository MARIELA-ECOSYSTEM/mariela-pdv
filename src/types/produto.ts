/**
 * Estrutura mínima de produto do PDV.
 * Será ajustada quando o payload definitivo de GET /api/v1/pdv/produtos existir.
 */

export interface PdvProdutoVariante {
  id: string;
  cor?: string | undefined;
  tamanho?: string | undefined;
  estoque?: number | undefined;
}

export interface PdvProduto {
  id: string;
  nome: string;
  codigo?: string | undefined;
  preco: number;
  imagemUrl?: string | null | undefined;
  disponivel?: boolean | undefined;
  variantes?: PdvProdutoVariante[] | undefined;
}
