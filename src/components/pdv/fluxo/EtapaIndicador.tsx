import { cn } from "@/lib/utils";

export type PdvEtapa = "cliente" | "carrinho" | "pagamento";

const ETAPAS: { chave: PdvEtapa; rotulo: string }[] = [
  { chave: "cliente", rotulo: "Cliente" },
  { chave: "carrinho", rotulo: "Carrinho" },
  { chave: "pagamento", rotulo: "Pagamento" },
];

/**
 * Stepper do fluxo: Cliente → Carrinho → Pagamento → (Conferência).
 * Navegar entre etapas apenas troca a etapa visível: nenhum dado da venda é
 * recriado ou perdido.
 */
export function EtapaIndicador({
  etapa,
  onIrPara,
  className,
}: {
  etapa: PdvEtapa;
  onIrPara?: (etapa: PdvEtapa) => void;
  className?: string;
}) {
  const indiceAtual = ETAPAS.findIndex((e) => e.chave === etapa);

  return (
    <nav
      aria-label="Etapas da venda"
      className={cn(
        "flex shrink-0 items-center gap-1.5 border-b border-border bg-card px-3 py-2",
        className,
      )}
    >
      {ETAPAS.map((e, indice) => {
        const ativa = e.chave === etapa;
        const concluida = indice < indiceAtual;
        return (
          <div key={e.chave} className="flex min-w-0 items-center gap-1.5">
            {indice > 0 && <span aria-hidden className="h-px w-3 bg-border" />}
            <button
              type="button"
              aria-current={ativa ? "step" : undefined}
              onClick={() => onIrPara?.(e.chave)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-medium uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                ativa
                  ? "bg-primary text-primary-foreground"
                  : concluida
                    ? "bg-accent text-accent-foreground hover:bg-secondary"
                    : "bg-secondary text-secondary-foreground hover:bg-accent",
              )}
            >
              <span className="tabular-nums opacity-80">0{indice + 1}</span>
              <span className="truncate">{e.rotulo}</span>
            </button>
          </div>
        );
      })}
      <span className="ml-auto shrink-0 pl-1 text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
        04 Conferência
      </span>
    </nav>
  );
}
