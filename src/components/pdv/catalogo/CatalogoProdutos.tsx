import { forwardRef } from "react";
import { PackageSearch, Search, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProdutoCard } from "./ProdutoCard";
import type { PdvProduto } from "@/types/produto";
import type { RequestState } from "@/types/api";

export const CatalogoProdutos = forwardRef<
  HTMLInputElement,
  {
    produtos: PdvProduto[];
    estado: RequestState;
    busca: string;
    onBuscaChange: (valor: string) => void;
    onSelecionar: (produto: PdvProduto) => void;
    onTentarNovamente: () => void;
    bloqueado?: boolean;
  }
>(function CatalogoProdutos(
  { produtos, estado, busca, onBuscaChange, onSelecionar, onTentarNovamente, bloqueado },
  ref,
) {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={ref}
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            placeholder="Buscar produto por nome ou código   (atalho: / )"
            className="h-12 rounded-xl border-border bg-card pl-10 text-base shadow-[var(--shadow-soft)]"
            disabled={bloqueado}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {estado === "loading" && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
                <Skeleton className="aspect-[4/5] w-full rounded-none" />
                <div className="space-y-2 p-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {estado === "error" && (
          <div className="surface-panel flex flex-col items-center gap-3 p-10 text-center">
            <TriangleAlert className="size-8 text-destructive" />
            <p className="font-medium">Não foi possível carregar o catálogo.</p>
            <p className="text-sm text-muted-foreground">
              Verifique a conexão da loja e tente novamente.
            </p>
            <Button onClick={onTentarNovamente} variant="secondary">
              Tentar novamente
            </Button>
          </div>
        )}

        {estado === "success" && produtos.length === 0 && (
          <div className="surface-panel flex flex-col items-center gap-3 p-10 text-center">
            <PackageSearch className="size-8 text-muted-foreground" />
            <p className="font-medium">Nenhum produto encontrado</p>
            <p className="text-sm text-muted-foreground">
              Tente outro nome ou o código da etiqueta.
            </p>
          </div>
        )}

        {estado === "success" && produtos.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {produtos.map((produto) => (
              <ProdutoCard key={produto.id} produto={produto} onSelecionar={onSelecionar} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
});
