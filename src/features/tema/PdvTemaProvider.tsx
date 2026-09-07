import { createContext, useCallback, useContext, useEffect, useState } from "react";

type PdvTema = "claro" | "escuro";

const CHAVE_TEMA = "mariela-pdv.tema";

type PdvTemaContexto = {
  tema: PdvTema;
  alternarTema: () => void;
};

const Contexto = createContext<PdvTemaContexto | null>(null);

function aplicar(tema: PdvTema) {
  const root = document.documentElement;
  root.classList.toggle("dark", tema === "escuro");
  root.style.colorScheme = tema === "escuro" ? "dark" : "light";
}

export function PdvTemaProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<PdvTema>("claro");

  useEffect(() => {
    let inicial: PdvTema = "claro";
    try {
      const salvo = localStorage.getItem(CHAVE_TEMA);
      if (salvo === "claro" || salvo === "escuro") {
        inicial = salvo;
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        inicial = "escuro";
      }
    } catch {
      inicial = "claro";
    }
    setTema(inicial);
    aplicar(inicial);
  }, []);

  const alternarTema = useCallback(() => {
    setTema((atual) => {
      const proximo: PdvTema = atual === "escuro" ? "claro" : "escuro";
      aplicar(proximo);
      try {
        localStorage.setItem(CHAVE_TEMA, proximo);
      } catch {
        /* armazenamento indisponível */
      }
      return proximo;
    });
  }, []);

  return <Contexto.Provider value={{ tema, alternarTema }}>{children}</Contexto.Provider>;
}

export function usePdvTema(): PdvTemaContexto {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("usePdvTema deve ser usado dentro de PdvTemaProvider");
  }
  return contexto;
}
