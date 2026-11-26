import { useEffect, useRef, useState } from "react";
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
import { linhaDoCarrinho } from "@/features/carrinho/useCarrinho";
import {
  corComEstoque,
  corInicial,
  disponivelParaAdicionar,
  tamanhoAutomatico,
} from "@/features/produto/selecao-produto";
import { cn } from "@/lib/utils";
import type { PdvProduto } from "@/types/produto";
import type { PdvItemCarrinho } from "@/types/carrinho";

export function ProdutoDialog({
  produto,
  aberto,
  onFechar,
  onAdicionar,
  quantidadeNoCarrinho = () => 0,
  onAposFechar,
}: {
  produto: PdvProduto | null;
  aberto: boolean;
  onFechar: () => void;
  onAdicionar: (item: PdvItemCarrinho) => void;
  /** Unidades já no carrinho para a linha produto:variante:tamanho. */
  quantidadeNoCarrinho?: (linhaId: string) => number;
  /**
   * Chamado quando o diálogo termina de fechar (adicionando ou não), no lugar
   * do retorno de foco padrão — a tela decide o destino (busca ou card).
   */
  onAposFechar?: (adicionou: boolean) => void;
}) {
  const variantes = produto?.variantes ?? [];

  const [varianteId, setVarianteId] = useState<string | undefined>(undefined);
  const [tamanhoId, setTamanhoId] = useState<string | undefined>(undefined);
  const [quantidade, setQuantidade] = useState(1);
  const adicionouRef = useRef(false);

  // Ao abrir: primeira cor com estoque adicionável e, se houver um único
  // tamanho adicionável nela, ele já vem marcado (ver selecao-produto.ts).
  useEffect(() => {
    if (!aberto || !produto) return;
    adicionouRef.current = false;
    const cor = corInicial(produto, quantidadeNoCarrinho);
    setVarianteId(cor);
    setTamanhoId(tamanhoAutomatico(produto, cor, quantidadeNoCarrinho));
    setQuantidade(1);
    // Só na abertura: o carrinho não muda enquanto o diálogo está aberto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, produto]);

  const variante = variantes.find((v) => v.id === varianteId);
  const tamanhos = variante?.tamanhos ?? [];
  const tamanho = tamanhos.find((t) => t.id === tamanhoId);
  const estoque = tamanho?.quantidade ?? 0;
  const linhaId =
    produto && variante && tamanho ? linhaDoCarrinho(produto.id, variante.id, tamanho.id) : "";
  const noCarrinho = linhaId ? quantidadeNoCarrinho(linhaId) : 0;
  // Estoque conhecido menos o que já está no carrinho para este tamanho.
  const disponivel =
    produto && variante && tamanho
      ? disponivelParaAdicionar(produto.id, variante.id, tamanho, quantidadeNoCarrinho)
      : 0;
  const podeAdicionar = !!produto && !!variante && !!tamanho && disponivel > 0;
  const nenhumaCorDisponivel =
    !!produto && variantes.length > 0 && !corInicial(produto, quantidadeNoCarrinho);

  function adicionar() {
    if (!produto || !variante || !tamanho || disponivel <= 0) return;
    adicionouRef.current = true;
    onAdicionar({
      linhaId,
      produtoId: produto.id,
      varianteId: variante.id,
      tamanhoId: tamanho.id,
      nome: produto.nome,
      codigo: produto.codigo,
      cor: variante.cor,
      tamanho: tamanho.tamanho,
      imagemUrl: produto.imagemUrl,
      precoUnitario: produto.preco,
      quantidade: Math.min(quantidade, disponivel),
      estoqueDisponivel: tamanho.quantidade,
    });
    onFechar();
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent
        className="max-w-3xl"
        onCloseAutoFocus={(evento) => {
          // A tela decide o destino do foco (busca após adicionar; card ao
          // cancelar/fechar) — sem depender do retorno padrão do navegador.
          if (!onAposFechar) return;
          evento.preventDefault();
          const adicionou = adicionouRef.current;
          adicionouRef.current = false;
          onAposFechar(adicionou);
        }}
      >
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
                      {variantes.map((v) => {
                        // Mesmo critério dos tamanhos: cor sem estoque na API fica indisponível.
                        const semEstoque = !corComEstoque(v);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            disabled={semEstoque}
                            onClick={() => {
                              setVarianteId(v.id);
                              setTamanhoId(
                                produto
                                  ? tamanhoAutomatico(produto, v.id, quantidadeNoCarrinho)
                                  : undefined,
                              );
                              setQuantidade(1);
                            }}
                            className={cn(
                              "rounded-full border px-4 py-1.5 text-sm transition-colors",
                              varianteId === v.id
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card hover:border-primary/40",
                              semEstoque && "cursor-not-allowed line-through opacity-50",
                            )}
                          >
                            {v.cor}
                          </button>
                        );
                      })}
                    </div>
                    {nenhumaCorDisponivel && (
                      <p className="text-xs text-destructive">
                        Sem estoque disponível para adicionar deste produto.
                      </p>
                    )}
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
                    <p
                      className={cn(
                        "text-xs",
                        tamanho && disponivel === 0 ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {!tamanho
                        ? "Selecione o tamanho para ver o estoque."
                        : noCarrinho === 0
                          ? `${estoque} peça(s) disponível(is)`
                          : disponivel === 0
                            ? `Todo o estoque deste tamanho (${estoque}) já está no carrinho.`
                            : `${noCarrinho} já no carrinho · pode adicionar mais ${disponivel}.`}
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
                      disabled={!tamanho || quantidade >= disponivel}
                      onClick={() => setQuantidade((q) => Math.min(Math.max(1, disponivel), q + 1))}
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
