import { PdvApiClient } from "./client";
import type { PdvProduto } from "@/types/produto";

/** GET /api/v1/pdv/produtos */
export function listarProdutos(busca?: string) {
  const query = busca ? `?busca=${encodeURIComponent(busca)}` : "";
  return PdvApiClient.get<PdvProduto[]>(`/api/v1/pdv/produtos${query}`);
}
