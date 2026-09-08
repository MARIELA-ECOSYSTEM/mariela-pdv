import { useEffect, useState } from "react";
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

  const [varianteId, setVarianteId] = useState<string | undefined>(undefined);
  const [tamanhoId, setTamanhoId] = useState<string | undefined>(undefined);
  const [quantidade, setQuantidade] = useState(1);

  useEffect(() => {
    if (!aberto) return;
    setVarianteId(produto?.variantes[0]?.id);
    setTamanhoId(undefined);
    setQuantidade(1);
  }, [aberto, produto]);

  const variante = variantes.find((v) => v.id === varianteId);
  const tamanhos = variante?.tamanhos ?? [];
  const tamanho = tamanhos.find((t) => t.id === tamanhoId);
  const estoque = tamanho?.quantidade ?? 0;
  const podeAdicionar = !!produto && !!variante && !!tamanho && estoque > 0;

  function adicionar() {
    if (!produto || !variante || !tamanho) return;
    onAdicionar({
      linhaId: `${produto.id}:${variante.id}:${tamanho.id}`,
      produtoId: produto.id,
      varianteId: variante.id,
      tamanhoId: tamanho.id,
      nome: produto.nome,
      codigo: produto.codigo,
      cor: variante.cor,
      tamanho: tamanho.tamanho,
      imagemUrl: produto.imagemUrl,
      precoUnitario: produto.preco,
      quantidade,
      estoqueDisponivel: tamanho.quantidade,
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

                {variantes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Cor</p>
                    <div className="flex flex-wrap gap-2">
                      {variantes.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setVarianteId(v.id);
                            setTamanhoId(undefined);
                            setQuantidade(1);
                          }}
                          className={cn(
                            "rounded-full border px-4 py-1.5 text-sm transition-colors",
                            varianteId === v.id
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:border-primary/40",
                          )}
                        >
                          {v.cor}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {tamanhos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Tamanho</p>
                    <div className="flex flex-wrap gap-2">
                      {tamanhos.map((t) => {
                        const semEstoque = !t.disponivel || t.quantidade <= 0;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            disabled={semEstoque}
                            onClick={() => {
                              setTamanhoId(t.id);
                              setQuantidade(1);
                            }}
                            className={cn(
                              "min-w-14 rounded-lg border px-3 py-2 text-sm transition-colors",
                              tamanhoId === t.id
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card hover:border-primary/40",
                              semEstoque && "cursor-not-allowed line-through opacity-50",
                            )}
                          >
                            {t.tamanho}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tamanho
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
