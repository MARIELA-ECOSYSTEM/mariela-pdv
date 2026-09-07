import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProdutoImagem } from "@/components/pdv/ProdutoImagem";
import { formatMoeda } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PdvProduto } from "@/types/produto";
import type { PdvItemCarrinho } from "@/types/carrinho";

export function ProdutoDialog({
  produto,
  aberto,
  onFechar,
  onAdicionar,
}: {
  produto: PdvProduto | null;
  aberto: boolean;
  onFechar: () => void;
  onAdicionar: (item: PdvItemCarrinho) => void;
}) {
  const variantes = produto?.variantes ?? [];
  const cores = useMemo(
    () => Array.from(new Set(variantes.map((v) => v.cor).filter(Boolean))) as string[],
    [variantes],
  );

  const [cor, setCor] = useState<string | undefined>(undefined);
  const [varianteId, setVarianteId] = useState<string | undefined>(undefined);
  const [quantidade, setQuantidade] = useState(1);

  useEffect(() => {
    if (!aberto) return;
    setCor(cores[0]);
    setVarianteId(undefined);
    setQuantidade(1);
  }, [aberto, produto?.id, cores]);

  const tamanhos = variantes.filter((v) => (cor ? v.cor === cor : true));
  const variante = variantes.find((v) => v.id === varianteId);
  const estoque = variante?.estoque ?? 0;
  const podeAdicionar = !!produto && (variantes.length === 0 || (!!variante && estoque > 0));

  function adicionar() {
    if (!produto) return;
    onAdicionar({
      linhaId: `${produto.id}:${variante?.id ?? "unico"}`,
      produtoId: produto.id,
      varianteId: variante?.id,
      nome: produto.nome,
      codigo: produto.codigo,
      cor: variante?.cor,
      tamanho: variante?.tamanho,
      imagemUrl: produto.imagemUrl ?? null,
      precoUnitario: produto.preco,
      quantidade,
      estoqueDisponivel: variante?.estoque,
    });
    onFechar();
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-3xl">
        {produto && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">{produto.nome}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
              <div className="aspect-[4/5] overflow-hidden rounded-xl border border-border bg-muted">
                <ProdutoImagem produto={produto} />
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
                    Código {produto.codigo ?? "—"}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-primary">
                    {formatMoeda(produto.preco)}
                  </p>
                </div>

                {cores.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Cor</p>
                    <div className="flex flex-wrap gap-2">
                      {cores.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setCor(c);
                            setVarianteId(undefined);
                          }}
                          className={cn(
                            "rounded-full border px-4 py-1.5 text-sm transition-colors",
                            cor === c
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:border-primary/40",
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {tamanhos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Tamanho</p>
                    <div className="flex flex-wrap gap-2">
                      {tamanhos.map((v) => {
                        const semEstoque = (v.estoque ?? 0) <= 0;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            disabled={semEstoque}
                            onClick={() => {
                              setVarianteId(v.id);
                              setQuantidade(1);
                            }}
                            className={cn(
                              "min-w-14 rounded-lg border px-3 py-2 text-sm transition-colors",
                              varianteId === v.id
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card hover:border-primary/40",
                              semEstoque && "cursor-not-allowed line-through opacity-50",
                            )}
                          >
                            {v.tamanho ?? "Único"}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {variante
                        ? `${estoque} peça(s) disponível(is)`
                        : "Selecione o tamanho para ver o estoque."}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">Quantidade</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-12 text-center text-lg font-semibold">{quantidade}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setQuantidade((q) => (estoque ? Math.min(estoque, q + 1) : q + 1))
                      }
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={onFechar}>
                Cancelar
              </Button>
              <Button onClick={adicionar} disabled={!podeAdicionar} className="min-w-48">
                Adicionar ao carrinho
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
