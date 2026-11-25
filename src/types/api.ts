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
 * Nota sobre o envelope do backend: TODA resposta de sucesso vem embrulhada
 * em `{ data: ... }` (listagens em `{ data: [...], meta: {...} }`) — ver
 * `ResponseInterceptor` do mariela-backend. O desembrulho é feito uma única
 * vez em `services/api/client.ts`; nenhum tipo de envelope é necessário aqui.
 */

/** Parâmetros de busca aceitos pelas listagens (`busca`, confirmado nos DTOs de produtos e clientes do backend). */
export interface PdvBuscaParams {
  busca?: string | undefined;
  /** Página (1…). Hoje só usada no catálogo (`ListarProdutosPdvQueryDto`). */
  page?: number | undefined;
  /** Itens por página — o backend do PDV aceita até 60. */
  limit?: number | undefined;
}

/** Uma página de listagem, a partir de `{ data, meta: { total, page, totalPages } }`. */
export interface PdvPagina<T> {
  itens: T[];
  pagina: number;
  totalPaginas: number;
  total: number;
}
