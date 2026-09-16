import { CircleDot, History, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarielaMarca } from "@/components/pdv/MarielaMarca";
import { EtapaIndicador, type PdvEtapa } from "@/components/pdv/fluxo/EtapaIndicador";
import { usePdvTema } from "@/features/tema/PdvTemaProvider";
import type { PdvCaixaEstado } from "@/types/caixa";
import type { PdvCliente } from "@/types/cliente";

const rotuloCaixa: Record<PdvCaixaEstado, string> = {
  carregando: "Verificando caixa…",
  fechado: "Caixa fechado",
  abrindo: "Abrindo caixa…",
  aberto: "Caixa aberto",
  conflito: "Caixa em conflito",
  erro: "Caixa indisponível",
};

export function PdvHeader({
  vendedorNome,
  cliente,
  caixa,
  etapa,
  onIrParaEtapa,
  onAlterarCliente,
  onAbrirMinhasVendas,
  onSair,
}: {
  vendedorNome: string;
  cliente: PdvCliente | null;
  caixa: PdvCaixaEstado;
  etapa: PdvEtapa;
  onIrParaEtapa: (etapa: PdvEtapa) => void;
  onAlterarCliente: () => void;
  onAbrirMinhasVendas: () => void;
  onSair: () => void;
}) {
  const { tema, alternarTema } = usePdvTema();

  return (
    <header className="shrink-0 border-b border-border bg-card">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 lg:px-6">
        <MarielaMarca />

        <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
          <CircleDot
            className={
              caixa === "aberto"
                ? "size-4 text-success"
                : caixa === "abrindo" || caixa === "carregando"
                  ? "size-4 animate-pulse text-primary"
                  : "size-4 text-destructive"
            }
          />
          <span className="text-sm font-medium text-surface-foreground">{rotuloCaixa[caixa]}</span>
        </div>

        <div className="ml-auto flex min-w-0 items-center">
          <div className="min-w-0 px-4 text-right leading-tight">
            <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
              Vendedor · sessão atual
            </p>
            <p className="truncate text-sm font-semibold text-foreground">{vendedorNome}</p>
          </div>

          <div className="flex min-w-0 items-center gap-2 border-l border-border px-4">
            <span className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground sm:flex">
              <UserRound className="size-4" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                Cliente · venda atual
              </p>
              <p className="max-w-48 truncate text-sm font-semibold text-foreground">
                {cliente?.nome ?? "Não selecionado"}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onAlterarCliente}>
              {cliente ? "Alterar" : "Selecionar"}
            </Button>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={onAbrirMinhasVendas}>
          <History className="size-4" />
          Minhas vendas
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={alternarTema}
          className="text-muted-foreground"
          aria-label={tema === "escuro" ? "Usar tema claro" : "Usar tema escuro"}
          title={tema === "escuro" ? "Usar tema claro" : "Usar tema escuro"}
        >
          {tema === "escuro" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <Button variant="ghost" size="sm" onClick={onSair} className="text-muted-foreground">
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>

      <EtapaIndicador
        etapa={etapa}
        onIrPara={onIrParaEtapa}
        className="justify-center border-t border-b-0 px-4 py-2"
      />
    </header>
  );
}
