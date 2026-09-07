import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarielaMarca } from "@/components/pdv/MarielaMarca";
import { usePdvAuth } from "@/features/auth/PdvAuthProvider";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — MARIELA PDV" },
      {
        name: "description",
        content: "Acesso do vendedor ao ponto de venda MARIELA em loja física.",
      },
      { property: "og:title", content: "Entrar — MARIELA PDV" },
      {
        property: "og:description",
        content: "Acesso do vendedor ao ponto de venda MARIELA em loja física.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { status, erro, entrar } = usePdvAuth();
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");

  useEffect(() => {
    if (status === "autenticado") void navigate({ to: "/" });
  }, [status, navigate]);

  const carregando = status === "autenticando";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (carregando) return;
    const ok = await entrar(login, senha);
    if (ok) void navigate({ to: "/" });
  }

  return (
    <main className="flex min-h-screen">
      <section className="gradient-brand relative hidden flex-1 flex-col justify-between p-14 lg:flex">
        <MarielaMarca invertido tamanho="lg" />
        <div className="max-w-md">
          <p className="brand-title text-3xl leading-snug text-primary-foreground">
            Moda feminina, atendimento impecável
          </p>
          <p className="mt-4 text-sm text-primary-foreground/75">
            Ponto de venda da loja física. Rápido no balcão, elegante como a marca.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary-foreground/50">
          Ecossistema Mariela
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <MarielaMarca tamanho="lg" />
          </div>

          <h1 className="mt-10 text-2xl font-semibold text-foreground">Acesso do vendedor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre com seus dados para abrir a operação de venda.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login">Login</Label>
              <Input
                id="login"
                autoFocus
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="seu.login"
                className="h-12"
                disabled={carregando}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="h-12"
                disabled={carregando}
              />
            </div>

            {erro && status === "erro" && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {erro}
              </p>
            )}

            <Button type="submit" className="h-12 w-full text-base" disabled={carregando}>
              {carregando ? <Loader2 className="size-4 animate-spin" /> : null}
              {carregando ? "Entrando…" : "ENTRAR"}
            </Button>
          </form>

          {status === "carregando" && (
            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Verificando sessão…
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
