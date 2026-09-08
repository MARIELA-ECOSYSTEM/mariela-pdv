/**
 * Fonte das adquirentes para a interface de pagamento.
 *
 * O endpoint oficial ainda não existe no mariela-backend, então este hook
 * entrega os dados temporários de desenvolvimento (claramente isolados em
 * src/data/dev.adquirentes.ts). Quando o contrato oficial existir, basta trocar
 * a origem por uma porta de dados — os componentes não mudam.
 */
import { useEffect, useState } from "react";
import { DEV_ADQUIRENTES } from "@/data/dev.adquirentes";
import type { RequestState } from "@/types/api";
import type { PdvAdquirente } from "@/types/adquirente";

export function useAdquirentes() {
  const [adquirentes, setAdquirentes] = useState<PdvAdquirente[]>([]);
  const [estado, setEstado] = useState<RequestState>("loading");

  useEffect(() => {
    // Substituir por pdvDataSource quando a API expor a configuração real.
    setAdquirentes(DEV_ADQUIRENTES);
    setEstado("success");
  }, []);

  return { adquirentes, estado };
}
