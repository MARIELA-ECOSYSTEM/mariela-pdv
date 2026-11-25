/**
 * Formas de pagamento e adquirentes REAIS para a tela de pagamento, vindas da
 * porta de dados (GET /pdv/pagamentos/formas e /pdv/pagamentos/adquirentes).
 * Sem lista fixa e sem fallback: se a API falhar, a tela mostra o erro e a
 * opção de tentar de novo.
 *
 * As duas listas são independentes: falha nas adquirentes não impede vender em
 * dinheiro/PIX, e vice-versa.
 */
import { useCallback, useEffect, useState } from "react";
import { pdvDataSource } from "@/services/pdv-data-source";
import type { PdvPagamentosPort } from "@/services/ports";
import type { PdvAdquirente } from "@/types/adquirente";
import type { RequestState } from "@/types/api";

export interface ListaCarregada<T> {
  estado: RequestState;
  dados: T[];
}

export interface OpcoesPagamento {
  formas: ListaCarregada<string>;
  adquirentes: ListaCarregada<PdvAdquirente>;
}

export const OPCOES_CARREGANDO: OpcoesPagamento = {
  formas: { estado: "loading", dados: [] },
  adquirentes: { estado: "loading", dados: [] },
};

/** Carrega as duas listas em paralelo; a falha de uma não derruba a outra. */
export async function carregarOpcoesPagamento(porta: PdvPagamentosPort): Promise<OpcoesPagamento> {
  const [formas, adquirentes] = await Promise.allSettled([
    porta.listarFormas(),
    porta.listarAdquirentes(),
  ]);
  return {
    formas:
      formas.status === "fulfilled"
        ? { estado: "success", dados: formas.value ?? [] }
        : { estado: "error", dados: [] },
    adquirentes:
      adquirentes.status === "fulfilled"
        ? { estado: "success", dados: adquirentes.value ?? [] }
        : { estado: "error", dados: [] },
  };
}

export function useOpcoesPagamento(): OpcoesPagamento & { recarregar: () => void } {
  const [opcoes, setOpcoes] = useState<OpcoesPagamento>(OPCOES_CARREGANDO);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let ativo = true;
    setOpcoes(OPCOES_CARREGANDO);
    void carregarOpcoesPagamento(pdvDataSource.pagamentos).then((resultado) => {
      if (ativo) setOpcoes(resultado);
    });
    return () => {
      ativo = false;
    };
  }, [recarga]);

  const recarregar = useCallback(() => setRecarga((n) => n + 1), []);
  return { ...opcoes, recarregar };
}
