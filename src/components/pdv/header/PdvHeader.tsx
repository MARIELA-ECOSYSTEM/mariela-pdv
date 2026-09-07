import { LogOut, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarielaMarca } from "@/components/pdv/MarielaMarca";
import type { PdvCaixaEstado } from "@/types/caixa";

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
  caixa,
  onSair,
}: {
  vendedorNome: string;
  caixa: PdvCaixaEstado;
  onSair: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-6 border-b border-border bg-card px-6 py-3">
      <MarielaMarca />

      <div className="flex items-center gap-5">
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

        <div className="text-right leading-tight">
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
            Vendedor
          </p>
          <p className="text-sm font-semibold text-foreground">{vendedorNome}</p>
        </div>

        <Button variant="ghost" size="sm" onClick={onSair} className="text-muted-foreground">
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </header>
  );
}
