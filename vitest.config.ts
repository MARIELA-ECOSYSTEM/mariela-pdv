import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    // Configuração usada apenas nos testes: nenhuma chamada real é feita.
    env: {
      VITE_API_URL: "http://backend.test",
      VITE_PDV_DATA_SOURCE: "api",
    },
  },
});
