/**
 * Seleção do adaptador de dados do MARIELA PDV.
 *
 * VITE_PDV_DATA_SOURCE=mock (padrão) → dados locais de apresentação
 * VITE_PDV_DATA_SOURCE=api           → mariela-backend via HTTP (VITE_API_URL)
 *
 * Sem fallback silencioso: com a fonte "api" configurada, qualquer falha é
 * propagada como erro; a interface nunca volta ao mock automaticamente.
 */
import { PDV_DATA_SOURCE } from "@/config/pdv.config";
import { apiDataSource } from "@/services/api";
import { mockDataSource } from "@/services/mock";
import type { PdvDataSource } from "@/services/ports";

export const pdvDataSource: PdvDataSource =
  PDV_DATA_SOURCE === "api" ? apiDataSource : mockDataSource;

export const usandoMock = pdvDataSource.kind === "mock";
