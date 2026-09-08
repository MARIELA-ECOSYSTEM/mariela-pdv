/**
 * Produto do PDV — projeção de leitura do backend real (`ProdutoCatalogoPdv`,
 * `pdv-produtos.types.ts`), consumido via GET /api/v1/pdv/produtos e
 * /api/v1/pdv/produtos/:id.
 *
 * `codigo`/`preco`/`imagemUrl` são o vocabulário do frontend — a tradução dos
 * nomes reais do backend (`codProduto`/`precoEfetivo`/`imagem`) acontece em
 * `services/api/produtos.api.ts`, mesmo padrão já usado para login em
 * `auth.api.ts` (Etapa 08.2). `variantes`/`tamanhos` já usam os nomes reais
 * do backend sem tradução: não há ambiguidade a resolver, e são exatamente os
 * dois IDs (`varianteId`, `tamanhoId`) que `POST /pdv/vendas` exige por item —
 * nunca achatar cor+tamanho em um único id fabricado pelo frontend.
 */

export interface PdvProdutoTamanho {
  id: string;
  tamanho: string;
  quantidade: number;
  disponivel: boolean;
}

export interface PdvProdutoVariante {
  id: string;
  cor: string;
  foto: string | null;
  quantidade: number;
  disponivel: boolean;
  tamanhos: PdvProdutoTamanho[];
}

export interface PdvProduto {
  id: string;
  nome: string;
  codigo: string;
  preco: number;
  imagemUrl: string | null;
  disponivel: boolean;
  variantes: PdvProdutoVariante[];
}
