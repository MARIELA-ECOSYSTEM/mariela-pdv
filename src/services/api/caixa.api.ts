/**
 * Endpoints reais de caixa:
 *   GET  /api/v1/pdv/caixa/atual     — { data: null } quando nenhum caixa está aberto.
 *   POST /api/v1/pdv/caixa/abertura  — corpo { valorInicial, observacao? } (AbrirCaixaPdvDto).
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
    // O DTO do backend chama o campo `valorInicial`, não `valorAbertura`.
    return PdvApiClient.post<PdvCaixa>(`${PDV_API_PREFIX}/caixa/abertura`, {
      valorInicial: valorAbertura,
    });
  },
};
