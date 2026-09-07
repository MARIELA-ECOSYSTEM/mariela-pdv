/**
 * Autenticação exclusiva do PDV (independente do Backoffice).
 * Endpoints reais: POST /auth/login, POST /auth/refresh, POST /auth/logout, GET /auth/me
 * (todos sob /api/v1/pdv).
 */

/** Vendedor autenticado, conforme GET /api/v1/pdv/auth/me. */
export interface PdvVendedor {
  id: string;
  nome: string;
  login?: string | undefined;
}

export interface PdvLoginPayload {
  login: string;
  senha: string;
}

/** Resposta de POST /auth/login. Nomes exatos dos campos a confirmar no backend. */
export interface PdvLoginResposta {
  accessToken: string;
  refreshToken?: string | undefined;
  vendedor?: PdvVendedor | undefined;
}

/** Resposta de POST /auth/refresh. */
export interface PdvRefreshResposta {
  accessToken: string;
  refreshToken?: string | undefined;
}

export interface PdvSessao {
  vendedor: PdvVendedor;
}

export type PdvAuthStatus = "carregando" | "deslogado" | "autenticando" | "autenticado" | "erro";
