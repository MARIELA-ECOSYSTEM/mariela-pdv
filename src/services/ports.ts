/**
 * Portas (interfaces) da camada de dados do MARIELA PDV.
 *
 * A interface consome SOMENTE estas portas. Existem duas implementações:
 *   - mock  (src/services/mock/*)  — dados locais de apresentação
 *   - api   (src/services/api/*)   — HTTP contra o mariela-backend
 *
 * A troca é feita por configuração (VITE_PDV_DATA_SOURCE), sem reescrever
 * componentes de interface. Nenhuma porta declara operação que não exista no
 * backend real (não há criar cliente, listar variantes ou listar minhas vendas).
 */
import type { PdvBuscaParams } from "@/types/api";
import type { PdvLoginPayload, PdvVendedor } from "@/types/auth";
import type { PdvCaixa } from "@/types/caixa";
import type { PdvCliente } from "@/types/cliente";
import type { PdvProduto } from "@/types/produto";
import type { PdvVendaCriada, PdvVendaPayload } from "@/types/venda";

export interface PdvAuthPort {
  /** POST /api/v1/pdv/auth/login */
  login(payload: PdvLoginPayload): Promise<PdvVendedor>;
  /** POST /api/v1/pdv/auth/logout */
  logout(): Promise<void>;
  /** GET /api/v1/pdv/auth/me */
  me(): Promise<PdvVendedor>;
}

export interface PdvCaixaPort {
  /** GET /api/v1/pdv/caixa/atual — null quando não há caixa aberto. */
  atual(): Promise<PdvCaixa | null>;
  /** POST /api/v1/pdv/caixa/abertura */
  abrir(valorAbertura: number): Promise<PdvCaixa>;
}

export interface PdvProdutosPort {
  /** GET /api/v1/pdv/produtos */
  listar(params?: PdvBuscaParams): Promise<PdvProduto[]>;
  /** GET /api/v1/pdv/produtos/:id */
  obter(id: string): Promise<PdvProduto>;
}

export interface PdvClientesPort {
  /** GET /api/v1/pdv/clientes — envelope { data, meta }. */
  listar(params?: PdvBuscaParams): Promise<PdvCliente[]>;
}

export interface PdvVendasPort {
  /**
   * POST /api/v1/pdv/vendas
   * A mesma idempotencyKey deve ser reutilizada em retries da MESMA tentativa.
   */
  criar(payload: PdvVendaPayload, idempotencyKey: string): Promise<PdvVendaCriada>;
}

export interface PdvDataSource {
  readonly kind: "mock" | "api";
  auth: PdvAuthPort;
  caixa: PdvCaixaPort;
  produtos: PdvProdutosPort;
  clientes: PdvClientesPort;
  vendas: PdvVendasPort;
}
