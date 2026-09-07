import { useEffect, useState } from "react";
import { Search, UserRound, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MOCK_CLIENTES } from "@/data/mock.pdv";
import type { PdvCliente } from "@/types/cliente";
import type { RequestState } from "@/types/api";

export function ClienteDialog({
  aberto,
  onFechar,
  onSelecionar,
}: {
  aberto: boolean;
  onFechar: () => void;
  onSelecionar: (cliente: PdvCliente) => void;
}) {
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState<RequestState>("idle");
  const [resultados, setResultados] = useState<PdvCliente[]>([]);

  // MOCK de apresentação — substituir por listarClientes() (GET /api/v1/pdv/clientes)
  useEffect(() => {
    if (!aberto) return;
    setEstado("loading");
    const t = setTimeout(() => {
      const termo = busca.trim().toLowerCase();
      setResultados(
        MOCK_CLIENTES.filter(
          (c) =>
            !termo ||
            c.nome.toLowerCase().includes(termo) ||
            (c.telefone ?? "").replace(/\D/g, "").includes(termo.replace(/\D/g, "")),
        ),
      );
      setEstado("success");
    }, 350);
    return () => clearTimeout(t);
  }, [aberto, busca]);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Selecionar cliente</DialogTitle>
          <DialogDescription>Busque por nome ou telefone.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome ou telefone"
            className="h-11 pl-10"
          />
        </div>

        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
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
                onClick={() => {
                  onSelecionar(cliente);
                  onFechar();
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-surface"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <UserRound className="size-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{cliente.nome}</span>
                  <span className="block text-xs text-muted-foreground">
                    {cliente.telefone ?? "Sem telefone"}
                  </span>
                </span>
              </button>
            ))}
        </div>

        <Button variant="ghost" onClick={onFechar}>
          Continuar sem cliente
        </Button>
      </DialogContent>
    </Dialog>
  );
}
