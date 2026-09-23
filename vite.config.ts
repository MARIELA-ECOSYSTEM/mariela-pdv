// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/**
 * Fase 52.1 — build estático para Tauri, isolado do build web por uma
 * variável de ambiente de PROCESSO (nunca `VITE_*`, para não vazar para o
 * bundle nem para `import.meta.env`): `BUILD_TARGET=desktop bun run build:desktop`.
 * Mesma estratégia já comprovada no MARIELA Backoffice (Fase 22).
 *
 * Deliberadamente NÃO usamos `--mode desktop`: `mode` continua "production"
 * nos dois builds, então `import.meta.env.PROD` (checado em
 * `src/config/pdv.config.ts::validarConfiguracaoProducao`) continua
 * protegendo o build desktop exatamente como já protege o build web, sem
 * duplicar/generalizar essa checagem. Ao contrário do Backoffice, não há
 * aqui um plugin Vite adicional de proteção de ambiente: a proteção do PDV
 * já é só `validarConfiguracaoProducao()`, e ela não muda nesta fase.
 *
 * Sem Nitro (`nitro: false`): nenhum servidor é empacotado — o Tauri carrega
 * arquivos estáticos diretamente. `tanstackStart.spa` é o modo oficial do
 * próprio TanStack Start para isso: pré-renderiza o shell da aplicação em
 * HTML estático (hidratado no cliente) em vez de depender de SSR por
 * requisição — só é seguro porque não há `createServerFn`/`loader` nas rotas
 * do PDV (confirmado nas auditorias anteriores), então nenhum dado real
 * depende do servidor.
 */
const isDesktopBuild = process.env["BUILD_TARGET"] === "desktop";

export default defineConfig({
  ...(isDesktopBuild ? { nitro: false } : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ...(isDesktopBuild
      ? {
          spa: {
            enabled: true,
            // Default outputPath ("/_shell") é pensado para uma regra de
            // rewrite num host estático; o Tauri só serve o arquivo que
            // estiver na raiz de frontendDist, então o shell precisa ser
            // fisicamente index.html.
            prerender: { enabled: true, outputPath: "/index" },
          },
        }
      : {}),
  },
});
