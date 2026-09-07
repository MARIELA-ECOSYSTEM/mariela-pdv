/** Adaptador de API REAL do MARIELA PDV (mariela-backend via HTTP). */
import type { PdvDataSource } from "@/services/ports";
import { authApi } from "./auth.api";
import { caixaApi } from "./caixa.api";
import { clientesApi } from "./clientes.api";
import { produtosApi } from "./produtos.api";
import { vendasApi } from "./vendas.api";

export const apiDataSource: PdvDataSource = {
  kind: "api",
  auth: authApi,
  caixa: caixaApi,
  produtos: produtosApi,
  clientes: clientesApi,
  vendas: vendasApi,
};
