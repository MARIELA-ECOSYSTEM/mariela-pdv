/** Contratos genéricos de transporte do MARIELA PDV. */

export type RequestState = "idle" | "loading" | "success" | "error";

export interface PdvApiError {
  /** Mensagem operacional, pronta para o vendedor. */
  message: string;
  status?: number | undefined;
  /** Código/identificador devolvido pela API, quando existir. */
  code?: string | undefined;
}
