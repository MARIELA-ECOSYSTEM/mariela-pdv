/**
 * Endpoint real de vendas:
 *   POST /api/v1/pdv/vendas
 *
 * NÃO existe GET /api/v1/pdv/vendas/minhas.
 *
 * Idempotência: CriarVendaPdvDto exige `idempotencyKey` como campo
 * OBRIGATÓRIO do corpo (o backend não lê nenhum header de idempotência — só
 * `dados.idempotencyKey` em `vendas.service.ts`/`vendas.repository.ts`). O
 * header `Idempotency-Key` é mantido por documentação/observabilidade, mas
 * quem o backend realmente valida é o campo do corpo. A mesma chave é
 * reutilizada em retries da MESMA tentativa de venda (ver PdvVendaTentativa).
 *
 * Desconto: o backend usa `tipo: "percentual" | "valor"` (`TIPOS_DESCONTO`,
 * `vendas.constants.ts`) — o frontend usa `"percentual" | "monetario"`
 * (`PdvDescontoTipo`). `paraDescontoBackend` traduz o nome, nunca o valor:
 * a intenção do operador (ex.: "10%") é enviada tal como digitada, para o
 * backend recalcular contra o preço real dele — nunca um R$ pré-calculado
 * aqui, que poderia divergir se o preço mudou entre a busca e a venda.
 */
import { PDV_API_PREFIX } from "@/config/pdv.config";
import { PdvApiClient } from "./client";
import type { PdvVendasPort } from "@/services/ports";
import type { PdvDesconto } from "@/types/desconto";
import type { PdvVendaCriada, PdvVendaPayload } from "@/types/venda";

function paraDescontoBackend(desconto: PdvDesconto | undefined) {
  if (!desconto || desconto.valor <= 0) return undefined;
  return { tipo: desconto.tipo === "percentual" ? "percentual" : "valor", valor: desconto.valor };
}

export const vendasApi: PdvVendasPort = {
  criar(payload: PdvVendaPayload, idempotencyKey: string): Promise<PdvVendaCriada> {
    const corpo = {
      ...payload,
      idempotencyKey,
      descontoVenda: paraDescontoBackend(payload.descontoVenda),
      itens: payload.itens.map((item) => ({
        ...item,
        desconto: paraDescontoBackend(item.desconto),
      })),
    };
    return PdvApiClient.post<PdvVendaCriada>(`${PDV_API_PREFIX}/vendas`, corpo, { idempotencyKey });
  },
};
