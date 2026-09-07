import { useCallback, useMemo, useState } from "react";
import type { PdvItemCarrinho } from "@/types/carrinho";

/** Carrinho 100% local — sem persistência em storage, banco ou backend. */
export function useCarrinho() {
  const [itens, setItens] = useState<PdvItemCarrinho[]>([]);

  const adicionar = useCallback((item: PdvItemCarrinho) => {
    setItens((atuais) => {
      const existente = atuais.find((i) => i.linhaId === item.linhaId);
      if (!existente) return [...atuais, item];
      return atuais.map((i) =>
        i.linhaId === item.linhaId ? { ...i, quantidade: i.quantidade + item.quantidade } : i,
      );
    });
  }, []);

  const remover = useCallback((linhaId: string) => {
    setItens((atuais) => atuais.filter((i) => i.linhaId !== linhaId));
  }, []);

  const alterarQuantidade = useCallback((linhaId: string, quantidade: number) => {
    setItens((atuais) =>
      atuais.flatMap((i) => {
        if (i.linhaId !== linhaId) return [i];
        if (quantidade <= 0) return [];
        const limite = i.estoqueDisponivel ?? quantidade;
        return [{ ...i, quantidade: Math.min(quantidade, limite) }];
      }),
    );
  }, []);

  const limpar = useCallback(() => setItens([]), []);

  const subtotal = useMemo(
    () => itens.reduce((total, i) => total + i.precoUnitario * i.quantidade, 0),
    [itens],
  );

  const quantidadeTotal = useMemo(
    () => itens.reduce((total, i) => total + i.quantidade, 0),
    [itens],
  );

  return { itens, adicionar, remover, alterarQuantidade, limpar, subtotal, quantidadeTotal };
}
