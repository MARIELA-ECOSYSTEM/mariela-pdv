/** SIMULADO (jsdom): destino do foco ao fechar o diálogo do produto (F-04). */
import { afterEach, describe, expect, it } from "vitest";
import { destinoDoFocoAoFecharProduto } from "./foco-produto";

function montar() {
  const card = document.createElement("button");
  const busca = document.createElement("input");
  document.body.append(card, busca);
  return { card, busca };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("destinoDoFocoAoFecharProduto (F-04)", () => {
  it("cancelar/fechar: volta ao card que abriu o diálogo", () => {
    const { card, busca } = montar();
    expect(destinoDoFocoAoFecharProduto({ adicionou: false, origem: card, busca })).toBe(card);
  });

  it("adicionar: vai para a busca (comportamento do E.3 preservado)", () => {
    const { card, busca } = montar();
    expect(destinoDoFocoAoFecharProduto({ adicionou: true, origem: card, busca })).toBe(busca);
  });

  it("card não está mais na tela (ex.: busca mudou): vai para a busca", () => {
    const { card, busca } = montar();
    card.remove();
    expect(destinoDoFocoAoFecharProduto({ adicionou: false, origem: card, busca })).toBe(busca);
  });

  it("card desabilitado (ex.: ficou sem estoque): vai para a busca", () => {
    const { card, busca } = montar();
    card.disabled = true;
    expect(destinoDoFocoAoFecharProduto({ adicionou: false, origem: card, busca })).toBe(busca);
  });

  it("sem card de origem: vai para a busca", () => {
    const { busca } = montar();
    expect(destinoDoFocoAoFecharProduto({ adicionou: false, origem: null, busca })).toBe(busca);
  });

  it("nada utilizável (busca desabilitada e sem card): null", () => {
    const { busca } = montar();
    busca.disabled = true;
    expect(destinoDoFocoAoFecharProduto({ adicionou: true, origem: null, busca })).toBeNull();
  });
});
