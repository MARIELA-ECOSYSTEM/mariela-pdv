import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { validarConfiguracaoProducao } from "@/config/pdv.config";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Falha explícita na inicialização se um build de produção estiver
  // configurado para operar em mock (ausência/erro de VITE_PDV_DATA_SOURCE/
  // VITE_API_URL) — nunca cai em mock silenciosamente. Sem efeito em
  // desenvolvimento (import.meta.env.PROD é false).
  validarConfiguracaoProducao();

  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
