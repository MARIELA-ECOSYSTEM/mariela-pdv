/**
 * Endpoints reais de caixa:
 *   GET  /api/v1/pdv/caixa/atual
 *   POST /api/v1/pdv/caixa/abertura
 */
import { PDV_API_PREFIX } from "@/config/pdv.config";
import { PdvApiClient } from "./client";
import type { PdvCaixaPort } from "@/services/ports";
import type { PdvCaixa } from "@/types/caixa";

export const caixaApi: PdvCaixaPort = {
  atual(): Promise<PdvCaixa | null> {
    return PdvApiClient.get<PdvCaixa | null>(`${PDV_API_PREFIX}/caixa/atual`);
  },
  abrir(valorAbertura: number): Promise<PdvCaixa> {
    return PdvApiClient.post<PdvCaixa>(`${PDV_API_PREFIX}/caixa/abertura`, { valorAbertura });
  },
};
