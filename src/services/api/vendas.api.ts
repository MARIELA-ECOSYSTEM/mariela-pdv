/**
 * Endpoint real de vendas:
 *   POST /api/v1/pdv/vendas
 *
 * NÃO existe GET /api/v1/pdv/vendas/minhas.
 *
 * Idempotência: CriarVendaPdvDto exige `idempotencyKey` como campo
 * OBRIGATÓRIO do corpo (o backend não lê nenhum header de idempotência — só
 * `dados.idempotencyKey` em `vendas.service.ts`/`vendas.repository.ts`). O
 * header `Idempotency-Key` é mantido por documentação/observabilidade, mas
 * quem o backend realmente valida é o campo do corpo. A mesma chave é
 * reutilizada em retries da MESMA tentativa de venda (ver PdvVendaTentativa).
 */
import { PDV_API_PREFIX } from "@/config/pdv.config";
import { PdvApiClient } from "./client";
import type { PdvVendasPort } from "@/services/ports";
import type { PdvVendaCriada, PdvVendaPayload } from "@/types/venda";

export const vendasApi: PdvVendasPort = {
  criar(payload: PdvVendaPayload, idempotencyKey: string): Promise<PdvVendaCriada> {
    return PdvApiClient.post<PdvVendaCriada>(
      `${PDV_API_PREFIX}/vendas`,
      { ...payload, idempotencyKey },
      { idempotencyKey },
    );
  },
};
