/**
 * Endpoints reais de configuração de pagamento (somente leitura):
 *   GET /api/v1/pdv/pagamentos/formas        → { data: string[] }
 *   GET /api/v1/pdv/pagamentos/adquirentes   → { data: AdquirentePdv[] }
 * (PdvApiClient já desembrulha `.data`.)
 *
 * As formas são os rótulos livres de `configuracoes.formasPagamento` — os
 * mesmos contra os quais `POST /pdv/vendas` valida `pagamentos[].forma`. As
 * adquirentes já vêm no formato de `PdvAdquirente` (`AdquirentePdv`,
 * `pdv-pagamentos.types.ts`): `{ id, nome, modalidades: { debito, credito } }`.
 * Nenhuma tradução é necessária.
 */
import { PDV_API_PREFIX } from "@/config/pdv.config";
import { PdvApiClient } from "./client";
import type { PdvPagamentosPort } from "@/services/ports";
import type { PdvAdquirente } from "@/types/adquirente";

export const pagamentosApi: PdvPagamentosPort = {
  listarFormas(): Promise<string[]> {
    return PdvApiClient.get<string[]>(`${PDV_API_PREFIX}/pagamentos/formas`);
  },
  listarAdquirentes(): Promise<PdvAdquirente[]> {
    return PdvApiClient.get<PdvAdquirente[]>(`${PDV_API_PREFIX}/pagamentos/adquirentes`);
  },
};
