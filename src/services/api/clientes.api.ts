import { PdvApiClient } from "./client";
import type { PdvCliente } from "@/types/cliente";

/** GET /api/v1/pdv/clientes */
export function listarClientes(busca?: string) {
  const query = busca ? `?busca=${encodeURIComponent(busca)}` : "";
  return PdvApiClient.get<PdvCliente[]>(`/api/v1/pdv/clientes${query}`);
}
