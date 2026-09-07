import { PdvApiClient } from "./client";
import type { PdvVendaPayload } from "@/types/venda";

/**
 * POST /api/v1/pdv/vendas
 * A mesma idempotencyKey deve ser reutilizada em retries da mesma tentativa.
 */
export function criarVenda(payload: PdvVendaPayload, idempotencyKey: string) {
  return PdvApiClient.post<{ id: string; status: string }>(
    "/api/v1/pdv/vendas",
    payload,
    { idempotencyKey },
  );
}
