/**
 * Configuração do MARIELA PDV.
 *
 * VITE_API_URL       — URL base do mariela-backend (ex.: https://mariela-backend.onrender.com).
 *                      Sem barra final e SEM `/api/v1` — os prefixos `/api/v1/pdv/...`
 *                      já são adicionados pelo código (ver PDV_API_PREFIX). Documentado em .env.example.
 * VITE_PDV_DATA_SOURCE — "mock" (padrão em desenvolvimento) ou "api". Define qual adaptador é usado.
 *
 * Regra: NÃO existe fallback silencioso. Se a fonte for "api" e VITE_API_URL
 * estiver ausente, a aplicação falha de forma explícita em vez de voltar ao mock.
 *
 * Em PRODUÇÃO (`import.meta.env.PROD`, sinalizado pelo Vite em `vite build`
 * sem `--mode development`) a mesma regra é reforçada de forma ATIVA: um
 * build de produção nunca pode operar em mock por omissão/erro de
 * configuração — ver `validarConfiguracaoProducao` abaixo, chamada uma única
 * vez na inicialização (import.tsx/router), nunca em cada requisição.
 */

export type PdvDataSourceKind = "mock" | "api";

const rawBaseUrl = (import.meta.env["VITE_API_URL"] as string | undefined)?.trim() ?? "";

export const PDV_API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

const rawSource = (
  (import.meta.env["VITE_PDV_DATA_SOURCE"] as string | undefined)?.trim() ?? "mock"
).toLowerCase();

export const PDV_DATA_SOURCE: PdvDataSourceKind = rawSource === "api" ? "api" : "mock";

/**
 * Validação ativa de produção — chamada uma única vez na inicialização do
 * app (nunca por requisição). Em `import.meta.env.PROD`:
 *   - VITE_PDV_DATA_SOURCE precisa ser exatamente "api" (nunca cai em mock
 *     por omissão/erro de digitação, ao contrário do comportamento em dev);
 *   - VITE_API_URL precisa existir;
 *   - VITE_API_URL não pode conter o prefixo `/api/v1` (duplicaria o prefixo
 *     que o código já adiciona — ver PDV_API_PREFIX — e quebraria 100% das
 *     chamadas com 404).
 * Lança um erro explícito e operacionalmente compreensível — nunca mascara a
 * falha caindo silenciosamente em mock. Não expõe nenhum segredo (só nomes
 * de variável e a própria URL configurada, que já é pública por natureza).
 */
export function validarConfiguracaoProducao(): void {
  if (!import.meta.env.PROD) return;

  const problemas: string[] = [];
  if (PDV_DATA_SOURCE !== "api") {
    problemas.push(
      `VITE_PDV_DATA_SOURCE precisa ser "api" em produção (valor atual: "${rawSource}").`,
    );
  }
  if (!PDV_API_BASE_URL) {
    problemas.push("VITE_API_URL não está configurada.");
  } else if (/\/api\/v1\/?$/i.test(PDV_API_BASE_URL)) {
    problemas.push(
      `VITE_API_URL não deve conter "/api/v1" (valor atual: "${PDV_API_BASE_URL}") — o próprio código já adiciona esse prefixo. Use apenas a origem, ex.: "https://mariela-backend.onrender.com".`,
    );
  }

  if (problemas.length > 0) {
    throw new Error(
      `MARIELA PDV: configuração de produção inválida — o aplicativo não pode iniciar em MOCK por engano.\n` +
        problemas.map((p) => `  - ${p}`).join("\n"),
    );
  }
}

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
