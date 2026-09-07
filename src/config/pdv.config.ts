/**
 * Configuração do MARIELA PDV.
 *
 * VITE_API_URL       — URL base do mariela-backend (ex.: http://localhost:3000).
 *                      Sem barra final. Documentado em .env.example.
 * VITE_PDV_DATA_SOURCE — "mock" (padrão) ou "api". Define qual adaptador é usado.
 *
 * Regra: NÃO existe fallback silencioso. Se a fonte for "api" e VITE_API_URL
 * estiver ausente, a aplicação falha de forma explícita em vez de voltar ao mock.
 */

export type PdvDataSourceKind = "mock" | "api";

const rawBaseUrl = (import.meta.env["VITE_API_URL"] as string | undefined)?.trim() ?? "";

export const PDV_API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

const rawSource = (
  (import.meta.env["VITE_PDV_DATA_SOURCE"] as string | undefined)?.trim() ?? "mock"
).toLowerCase();

export const PDV_DATA_SOURCE: PdvDataSourceKind = rawSource === "api" ? "api" : "mock";

/** Timeout de rede das chamadas HTTP do PDV. */
export const PDV_REQUEST_TIMEOUT_MS = 15000;

/** Prefixo único dos endpoints do PDV no mariela-backend. */
export const PDV_API_PREFIX = "/api/v1/pdv";

export function assertApiConfigurada(): string {
  if (!PDV_API_BASE_URL) {
    throw new Error(
      "VITE_API_URL não está configurada. Defina a URL do mariela-backend antes de usar VITE_PDV_DATA_SOURCE=api.",
    );
  }
  return PDV_API_BASE_URL;
}
