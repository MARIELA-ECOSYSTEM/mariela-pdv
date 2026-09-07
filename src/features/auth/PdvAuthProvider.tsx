import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PdvTokenStorage } from "@/lib/pdv-token-storage";
import type { PdvAuthStatus, PdvVendedor } from "@/types/auth";

/**
 * Autenticação exclusiva do MARIELA PDV.
 * Nada aqui é importado do Backoffice e o storage usa chaves próprias.
 * Nesta etapa a validação é apenas de apresentação (MOCK) — a integração real
 * será feita em auth.api.ts (POST /api/v1/pdv/auth/login).
 */

interface PdvAuthContextValue {
  status: PdvAuthStatus;
  vendedor: PdvVendedor | null;
  erro: string | null;
  entrar: (login: string, senha: string) => Promise<boolean>;
  sair: () => void;
}

const PdvAuthContext = createContext<PdvAuthContextValue | null>(null);

const VENDEDOR_KEY = "mariela-pdv.vendedor";

export function PdvAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PdvAuthStatus>("carregando");
  const [vendedor, setVendedor] = useState<PdvVendedor | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const token = PdvTokenStorage.getAccessToken();
    const bruto = typeof window === "undefined" ? null : window.localStorage.getItem(VENDEDOR_KEY);
    if (token && bruto) {
      try {
        setVendedor(JSON.parse(bruto) as PdvVendedor);
        setStatus("autenticado");
        return;
      } catch {
        PdvTokenStorage.clear();
      }
    }
    setStatus("deslogado");
  }, []);

  const entrar = useCallback(async (login: string, senha: string) => {
    setErro(null);
    setStatus("autenticando");
    // MOCK de apresentação — substituir por loginPdv() de services/api/auth.api.ts
    await new Promise((r) => setTimeout(r, 900));
    if (!login.trim() || senha.trim().length < 3) {
      setStatus("erro");
      setErro("Login ou senha incorretos. Confira e tente novamente.");
      return false;
    }
    const sessao: PdvVendedor = { id: "mock-vendedor", nome: login.trim(), login: login.trim() };
    PdvTokenStorage.setTokens("mock-access-token", "mock-refresh-token");
    window.localStorage.setItem(VENDEDOR_KEY, JSON.stringify(sessao));
    setVendedor(sessao);
    setStatus("autenticado");
    return true;
  }, []);

  const sair = useCallback(() => {
    PdvTokenStorage.clear();
    if (typeof window !== "undefined") window.localStorage.removeItem(VENDEDOR_KEY);
    setVendedor(null);
    setErro(null);
    setStatus("deslogado");
  }, []);

  const value = useMemo(
    () => ({ status, vendedor, erro, entrar, sair }),
    [status, vendedor, erro, entrar, sair],
  );

  return <PdvAuthContext.Provider value={value}>{children}</PdvAuthContext.Provider>;
}

export function usePdvAuth() {
  const ctx = useContext(PdvAuthContext);
  if (!ctx) throw new Error("usePdvAuth deve ser usado dentro de PdvAuthProvider");
  return ctx;
}
