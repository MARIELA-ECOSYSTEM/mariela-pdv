/**
 * Endpoint real de clientes:
 *   GET /api/v1/pdv/clientes  → { data: [...], meta: {...} } (PdvApiClient já desembrulha `.data`)
 *
 * NÃO existe POST /api/v1/pdv/clientes — o PDV não cadastra clientes.
 */
import { PDV_API_PREFIX } from "@/config/pdv.config";
import { PdvApiClient } from "./client";
import type { PdvClientesPort } from "@/services/ports";
import type { PdvBuscaParams } from "@/types/api";
import type { PdvCliente } from "@/types/cliente";

export const clientesApi: PdvClientesPort = {
  listar(params?: PdvBuscaParams): Promise<PdvCliente[]> {
    const query = params?.busca ? `?busca=${encodeURIComponent(params.busca)}` : "";
    return PdvApiClient.get<PdvCliente[]>(`${PDV_API_PREFIX}/clientes${query}`);
  },
};
