/**
 * Estado do caixa a partir do endpoint existente GET /api/v1/pdv/caixa/atual
 * (`null` = nenhum caixa aberto). Sem polling, timer ou cache: é consultado
 * ao abrir o PDV, quando a vendedora pede ("Verificar novamente") e logo
 * antes de abrir a conferência da venda — o caixa pode ter sido aberto ou
 * fechado no Backoffice durante a sessão.
 */
import type { PdvCaixaPort } from "@/services/ports";

export type EstadoCaixaConsultado = "aberto" | "fechado" | "erro";

export async function consultarEstadoCaixa(porta: PdvCaixaPort): Promise<EstadoCaixaConsultado> {
  try {
    return (await porta.atual()) ? "aberto" : "fechado";
  } catch {
    return "erro";
  }
}
