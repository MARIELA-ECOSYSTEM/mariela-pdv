/** SIMULADO: porta de caixa falsa (sem backend). */
import { describe, expect, it, vi } from "vitest";
import type { PdvCaixaPort } from "@/services/ports";
import type { PdvCaixa } from "@/types/caixa";
import { consultarEstadoCaixa } from "./estado-caixa";

function porta(atual: () => Promise<PdvCaixa | null>): PdvCaixaPort {
  return { atual: vi.fn(atual), abrir: vi.fn() };
}

describe("consultarEstadoCaixa (GET /pdv/caixa/atual)", () => {
  it("caixa aberto", async () => {
    const p = porta(async () => ({ id: "c1", abertoEm: "2026-11-25T10:00:00Z", valorAbertura: 0 }));
    expect(await consultarEstadoCaixa(p)).toBe("aberto");
    expect(p.atual).toHaveBeenCalledTimes(1);
  });

  it("data null = nenhum caixa aberto", async () => {
    expect(await consultarEstadoCaixa(porta(async () => null))).toBe("fechado");
  });

  it("falha de rede = erro (a venda não pode seguir)", async () => {
    expect(await consultarEstadoCaixa(porta(async () => Promise.reject(new Error("rede"))))).toBe(
      "erro",
    );
  });

  it("reflete mudança feita no Backoffice durante a sessão: cada consulta lê o estado atual", async () => {
    const respostas: Array<PdvCaixa | null> = [
      null,
      { id: "c1", abertoEm: "2026-11-25T10:00:00Z", valorAbertura: 0 },
    ];
    const p = porta(async () => respostas.shift() ?? null);
    expect(await consultarEstadoCaixa(p)).toBe("fechado");
    expect(await consultarEstadoCaixa(p)).toBe("aberto");
    expect(await consultarEstadoCaixa(p)).toBe("fechado");
    expect(p.atual).toHaveBeenCalledTimes(3);
  });

  it("não abre caixa: só consulta", async () => {
    const p = porta(async () => null);
    await consultarEstadoCaixa(p);
    expect(p.abrir).not.toHaveBeenCalled();
  });
});
