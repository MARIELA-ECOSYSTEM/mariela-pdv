/**
 * Autenticação exclusiva do PDV (independente do Backoffice).
 * Endpoints reais: POST /auth/login, POST /auth/refresh, POST /auth/logout, GET /auth/me
 * (todos sob /api/v1/pdv).
 */

/** Vendedor autenticado, conforme GET /api/v1/pdv/auth/me (VendedorPublicoPdv). */
export interface PdvVendedor {
  id: string;
  codigo: string;
  nome: string;
  foto: string | null;
  ativo: boolean;
}

/**
 * `login` é o valor digitado pela vendedora na tela (rótulo "Login"); o
 * backend só aceita código de vendedor como credencial (`{ codigo, senha }`,
 * `LoginPdvDto`) — a tradução de nome de campo é feita em `auth.api.ts`, não
 * aqui, para não acoplar a UI ao nome do campo do backend.
 */
export interface PdvLoginPayload {
  login: string;
  senha: string;
}

/** Resposta de POST /auth/login (ResultadoAutenticacaoPdv), já sem o envelope { data }. */
export interface PdvLoginResposta {
  accessToken: string;
  refreshToken?: string | undefined;
  expiresIn?: number | undefined;
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
