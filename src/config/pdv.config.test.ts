import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `PDV_DATA_SOURCE`/`PDV_API_BASE_URL` são calculados uma única vez, na
 * importação do módulo — por isso cada cenário precisa de `resetModules` +
 * reimportação dinâmica, depois de `stubEnv` já ter o valor certo.
 */
async function carregarConfig() {
  vi.resetModules();
  return import("./pdv.config");
}

describe("validarConfiguracaoProducao", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("em desenvolvimento (PROD=false), nunca lança — mock continua permitido", async () => {
    vi.stubEnv("PROD", false);
    vi.stubEnv("VITE_PDV_DATA_SOURCE", "");
    vi.stubEnv("VITE_API_URL", "");
    const { validarConfiguracaoProducao } = await carregarConfig();

    expect(() => validarConfiguracaoProducao()).not.toThrow();
  });

  it("produção sem VITE_PDV_DATA_SOURCE (cai no padrão mock) falha explicitamente", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_PDV_DATA_SOURCE", "");
    vi.stubEnv("VITE_API_URL", "https://mariela-backend.onrender.com");
    const { validarConfiguracaoProducao } = await carregarConfig();

    expect(() => validarConfiguracaoProducao()).toThrow(/VITE_PDV_DATA_SOURCE/);
  });

  it("produção com VITE_PDV_DATA_SOURCE=mock falha explicitamente (nunca mock em produção)", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_PDV_DATA_SOURCE", "mock");
    vi.stubEnv("VITE_API_URL", "https://mariela-backend.onrender.com");
    const { validarConfiguracaoProducao } = await carregarConfig();

    expect(() => validarConfiguracaoProducao()).toThrow(/VITE_PDV_DATA_SOURCE/);
  });

  it("produção sem VITE_API_URL falha explicitamente", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_PDV_DATA_SOURCE", "api");
    vi.stubEnv("VITE_API_URL", "");
    const { validarConfiguracaoProducao } = await carregarConfig();

    expect(() => validarConfiguracaoProducao()).toThrow(/VITE_API_URL/);
  });

  it("produção com VITE_API_URL contendo /api/v1 falha (duplicaria o prefixo — P3)", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_PDV_DATA_SOURCE", "api");
    vi.stubEnv("VITE_API_URL", "https://mariela-backend.onrender.com/api/v1");
    const { validarConfiguracaoProducao } = await carregarConfig();

    expect(() => validarConfiguracaoProducao()).toThrow(/api\/v1/);
  });

  it("produção com configuração válida (api + URL sem /api/v1) não lança", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_PDV_DATA_SOURCE", "api");
    vi.stubEnv("VITE_API_URL", "https://mariela-backend.onrender.com");
    const { validarConfiguracaoProducao } = await carregarConfig();

    expect(() => validarConfiguracaoProducao()).not.toThrow();
  });
});
