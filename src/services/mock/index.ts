/**
 * Adaptador MOCK do MARIELA PDV.
 * Reproduz exatamente as mesmas portas do adaptador de API real, com dados
 * locais de src/data/mock.pdv.ts. Serve apenas para operar a interface antes
 * da integração com o mariela-backend.
 *
 * Nenhum comportamento aqui deve ser copiado para o adaptador real: o backend
 * é a autoridade sobre preço, estoque, caixa, venda e autenticação.
 */
import { MOCK_CLIENTES, MOCK_PRODUTOS } from "@/data/mock.pdv";
import { PdvTokenStorage } from "@/lib/pdv-token-storage";
import { PdvHttpError } from "@/services/api/client";
import type { PdvDataSource } from "@/services/ports";
import type { PdvBuscaParams } from "@/types/api";
import type { PdvLoginPayload, PdvVendedor } from "@/types/auth";
import type { PdvCaixa } from "@/types/caixa";
import type { PdvCliente } from "@/types/cliente";
import type { PdvProduto } from "@/types/produto";
import type { PdvVendaCriada, PdvVendaPayload } from "@/types/venda";

function espera<T>(valor: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms));
}

function contemTermo(texto: string | undefined | null, termo: string): boolean {
  return (texto ?? "").toLowerCase().includes(termo);
}

let caixaMock: PdvCaixa | null = null;

export const mockDataSource: PdvDataSource = {
  kind: "mock",

  auth: {
    async login(payload: PdvLoginPayload): Promise<PdvVendedor> {
      await espera(null, 900);
      if (!payload.login.trim() || payload.senha.trim().length < 3) {
        throw new PdvHttpError("Login ou senha incorretos. Confira e tente novamente.", 401);
      }
      const vendedor: PdvVendedor = {
        id: "mock-vendedor",
        codigo: payload.login.trim(),
        nome: payload.login.trim(),
        foto: null,
        ativo: true,
      };
      PdvTokenStorage.setTokens("mock-access-token", "mock-refresh-token");
      return vendedor;
    },
    async logout(): Promise<void> {
      PdvTokenStorage.clear();
      caixaMock = null;
    },
    async me(): Promise<PdvVendedor> {
      if (!PdvTokenStorage.getAccessToken()) {
        throw new PdvHttpError("Sua sessão expirou. Entre novamente para continuar.", 401);
      }
      return { id: "mock-vendedor", codigo: "VEN-0001", nome: "Vendedor", foto: null, ativo: true };
    },
  },

  caixa: {
    atual(): Promise<PdvCaixa | null> {
      return espera(caixaMock, 700);
    },
    async abrir(valorAbertura: number): Promise<PdvCaixa> {
      caixaMock = {
        id: "mock-caixa",
        abertoEm: new Date().toISOString(),
        valorAbertura,
      };
      return espera(caixaMock, 900);
    },
  },

  produtos: {
    listar(params?: PdvBuscaParams): Promise<PdvProduto[]> {
      const termo = (params?.busca ?? "").trim().toLowerCase();
      const lista = termo
        ? MOCK_PRODUTOS.filter((p) => contemTermo(p.nome, termo) || contemTermo(p.codigo, termo))
        : MOCK_PRODUTOS;
      return espera(lista, 600);
    },
    async obter(id: string): Promise<PdvProduto> {
      const produto = MOCK_PRODUTOS.find((p) => p.id === id);
      if (!produto) throw new PdvHttpError("Não encontramos o que você buscou.", 404);
      return espera(produto, 300);
    },
  },

  clientes: {
    listar(params?: PdvBuscaParams): Promise<PdvCliente[]> {
      const termo = (params?.busca ?? "").trim().toLowerCase();
      const digitos = termo.replace(/\D/g, "");
      const lista = MOCK_CLIENTES.filter(
        (c) =>
          !termo ||
          contemTermo(c.nome, termo) ||
          contemTermo(c.codigo, termo) ||
          (digitos.length > 0 && (c.telefone ?? "").replace(/\D/g, "").includes(digitos)),
      );
      return espera(lista, 350);
    },
  },

  vendas: {
    async criar(_payload: PdvVendaPayload, idempotencyKey: string): Promise<PdvVendaCriada> {
      // A chave é apenas ecoada: quem valida idempotência é o backend real.
      return espera({ id: `mock-venda-${idempotencyKey.slice(0, 8)}`, status: "concluida" }, 1200);
    },
  },
};
