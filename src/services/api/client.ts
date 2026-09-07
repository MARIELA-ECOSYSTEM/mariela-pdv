/**
 * PdvApiClient — camada HTTP própria do PDV.
 * Implementação independente do Backoffice: timeout, tratamento de erro
 * operacional, refresh com single-flight e um único retry.
 *
 * Nenhuma chamada real é executada nesta etapa: a base URL vem de VITE_API_URL
 * e as funções de domínio ainda não são invocadas pela interface.
 */
import type { PdvApiError } from "@/types/api";
import { PdvTokenStorage } from "@/lib/pdv-token-storage";

const BASE_URL = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "";
const TIMEOUT_MS = 15000;

export interface PdvRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Chave de idempotência (ex.: criação de venda). */
  idempotencyKey?: string;
  /** Uso interno do retry pós-refresh. */
  _retried?: boolean;
}

export class PdvHttpError extends Error implements PdvApiError {
  status?: number;
  code?: string;
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

/** Single-flight: um único refresh por vez, compartilhado entre chamadas. */
let refreshEmAndamento: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  if (refreshEmAndamento) return refreshEmAndamento;
  refreshEmAndamento = (async () => {
    const refresh = PdvTokenStorage.getRefreshToken();
    if (!refresh || !BASE_URL) return false;
    try {
      const res = await fetch(`${BASE_URL}/api/v1/pdv/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
      if (!data.accessToken) return false;
      PdvTokenStorage.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshEmAndamento = null;
    }
  })();
  return refreshEmAndamento;
}

export async function pdvRequest<T>(path: string, options: PdvRequestOptions = {}): Promise<T> {
  const { body, idempotencyKey, headers, _retried, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const token = PdvTokenStorage.getAccessToken();

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 401 && !_retried) {
      const renovou = await refreshToken();
      if (renovou) {
        return pdvRequest<T>(path, { ...options, _retried: true });
      }
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
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof PdvHttpError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
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
