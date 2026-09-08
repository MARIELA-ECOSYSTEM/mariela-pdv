import { describe, expect, it } from "vitest";
import { MOCK_PRODUTOS } from "@/data/mock.pdv";
import { mockDataSource } from "./index";

describe("modelo de produto do mock (produto → variante/cor → tamanho)", () => {
  it("todo produto tem ao menos uma variante, e toda variante tem tamanhos com id próprio", () => {
    for (const produto of MOCK_PRODUTOS) {
      expect(produto.variantes.length).toBeGreaterThan(0);
      for (const variante of produto.variantes) {
        expect(variante.tamanhos.length).toBeGreaterThan(0);
        for (const tamanho of variante.tamanhos) {
          // O id do tamanho é uma entidade própria — nunca igual ao id da variante
          // (isso seria sinal de achatamento cor+tamanho num único id).
          expect(tamanho.id).not.toBe(variante.id);
        }
      }
    }
  });

  it("ids de variante e tamanho são únicos dentro do produto", () => {
    for (const produto of MOCK_PRODUTOS) {
      const idsVariante = produto.variantes.map((v) => v.id);
      expect(new Set(idsVariante).size).toBe(idsVariante.length);

      const idsTamanho = produto.variantes.flatMap((v) => v.tamanhos.map((t) => t.id));
      expect(new Set(idsTamanho).size).toBe(idsTamanho.length);
    }
  });

  it("mockDataSource.produtos.listar/obter devolvem a mesma estrutura aninhada, sem fabricar ids", async () => {
    const lista = await mockDataSource.produtos.listar();
    const produto = lista[0]!;
    const variante = produto.variantes[0]!;
    const tamanho = variante.tamanhos[0]!;

    const obtido = await mockDataSource.produtos.obter(produto.id);

    expect(obtido.variantes[0]?.id).toBe(variante.id);
    expect(obtido.variantes[0]?.tamanhos[0]?.id).toBe(tamanho.id);
  });
});
