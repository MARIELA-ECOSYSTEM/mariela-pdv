import { describe, expect, it } from "vitest";
import {
  ajustarParcelas,
  encontrarAdquirente,
  parcelasPermitidas,
  suportaModalidade,
  tarifaConfigurada,
  valorParcela,
} from "./adquirente";
import type { PdvAdquirente } from "@/types/adquirente";

const A: PdvAdquirente = {
  id: "a",
  nome: "Adquirente A",
  modalidades: {
    debito: { tarifaPercentual: 1.39 },
    credito: {
      opcoes: [
        { parcelas: 1, tarifaPercentual: 3 },
        { parcelas: 2 },
        { parcelas: 3 },
        { parcelas: 6, tarifaPercentual: 6.5 },
        { parcelas: 10 },
      ],
    },
  },
};

const SEM_CREDITO: PdvAdquirente = {
  id: "b",
  nome: "Adquirente B",
  modalidades: { debito: { tarifaPercentual: null } },
};

describe("configuração da adquirente", () => {
  it("oferece apenas as parcelas configuradas (sem 1x–12x fixo)", () => {
    expect(parcelasPermitidas(A)).toEqual([1, 2, 3, 6, 10]);
    expect(parcelasPermitidas(A)).not.toContain(4);
    expect(parcelasPermitidas(SEM_CREDITO)).toEqual([]);
    expect(parcelasPermitidas(undefined)).toEqual([]);
  });

  it("reconhece modalidades disponíveis", () => {
    expect(suportaModalidade(A, "credito")).toBe(true);
    expect(suportaModalidade(SEM_CREDITO, "credito")).toBe(false);
    expect(suportaModalidade(SEM_CREDITO, "debito")).toBe(true);
  });

  it("ajusta as parcelas ao trocar de adquirente", () => {
    expect(ajustarParcelas(A, 6)).toBe(6);
    expect(ajustarParcelas(A, 4)).toBe(1);
    expect(ajustarParcelas(SEM_CREDITO, 3)).toBeUndefined();
  });

  it("encontra a adquirente escolhida", () => {
    expect(encontrarAdquirente([A, SEM_CREDITO], "b")?.nome).toBe("Adquirente B");
    expect(encontrarAdquirente([A], undefined)).toBeUndefined();
  });
});

describe("valor da parcela", () => {
  it("divide para apresentação ao operador", () => {
    expect(valorParcela(300, 6)).toBe(50);
    expect(valorParcela(299.9, 3)).toBe(99.97);
    expect(valorParcela(300, 1)).toBe(300);
    expect(valorParcela(0, 3)).toBe(0);
  });
});

describe("tarifa", () => {
  it("só existe quando a configuração informa", () => {
    expect(tarifaConfigurada(A, "credito", 300, 6)).toBe(19.5);
    expect(tarifaConfigurada(A, "credito", 300, 2)).toBeNull();
    expect(tarifaConfigurada(A, "debito", 300)).toBe(4.17);
    expect(tarifaConfigurada(SEM_CREDITO, "debito", 300)).toBeNull();
    expect(tarifaConfigurada(undefined, "debito", 300)).toBeNull();
  });
});
