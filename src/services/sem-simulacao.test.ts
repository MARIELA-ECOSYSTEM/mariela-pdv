/**
 * Garante que a tela de venda não depende de listas simuladas: dados de
 * demonstração (`src/data/*`) só podem ser importados pelo adaptador mock
 * (`src/services/mock/*`), que a validação de produção já proíbe.
 * Verificação estática do código-fonte (não executa a interface).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// O Vitest roda a partir da raiz do projeto.
const SRC = join(process.cwd(), "src");

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.(ts|tsx)$/.test(nome) ? [caminho] : [];
  });
}

describe("sem dependência de dados simulados", () => {
  const fontes = arquivos(SRC).map((caminho) => ({
    rel: relative(SRC, caminho).split(sep).join("/"),
    texto: readFileSync(caminho, "utf8"),
  }));

  it("nenhum arquivo fora do adaptador mock importa src/data", () => {
    const violacoes = fontes
      .filter((f) => !f.rel.startsWith("services/mock/") && !f.rel.startsWith("data/"))
      .filter((f) => /from\s+["']@\/data\//.test(f.texto))
      .map((f) => f.rel);
    expect(violacoes).toEqual([]);
  });

  it("os adquirentes simulados de desenvolvimento foram removidos", () => {
    expect(existsSync(join(SRC, "data", "dev.adquirentes.ts"))).toBe(false);
    expect(fontes.filter((f) => f.texto.includes("DEV_ADQUIRENTES")).map((f) => f.rel)).toEqual(
      // este próprio arquivo cita o nome no teste
      ["services/sem-simulacao.test.ts"],
    );
  });
});
