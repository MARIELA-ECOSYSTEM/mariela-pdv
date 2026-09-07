/** Autenticação exclusiva do PDV (independente do Backoffice). */

export interface PdvVendedor {
  id: string;
  nome: string;
  login?: string;
}

export interface PdvLoginPayload {
  login: string;
  senha: string;
}

export interface PdvSessao {
  vendedor: PdvVendedor;
}

export type PdvAuthStatus = "carregando" | "deslogado" | "autenticando" | "autenticado" | "erro";
