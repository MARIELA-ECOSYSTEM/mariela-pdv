import { PdvApiClient } from "./client";
import type { PdvCaixa } from "@/types/caixa";

/** GET /api/v1/pdv/caixa/atual */
export function obterCaixaAtual() {
  return PdvApiClient.get<PdvCaixa | null>("/api/v1/pdv/caixa/atual");
}

/** POST /api/v1/pdv/caixa/abertura */
export function abrirCaixa(valorAbertura: number) {
  return PdvApiClient.post<PdvCaixa>("/api/v1/pdv/caixa/abertura", { valorAbertura });
}
