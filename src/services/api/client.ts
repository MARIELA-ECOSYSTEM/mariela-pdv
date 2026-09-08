/**
 * PdvApiClient — camada HTTP própria do MARIELA PDV.
 *
 * Independente do Backoffice: não importa apiClient, auth-context, use-auth,
 * TokenStorage nem session do Backoffice.
 *
 * Recursos: base URL por VITE_API_URL, timeout, erro tipado (PdvHttpError),
 * Bearer token, refresh com single-flight (um refresh por vez), retry único
 * após refresh e logout quando a sessão não pode ser renovada.
 *
 * Envelope: TODA resposta de sucesso do mariela-backend vem embrulhada em
 * `{ data: ... }` (listagens vêm em `{ data: [...], meta: {...} }`) — ver
 * `ResponseInterceptor` global do backend. Esse desembrulho é feito UMA ÚNICA
 * VEZ aqui: os serviços de API (`auth.api.ts`, `caixa.api.ts`, etc.) recebem
 * diretamente o conteúdo de `data`, nunca o envelope HTTP. Não desembrulhar
 * `.data` de novo em nenhum outro lugar.
 */
import { PDV_API_PREFIX, PDV_REQUEST_TIMEOUT_MS, assertApiConfigurada } from "@/config/pdv.config";
import { PdvTokenStorage } from "@/lib/pdv-token-storage";
import type { PdvApiError } from "@/types/api";

export interface PdvRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Chave de idempotência (ex.: criação de venda). */
  idempotencyKey?: string;
  /** Uso interno do retry pós-refresh. */
  _retried?: boolean;
}

export class PdvHttpError extends Error implements PdvApiError {
  status?: number | undefined;
  code?: string | undefined;
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "PdvHttpError";
    this.status = status;
    this.code = code;
  }
}

function mensagemOperacional(status: number): string {
  if (status === 401) return "Sua sessão expirou. Entre novamente para continuar.";
  if (status === 403) return "Você não tem permissão para esta operação.";
  if (status === 404) return "Não encontramos o que você buscou.";
  if (status === 409) return "Esta operação conflita com o estado atual.";
  if (status >= 500) return "O sistema está indisponível neste momento. Tente novamente.";
  return "Não foi possível concluir a operação.";
}

/** Assinantes avisados quando a sessão é perdida de forma irreversível. */
type SessaoExpiradaHandler = () => void;
const ouvintesSessaoExpirada = new Set<SessaoExpiradaHandler>();

export function onSessaoExpirada(handler: SessaoExpiradaHandler): () => void {
  ouvintesSessaoExpirada.add(handler);
  return () => ouvintesSessaoExpirada.delete(handler);
}

function encerrarSessao() {
  PdvTokenStorage.clear();
  ouvintesSessaoExpirada.forEach((h) => h());
}

/** Single-flight: um único refresh por vez, compartilhado entre chamadas concorrentes. */
let refreshEmAndamento: Promise<boolean> | null = null;

export function _resetRefreshState() {
  refreshEmAndamento = null;
}

async function renovarSessao(): Promise<boolean> {
  if (refreshEmAndamento) return refreshEmAndamento;
  refreshEmAndamento = (async () => {
    const refresh = PdvTokenStorage.getRefreshToken();
    if (!refresh) return false;
    try {
      const res = await fetch(`${assertApiConfigurada()}${PDV_API_PREFIX}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) return false;
      // Resposta real: { data: { accessToken, refreshToken, expiresIn, vendedor } }.
      const corpo = (await res.json()) as { data?: { accessToken?: string; refreshToken?: string } };
      const dados = corpo.data;
      if (!dados?.accessToken) return false;
      PdvTokenStorage.setTokens(dados.accessToken, dados.refreshToken);
      return true;
    } catch {
      return false;
    }
  })();
  try {
    return await refreshEmAndamento;
  } finally {
    refreshEmAndamento = null;
  }
}

export async function pdvRequest<T>(path: string, options: PdvRequestOptions = {}): Promise<T> {
  const baseUrl = assertApiConfigurada();
  const { body, idempotencyKey, headers, _retried, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PDV_REQUEST_TIMEOUT_MS);

  const token = PdvTokenStorage.getAccessToken();

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    if (res.status === 401 && !_retried) {
      const renovou = await renovarSessao();
      if (renovou) {
        // Retry único, reaproveitando a MESMA idempotencyKey da tentativa.
        return pdvRequest<T>(path, { ...options, _retried: true });
      }
      encerrarSessao();
    }

    if (!res.ok) {
      let code: string | undefined;
      try {
        const data = (await res.json()) as { code?: string };
        code = data?.code;
      } catch {
        /* resposta sem corpo JSON */
      }
      throw new PdvHttpError(mensagemOperacional(res.status), res.status, code);
    }

    if (res.status === 204) return undefined as T;
    // Desembrulha o envelope { data } aplicado pelo backend a toda resposta
    // de sucesso (ver nota no topo do arquivo). Listagens já vêm como
    // { data: [...], meta }, então `corpo.data` também resolve para o array.
    const corpo = (await res.json()) as { data: T };
    return corpo.data;
  } catch (error) {
    if (error instanceof PdvHttpError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new PdvHttpError("A operação demorou demais. Tente novamente.");
    }
    throw new PdvHttpError("Não foi possível falar com o servidor. Verifique a conexão.");
  } finally {
    clearTimeout(timer);
  }
}

export const PdvApiClient = {
  get: <T>(path: string, options?: PdvRequestOptions) =>
    pdvRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: PdvRequestOptions) =>
    pdvRequest<T>(path, { ...options, method: "POST", body }),
};
