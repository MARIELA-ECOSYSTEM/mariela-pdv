import { useEffect, useState } from "react";
import { Search, UserRound, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { pdvDataSource } from "@/services/pdv-data-source";
import type { PdvCliente } from "@/types/cliente";
import type { RequestState } from "@/types/api";

/**
 * Busca de clientes — única implementação da pesquisa (GET /api/v1/pdv/clientes
 * pela porta de dados). Reutilizada pelo ClienteDialog e pela etapa Cliente,
 * para não duplicar lógica.
 */
export function ClienteBusca({
  ativo = true,
  autoFocus = false,
  alturaLista = "max-h-72",
  onSelecionar,
}: {
  ativo?: boolean;
  autoFocus?: boolean;
  alturaLista?: string;
  onSelecionar: (cliente: PdvCliente) => void;
}) {
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState<RequestState>("idle");
  const [resultados, setResultados] = useState<PdvCliente[]>([]);

  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    setEstado("loading");
    void (async () => {
      try {
        const lista = await pdvDataSource.clientes.listar({ busca });
        if (!vivo) return;
        setResultados(lista);
        setEstado("success");
      } catch {
        if (!vivo) return;
        setResultados([]);
        setEstado("error");
      }
    })();
    return () => {
      vivo = false;
    };
  }, [ativo, busca]);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div>
        <Label htmlFor="cliente-busca" className="sr-only">
          Buscar cliente por nome ou telefone
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="cliente-busca"
            autoFocus={autoFocus}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome ou telefone"
            className="h-11 pl-10"
          />
        </div>
      </div>

      <div className={cn("min-h-0 flex-1 space-y-2 overflow-y-auto pr-1", alturaLista)}>
        {estado === "loading" &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}

        {estado === "error" && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <TriangleAlert className="size-6 text-destructive" />
            <p className="text-sm">Não foi possível buscar os clientes agora.</p>
          </div>
        )}

        {estado === "success" && resultados.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum cliente encontrado para esta busca.
          </p>
        )}

        {estado === "success" &&
          resultados.map((cliente) => (
            <button
              key={cliente.id}
              type="button"
              onClick={() => onSelecionar(cliente)}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <UserRound className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{cliente.nome}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {cliente.telefone ?? "Sem telefone"}
                </span>
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}
