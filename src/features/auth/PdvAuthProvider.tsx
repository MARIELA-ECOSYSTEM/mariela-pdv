import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PdvTokenStorage } from "@/lib/pdv-token-storage";
import { onSessaoExpirada } from "@/services/api/client";
import { pdvDataSource } from "@/services/pdv-data-source";
import type { PdvAuthStatus, PdvVendedor } from "@/types/auth";

/**
 * Autenticação exclusiva do MARIELA PDV.
 *
 * - Nada é importado do Backoffice (sem auth-context, use-auth, session).
 * - Tokens em chaves próprias: mariela-pdv.accessToken / mariela-pdv.refreshToken.
 * - Toda a autenticação passa pela porta pdvDataSource.auth, então trocar o
 *   mock pela API real (POST /auth/login, POST /auth/logout, GET /auth/me)
 *   é apenas mudar VITE_PDV_DATA_SOURCE — nenhum componente muda.
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

function lerVendedorLocal(): PdvVendedor | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = window.localStorage.getItem(VENDEDOR_KEY);
    return bruto ? (JSON.parse(bruto) as PdvVendedor) : null;
  } catch {
    return null;
  }
}

function gravarVendedorLocal(vendedor: PdvVendedor | null) {
  if (typeof window === "undefined") return;
  if (vendedor) window.localStorage.setItem(VENDEDOR_KEY, JSON.stringify(vendedor));
  else window.localStorage.removeItem(VENDEDOR_KEY);
}

export function PdvAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PdvAuthStatus>("carregando");
  const [vendedor, setVendedor] = useState<PdvVendedor | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const limparSessaoLocal = useCallback(() => {
    PdvTokenStorage.clear();
    gravarVendedorLocal(null);
    setVendedor(null);
  }, []);

  // Restaura a sessão: token presente + GET /auth/me (ou equivalente do mock).
  useEffect(() => {
    let ativo = true;
    if (!PdvTokenStorage.getAccessToken()) {
      setStatus("deslogado");
      return;
    }
    void (async () => {
      try {
        const atual = await pdvDataSource.auth.me();
        if (!ativo) return;
        const restaurado = lerVendedorLocal() ?? atual;
        setVendedor(restaurado);
        gravarVendedorLocal(restaurado);
        setStatus("autenticado");
      } catch {
        if (!ativo) return;
        limparSessaoLocal();
        setStatus("deslogado");
      }
    })();
    return () => {
      ativo = false;
    };
  }, [limparSessaoLocal]);

  // Logout automático quando o refresh não consegue renovar a sessão.
  useEffect(
    () =>
      onSessaoExpirada(() => {
        limparSessaoLocal();
        setErro("Sua sessão expirou. Entre novamente para continuar.");
        setStatus("deslogado");
      }),
    [limparSessaoLocal],
  );

  const entrar = useCallback(async (login: string, senha: string) => {
    setErro(null);
    setStatus("autenticando");
    try {
      const autenticado = await pdvDataSource.auth.login({ login, senha });
      gravarVendedorLocal(autenticado);
      setVendedor(autenticado);
      setStatus("autenticado");
      return true;
    } catch (error) {
      setStatus("erro");
      setErro(
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível entrar. Tente novamente.",
      );
      return false;
    }
  }, []);

  const sair = useCallback(() => {
    void pdvDataSource.auth.logout().catch(() => undefined);
    limparSessaoLocal();
    setErro(null);
    setStatus("deslogado");
  }, [limparSessaoLocal]);

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
