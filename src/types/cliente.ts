/** Cliente da venda. O PDV não cadastra clientes nesta versão. */

export interface PdvCliente {
  id: string;
  nome: string;
  telefone?: string | undefined;
}
