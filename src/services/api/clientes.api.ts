/**
 * Endpoint real de clientes:
 *   GET /api/v1/pdv/clientes  → envelope { data: [...], meta: {...} }
 *
 * NÃO existe POST /api/v1/pdv/clientes — o PDV não cadastra clientes.
 */
import { PDV_API_PREFIX } from "@/config/pdv.config";
import { PdvApiClient } from "./client";
import type { PdvClientesPort } from "@/services/ports";
import type { PdvBuscaParams, PdvListaEnvelope } from "@/types/api";
import type { PdvCliente } from "@/types/cliente";

export const clientesApi: PdvClientesPort = {
  async listar(params?: PdvBuscaParams): Promise<PdvCliente[]> {
    const query = params?.busca ? `?busca=${encodeURIComponent(params.busca)}` : "";
    const envelope = await PdvApiClient.get<PdvListaEnvelope<PdvCliente>>(
      `${PDV_API_PREFIX}/clientes${query}`,
    );
    return envelope.data;
  },
};
