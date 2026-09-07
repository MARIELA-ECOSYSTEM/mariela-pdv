import { useEffect } from "react";

export interface AtalhoPdv {
  /** Ex.: "/", "Escape", "F2". */
  tecla: string;
  ctrl?: boolean;
  acao: () => void;
}

/**
 * Base para atalhos de teclado do PDV.
 * Ignora eventos originados em campos de texto, exceto Escape.
 */
export function useAtalhos(atalhos: AtalhoPdv[], ativo = true) {
  useEffect(() => {
    if (!ativo) return;
    function onKeyDown(event: KeyboardEvent) {
      const alvo = event.target as HTMLElement | null;
      const digitando =
        !!alvo &&
        (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.isContentEditable);

      for (const atalho of atalhos) {
        if (atalho.tecla !== event.key) continue;
        if (!!atalho.ctrl !== (event.ctrlKey || event.metaKey)) continue;
        if (digitando && event.key !== "Escape" && !atalho.ctrl) continue;
        event.preventDefault();
        atalho.acao();
        return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [atalhos, ativo]);
}
