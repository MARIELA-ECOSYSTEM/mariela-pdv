import { ArrowRight, Info, UserPlus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClienteBusca } from "@/components/pdv/cliente/ClienteBusca";
import type { PdvCliente } from "@/types/cliente";

/**
 * ETAPA 1 — CLIENTE. Seleção/pesquisa dedicada, reutilizando a busca única
 * (ClienteBusca). A venda para consumidor final continua permitida; o backend
 * segue sendo a autoridade das regras da venda.
 */
export function ClientePanel({
  cliente,
  onSelecionar,
  onRemover,
  onSeguirParaCarrinho,
}: {
  cliente: PdvCliente | null;
  onSelecionar: (cliente: PdvCliente) => void;
  onRemover: () => void;
  onSeguirParaCarrinho: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-baseline justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Cliente
        </p>
        <p className="text-xs text-muted-foreground">Opcional</p>
      </div>

      {cliente && (
        <div className="shrink-0 border-b border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <UserRound className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                Selecionado
              </p>
              <p className="truncate text-sm font-medium text-surface-foreground">{cliente.nome}</p>
              {cliente.telefone && (
                <p className="truncate text-xs text-muted-foreground">{cliente.telefone}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 text-xs text-muted-foreground hover:text-destructive"
              onClick={onRemover}
            >
              Remover
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden p-3">
        <ClienteBusca alturaLista="" onSelecionar={onSelecionar} />
      </div>

      <div className="shrink-0 space-y-2 border-t border-border bg-surface px-4 py-3">
        <Button variant="outline" size="sm" className="w-full text-xs" disabled>
          <UserPlus className="size-4" />
          Cadastrar novo cliente
        </Button>
        <p className="flex items-start gap-1.5 text-[0.7rem] leading-snug text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0" />O cadastro de clientes é feito no Backoffice.
          Enquanto isso, siga a venda como consumidor não identificado.
        </p>
      </div>

      <div className="shrink-0 border-t border-border p-4">
        <Button className="h-14 w-full text-base tracking-[0.12em]" onClick={onSeguirParaCarrinho}>
          {cliente ? "SEGUIR PARA O CARRINHO" : "SEGUIR SEM CLIENTE"}
          <ArrowRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}
