/** Contratos genéricos de transporte do MARIELA PDV. */

export type RequestState = "idle" | "loading" | "success" | "error";

export interface PdvApiError {
  /** Mensagem operacional, pronta para o vendedor. */
  message: string;
  status?: number | undefined;
  /** Código/identificador devolvido pela API, quando existir. */
  code?: string | undefined;
}

/**
 * Envelope de listagem do backend.
 * Confirmado no contrato de GET /api/v1/pdv/clientes: { data: [...], meta: {...} }.
 * O conteúdo exato de `meta` ainda não foi especificado — por isso permanece
 * aberto, sem campos inventados.
 */
export interface PdvListaEnvelope<T> {
  data: T[];
  meta?: Record<string, unknown> | undefined;
}

/** Parâmetros de busca aceitos pelas listagens. Nome do parâmetro a confirmar no backend. */
export interface PdvBuscaParams {
  busca?: string | undefined;
}
