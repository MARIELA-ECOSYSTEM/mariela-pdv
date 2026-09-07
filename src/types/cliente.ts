/**
 * Cliente no contrato do PDV (GET /api/v1/pdv/clientes).
 * O contrato do PDV expõe somente estes campos — nenhum campo administrativo
 * do Backoffice deve ser assumido aqui. O PDV não cadastra clientes:
 * não existe POST /api/v1/pdv/clientes.
 */

export interface PdvCliente {
  id: string;
  codigo?: string | undefined;
  nome: string;
  /** URL da foto do cliente, quando houver. */
  foto?: string | null | undefined;
  telefone?: string | undefined;
}
