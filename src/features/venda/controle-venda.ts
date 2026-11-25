/**
 * Ciclo de vida da tentativa de venda e da sua idempotencyKey.
 *
 * Módulo puro (sem React) para ser testável e para que a regra fique num
 * único lugar. Reaproveita a idempotência que JÁ existe no backend
 * (`VendasService.criar`): mesma chave + mesma venda → devolve a venda já
 * registrada; mesma chave + itens diferentes → 409 "idempotencyKey já foi
 * usada para registrar uma venda diferente". Nada de fila, banco local ou
 * sincronização.
 *
 * Regras da chave:
 *  1. A chave nasce no primeiro envio e é REUTILIZADA em todo envio seguinte
 *     — repetição, timeout, falha de rede, erro do servidor, voltar ao
 *     carrinho e até edição do carrinho. Nunca é trocada automaticamente.
 *     Reutilizar é sempre seguro: se nada foi criado, o backend cria; se a
 *     MESMA venda foi criada, devolve-a; se o carrinho mudou depois de uma
 *     venda criada, o backend recusa (conflito) em vez de duplicar.
 *  2. A chave só é renovada em dois casos:
 *     - venda CONCLUÍDA e vendedora inicia "Nova venda" (resultado resolvido);
 *     - decisão consciente da vendedora de registrar os itens atuais como
 *       nova venda depois de um CONFLITO (a anterior comprovadamente existe).
 *  3. Enquanto um envio está em andamento, qualquer novo envio é ignorado
 *     (duplo clique, Ctrl+Enter, "Tentar novamente" repetido).
 */
import { PdvHttpError } from "@/services/api/client";
import type { PdvItemCarrinho } from "@/types/carrinho";
import type { PdvVendaCriada, PdvVendaPayload, PdvVendaTentativa } from "@/types/venda";

export const MENSAGEM_RESULTADO_DESCONHECIDO =
  "Não recebemos a confirmação do sistema. A venda PODE ter sido registrada. " +
  "Toque em “Tentar novamente”: o sistema reconhece esta mesma venda e não registra em dobro.";

export const MENSAGEM_CONFLITO =
  "A tentativa anterior desta venda JÁ FOI registrada, com outros itens. " +
  "Os itens que estão na tela agora ainda NÃO foram vendidos. Confira no Backoffice antes de continuar.";

export type FalhaVenda = "erro" | "desconhecida" | "conflito";

/**
 * Decide o que uma falha significa para a venda:
 *  - sem status (timeout/rede/resposta ilegível) ou 5xx → `desconhecida`;
 *  - 409 com o texto de reuso de chave do backend → `conflito` (o backend
 *    não tem código específico, só o texto — ver `client.ts`);
 *  - outro 409 (ex.: concorrência de escrita esgotada) → `desconhecida`, por
 *    cautela;
 *  - demais 4xx → `erro`: o backend respondeu recusando, nada foi criado;
 *  - erro que não veio da camada HTTP (ex.: configuração ausente antes do
 *    envio) → `erro`.
 */
export function classificarFalhaVenda(error: unknown): { tipo: FalhaVenda; mensagem: string } {
  if (!(error instanceof PdvHttpError)) {
    return {
      tipo: "erro",
      mensagem:
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível concluir a venda.",
    };
  }
  const { status } = error;
  if (status === 409 && /idempotencykey j[aá] foi usada/i.test(error.message)) {
    return { tipo: "conflito", mensagem: MENSAGEM_CONFLITO };
  }
  if (status === undefined || status >= 500 || status === 409) {
    return { tipo: "desconhecida", mensagem: MENSAGEM_RESULTADO_DESCONHECIDO };
  }
  return { tipo: "erro", mensagem: error.message || "Não foi possível concluir a venda." };
}

export interface ResumoVenda {
  itens: PdvItemCarrinho[];
  total: number;
}

export interface ControleVenda {
  /** Estado atual (null = nenhuma tentativa; a próxima gera chave nova). */
  readonly tentativa: PdvVendaTentativa | null;
  /**
   * Envia a venda. Devolve `null` quando o envio é ignorado (já há um em
   * andamento, a venda já foi concluída ou há conflito não resolvido).
   */
  finalizar(payload: PdvVendaPayload, resumo: ResumoVenda): Promise<void> | null;
  /** Fecha o resultado e volta à edição — a chave e a pendência são mantidas. */
  voltarAoCarrinho(): void;
  /** Depois de um conflito: registrar os itens atuais como NOVA venda (chave nova). */
  registrarComoNovaVenda(): boolean;
  /**
   * Venda concluída (ou nenhuma pendência) → limpa para a próxima venda
   * (chave nova). Recusado enquanto houver resultado desconhecido/conflito.
   */
  iniciarNovaVenda(): boolean;
}

export function criarControleVenda(deps: {
  enviar: (payload: PdvVendaPayload, idempotencyKey: string) => Promise<PdvVendaCriada>;
  gerarChave: () => string;
  aoMudar?: (tentativa: PdvVendaTentativa | null) => void;
}): ControleVenda {
  let atual: PdvVendaTentativa | null = null;

  function definir(proxima: PdvVendaTentativa | null) {
    atual = proxima;
    deps.aoMudar?.(proxima);
  }

  async function executar(payload: PdvVendaPayload, chave: string) {
    try {
      const venda = await deps.enviar(payload, chave);
      if (atual?.idempotencyKey !== chave) return;
      definir({
        ...atual,
        estado: "concluida",
        mensagemErro: undefined,
        pendencia: undefined,
        vendaId: venda.id,
        codigo: venda.codigo,
        valorFinal: venda.valorFinal,
      });
    } catch (error) {
      if (atual?.idempotencyKey !== chave) return;
      const falha = classificarFalhaVenda(error);
      definir({
        ...atual,
        estado: falha.tipo,
        mensagemErro: falha.mensagem,
        // Uma recusa (`erro`) depois de um resultado desconhecido NÃO resolve a
        // dúvida (ex.: "estoque insuficiente" porque a 1ª venda já baixou o
        // estoque) — a pendência anterior é mantida.
        pendencia: falha.tipo === "erro" ? atual.pendencia : falha.tipo,
      });
    }
  }

  return {
    get tentativa() {
      return atual;
    },

    finalizar(payload, resumo) {
      if (atual?.estado === "processando" || atual?.estado === "concluida") return null;
      // Em conflito, reenviar com a mesma chave só repetiria a recusa: exige a
      // decisão consciente de `registrarComoNovaVenda`.
      if (atual?.pendencia === "conflito") return null;
      const chave = atual?.idempotencyKey ?? deps.gerarChave();
      definir({
        idempotencyKey: chave,
        estado: "processando",
        itens: resumo.itens,
        total: resumo.total,
        pendencia: atual?.pendencia,
      });
      return executar(payload, chave);
    },

    voltarAoCarrinho() {
      if (!atual || atual.estado === "processando" || atual.estado === "concluida") return;
      definir({ ...atual, estado: "rascunho", mensagemErro: undefined });
    },

    registrarComoNovaVenda() {
      if (atual?.pendencia !== "conflito" || atual.estado === "processando") return false;
      definir(null);
      return true;
    },

    iniciarNovaVenda() {
      if (atual?.estado === "processando") return false;
      // Com resultado pendente de verificação (e sem conclusão), descartar a
      // chave poderia gerar uma segunda venda — não é permitido por aqui.
      if (atual && atual.estado !== "concluida" && atual.pendencia) return false;
      definir(null);
      return true;
    },
  };
}
