/**
 * Endpoints reais de produtos:
 *   GET /api/v1/pdv/produtos
 *   GET /api/v1/pdv/produtos/:id
 *
 * NÃO existe GET /api/v1/pdv/produtos/:id/variantes — as variantes vêm no
 * próprio payload do produto, conforme o contrato definido pelo backend.
 */
import { PDV_API_PREFIX } from "@/config/pdv.config";
import { PdvApiClient } from "./client";
import type { PdvProdutosPort } from "@/services/ports";
import type { PdvBuscaParams, PdvListaEnvelope } from "@/types/api";
import type { PdvProduto } from "@/types/produto";

/**
 * O envelope { data, meta } está confirmado para clientes. Para produtos o
 * formato definitivo ainda deve ser confirmado no backend, por isso aceitamos
 * lista direta ou envelope, sem inventar campos de meta.
 */
function lista(resposta: PdvProduto[] | PdvListaEnvelope<PdvProduto>): PdvProduto[] {
  return Array.isArray(resposta) ? resposta : resposta.data;
}

export const produtosApi: PdvProdutosPort = {
  async listar(params?: PdvBuscaParams): Promise<PdvProduto[]> {
    const query = params?.busca ? `?busca=${encodeURIComponent(params.busca)}` : "";
    const resposta = await PdvApiClient.get<PdvProduto[] | PdvListaEnvelope<PdvProduto>>(
      `${PDV_API_PREFIX}/produtos${query}`,
    );
    return lista(resposta);
  },
  obter(id: string): Promise<PdvProduto> {
    return PdvApiClient.get<PdvProduto>(`${PDV_API_PREFIX}/produtos/${encodeURIComponent(id)}`);
  },
};
