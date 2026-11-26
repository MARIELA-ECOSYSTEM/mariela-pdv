/**
 * Situação do pagamento exibida no rodapé do painel — SÓ apresentação.
 *
 * Reaproveita o que já existe (totais de `calcularTotaisPagamento`, o problema
 * de `validarPagamentos` e o estado do caixa); não cria regra nem cálculo. O
 * motivo detalhado de um bloqueio continua no aviso embaixo do botão — aqui
 * só se diz, sem repetir o texto, em que estado o pagamento está. "Pagamento
 * completo" só aparece quando nada impede a conferência.
 */
import { formatMoeda } from "@/lib/format";
import type { PdvPagamentoTotais } from "@/lib/venda-totais";

export type TipoSituacaoPagamento = "falta" | "ajustar" | "bloqueado" | "fiado" | "completo";

export interface SituacaoPagamento {
  tipo: TipoSituacaoPagamento;
  texto: string;
  detalhe?: string | undefined;
}

export function situacaoPagamento({
  quantidadePagamentos,
  totais,
  problema,
  bloqueado,
  clienteNome,
}: {
  quantidadePagamentos: number;
  totais: Pick<PdvPagamentoTotais, "pendente" | "excedente" | "fiado" | "recebido">;
  /** Resultado de `validarPagamentos` (null = nenhum problema). */
  problema: string | null;
  /** Caixa não está aberto. */
  bloqueado: boolean;
  clienteNome?: string | undefined;
}): SituacaoPagamento | null {
  if (quantidadePagamentos === 0) return null;

  // 1) Insuficiente: único lugar do painel onde "falta receber" aparece.
  if (totais.pendente > 0.001) {
    return {
      tipo: "falta",
      texto: `Falta receber ${formatMoeda(totais.pendente)}`,
      detalhe: "Adicione outro pagamento ou lance a diferença no Fiado.",
    };
  }

  // 2) Inválido/incompleto: valor acima do total ou dado faltando (maquininha,
  //    parcelas, cliente do Fiado, forma ambígua). O motivo está no aviso abaixo.
  if (totais.excedente > 0.001 || problema) {
    return { tipo: "ajustar", texto: "Pagamento a ajustar", detalhe: "Veja o aviso abaixo." };
  }

  // 3) Valores corretos, mas o caixa não permite concluir (aviso abaixo).
  if (bloqueado) {
    return { tipo: "bloqueado", texto: "Venda bloqueada", detalhe: "Veja o aviso abaixo." };
  }

  // 4) Válido com saldo no Fiado.
  if (totais.fiado > 0.001) {
    return {
      tipo: "fiado",
      texto: `Fiado: ${formatMoeda(totais.fiado)} a receber${clienteNome ? ` de ${clienteNome}` : ""}`,
    };
  }

  // 5) Válido e pago.
  if (totais.recebido > 0.001) return { tipo: "completo", texto: "Pagamento completo" };
  return null;
}
