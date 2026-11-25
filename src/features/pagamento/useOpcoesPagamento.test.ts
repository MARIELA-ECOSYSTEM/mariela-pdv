/**
 * SIMULADO: testa `carregarOpcoesPagamento` (o núcleo do hook) com uma porta
 * falsa. O hook em si só repassa esse resultado para o estado do React — não
 * há biblioteca de teste de componentes no projeto.
 */
import { describe, expect, it, vi } from "vitest";
import type { PdvPagamentosPort } from "@/services/ports";
import type { PdvAdquirente } from "@/types/adquirente";
import { OPCOES_CARREGANDO, carregarOpcoesPagamento } from "./useOpcoesPagamento";

const ADQ: PdvAdquirente = {
  id: "adq-real-1",
  nome: "Stone",
  modalidades: { debito: { tarifaPercentual: 1.2 }, credito: null },
};

function porta(over: Partial<PdvPagamentosPort> = {}): PdvPagamentosPort {
  return {
    listarFormas: vi.fn(async () => ["Dinheiro", "PIX"]),
    listarAdquirentes: vi.fn(async () => [ADQ]),
    ...over,
  };
}

describe("carregamento das opções de pagamento", () => {
  it("estado inicial é carregando, sem dados", () => {
    expect(OPCOES_CARREGANDO).toEqual({
      formas: { estado: "loading", dados: [] },
      adquirentes: { estado: "loading", dados: [] },
    });
  });

  it("carrega formas e adquirentes reais da porta", async () => {
    const p = porta();
    const opcoes = await carregarOpcoesPagamento(p);

    expect(opcoes.formas).toEqual({ estado: "success", dados: ["Dinheiro", "PIX"] });
    expect(opcoes.adquirentes).toEqual({ estado: "success", dados: [ADQ] });
    expect(p.listarFormas).toHaveBeenCalledTimes(1);
    expect(p.listarAdquirentes).toHaveBeenCalledTimes(1);
  });

  it("listas vazias ficam vazias com sucesso (a tela mostra a orientação)", async () => {
    const opcoes = await carregarOpcoesPagamento(
      porta({ listarFormas: async () => [], listarAdquirentes: async () => [] }),
    );
    expect(opcoes.formas).toEqual({ estado: "success", dados: [] });
    expect(opcoes.adquirentes).toEqual({ estado: "success", dados: [] });
  });

  it("falha nas adquirentes não derruba as formas (dinheiro/PIX continuam possíveis)", async () => {
    const opcoes = await carregarOpcoesPagamento(
      porta({ listarAdquirentes: async () => Promise.reject(new Error("rede")) }),
    );
    expect(opcoes.formas.estado).toBe("success");
    expect(opcoes.adquirentes).toEqual({ estado: "error", dados: [] });
  });

  it("falha nas formas vira erro, sem lista de reserva", async () => {
    const opcoes = await carregarOpcoesPagamento(
      porta({ listarFormas: async () => Promise.reject(new Error("500")) }),
    );
    expect(opcoes.formas).toEqual({ estado: "error", dados: [] });
    expect(opcoes.adquirentes.estado).toBe("success");
  });
});
