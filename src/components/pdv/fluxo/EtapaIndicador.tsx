import { cn } from "@/lib/utils";

export type PdvEtapa = "carrinho" | "pagamento";

const ETAPAS: { chave: PdvEtapa; rotulo: string }[] = [
  { chave: "carrinho", rotulo: "Produtos" },
  { chave: "pagamento", rotulo: "Pagamento" },
];

/** Indicador discreto do fluxo: Produtos → Pagamento → Conferência. */
export function EtapaIndicador({ etapa, className }: { etapa: PdvEtapa; className?: string }) {
  return (
    <nav
      aria-label="Etapas da venda"
      className={cn(
        "flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-2",
        className,
      )}
    >
      {ETAPAS.map((e, indice) => {
        const ativa = e.chave === etapa;
        return (
          <div key={e.chave} className="flex items-center gap-2">
            {indice > 0 && <span className="text-xs text-muted-foreground">→</span>}
            <span
              aria-current={ativa ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-medium uppercase tracking-[0.14em]",
                ativa
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              <span className="opacity-80">{indice + 1}</span>
              {e.rotulo}
            </span>
          </div>
        );
      })}
      <span className="ml-auto text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
        3 Conferência
      </span>
    </nav>
  );
}
