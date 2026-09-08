import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PdvCliente } from "@/types/cliente";

/**
 * Módulo CLIENTE — informação contextual da venda, compacta e desacoplada do
 * carrinho. A seleção continua usando o ClienteDialog já existente e a venda
 * sem cliente permanece possível (o backend é a autoridade da regra).
 */
export function ClienteResumo({
  cliente,
  onAbrirCliente,
  onRemoverCliente,
  somenteLeitura = false,
  className,
}: {
  cliente: PdvCliente | null;
  onAbrirCliente: () => void;
  onRemoverCliente?: () => void;
  somenteLeitura?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn("border-b border-border bg-surface px-4 py-2.5", className)}
      aria-label="Cliente da venda"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <UserRound className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
            Cliente
          </p>
          {cliente ? (
            <>
              <p className="truncate text-sm font-medium text-surface-foreground">{cliente.nome}</p>
              {cliente.telefone && (
                <p className="truncate text-xs text-muted-foreground">
                  WhatsApp: {cliente.telefone}
                </p>
              )}
            </>
          ) : (
            <p className="truncate text-sm font-medium text-surface-foreground">
              Consumidor não identificado
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onAbrirCliente}>
            {cliente ? "Alterar" : "Selecionar"}
          </Button>
          {cliente && !somenteLeitura && onRemoverCliente && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-destructive"
              onClick={onRemoverCliente}
            >
              Remover
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
