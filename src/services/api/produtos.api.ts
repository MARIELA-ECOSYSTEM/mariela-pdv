/**
 * Endpoints reais de produtos:
 *   GET /api/v1/pdv/produtos?busca=&page=&limit=
 *       — { data: [...], meta: { total, page, limit, totalPages } }
 *       (`ListarProdutosPdvQueryDto`: busca no servidor por nome, código ou
 *       categoria; limit padrão 30, máximo 60). O `meta` é preservado aqui
 *       (`manterEnvelope`) para o catálogo saber se há mais páginas.
 *   GET /api/v1/pdv/produtos/:id   — { data: {...} }
 *
 * NÃO existe GET /api/v1/pdv/produtos/:id/variantes — as variantes vêm no
 * próprio payload do produto, conforme o contrato definido pelo backend.
 *
 * O backend devolve `ProdutoCatalogoPdv` (campos `codProduto`, `precoEfetivo`,
 * `imagem`) — traduzido aqui para o vocabulário do frontend (`codigo`,
 * `preco`, `imagemUrl`), mesmo padrão de tradução já usado em `auth.api.ts`
 * (Etapa 08.2). `variantes`/`tamanhos` são copiados tal como vêm: já usam os
 * nomes reais do backend (cor/foto/quantidade/disponivel/tamanhos), sem
 * nenhuma tradução necessária — são os IDs que POST /pdv/vendas exige.
 */
import { PDV_API_PREFIX } from "@/config/pdv.config";
import { PdvApiClient } from "./client";
import type { PdvProdutosPort } from "@/services/ports";
import type { PdvBuscaParams, PdvPagina } from "@/types/api";
import type { PdvProduto, PdvProdutoVariante } from "@/types/produto";

/** Shape real de `ProdutoCatalogoPdv` — só os campos usados na tradução. */
interface ProdutoCatalogoPdvBruto {
  id: string;
  codProduto: string;
  nome: string;
  imagem: string | null;
  precoEfetivo: number;
  disponivel: boolean;
  variantes: PdvProdutoVariante[];
}

function paraPdvProduto(bruto: ProdutoCatalogoPdvBruto): PdvProduto {
  return {
    id: bruto.id,
    nome: bruto.nome,
    codigo: bruto.codProduto,
    preco: bruto.precoEfetivo,
    imagemUrl: bruto.imagem,
    disponivel: bruto.disponivel,
    variantes: bruto.variantes,
  };
}

interface MetaListagem {
  total?: number;
  page?: number;
  totalPages?: number;
}

export const produtosApi: PdvProdutosPort = {
  async listar(params?: PdvBuscaParams): Promise<PdvPagina<PdvProduto>> {
    const query = new URLSearchParams();
    if (params?.busca) query.set("busca", params.busca);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    const texto = query.toString();
    const sufixo = texto ? `?${texto}` : "";
    const corpo = await PdvApiClient.get<{ data: ProdutoCatalogoPdvBruto[]; meta?: MetaListagem }>(
      `${PDV_API_PREFIX}/produtos${sufixo}`,
      { manterEnvelope: true },
    );
    const itens = (corpo.data ?? []).map(paraPdvProduto);
    return {
      itens,
      pagina: corpo.meta?.page ?? params?.page ?? 1,
      totalPaginas: corpo.meta?.totalPages ?? 1,
      total: corpo.meta?.total ?? itens.length,
    };
  },
  async obter(id: string): Promise<PdvProduto> {
    const bruto = await PdvApiClient.get<ProdutoCatalogoPdvBruto>(
      `${PDV_API_PREFIX}/produtos/${encodeURIComponent(id)}`,
    );
    return paraPdvProduto(bruto);
  },
};
