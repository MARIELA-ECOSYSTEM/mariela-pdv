/**
 * Estrutura mínima de produto do PDV.
 * Será ajustada quando o payload definitivo de GET /api/v1/pdv/produtos existir.
 */

export interface PdvProdutoVariante {
  id: string;
  cor?: string;
  tamanho?: string;
  estoque?: number;
}

export interface PdvProduto {
  id: string;
  nome: string;
  codigo?: string;
  preco: number;
  imagemUrl?: string | null;
  disponivel?: boolean;
  variantes?: PdvProdutoVariante[];
}
