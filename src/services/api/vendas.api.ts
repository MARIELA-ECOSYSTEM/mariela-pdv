/**
 * Endpoint real de vendas:
 *   POST /api/v1/pdv/vendas
 *
 * NÃO existe GET /api/v1/pdv/vendas/minhas.
 *
 * Idempotência: enviada no header `Idempotency-Key`. A mesma chave é
 * reutilizada em retries da MESMA tentativa de venda. Caso o backend adote
 * outro mecanismo (campo no corpo, header próprio), ajustar somente aqui.
 */
import { PDV_API_PREFIX } from "@/config/pdv.config";
import { PdvApiClient } from "./client";
import type { PdvVendasPort } from "@/services/ports";
import type { PdvVendaCriada, PdvVendaPayload } from "@/types/venda";

export const vendasApi: PdvVendasPort = {
  criar(payload: PdvVendaPayload, idempotencyKey: string): Promise<PdvVendaCriada> {
    return PdvApiClient.post<PdvVendaCriada>(`${PDV_API_PREFIX}/vendas`, payload, {
      idempotencyKey,
    });
  },
};
