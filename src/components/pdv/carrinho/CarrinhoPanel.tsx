import { Minus, Plus, ShoppingBag, Trash2, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProdutoImagem } from "@/components/pdv/ProdutoImagem";
import { DescontoInput } from "@/components/pdv/desconto/DescontoInput";
import { formatMoeda } from "@/lib/format";
import { totaisDoItem, type PdvVendaTotais } from "@/lib/venda-totais";
import { DESCONTO_ZERO, type PdvDesconto } from "@/types/desconto";
import type { PdvItemCarrinho } from "@/types/carrinho";
import type { PdvCliente } from "@/types/cliente";

export function CarrinhoPanel({
  itens,
  cliente,
  descontoVenda,
  totais,
  onAbrirCliente,
  onRemoverCliente,
  onRemoverItem,
  onAlterarQuantidade,
  onAlterarDescontoItem,
  onDescontoVendaChange,
}: {
  itens: PdvItemCarrinho[];
  cliente: PdvCliente | null;
  descontoVenda: PdvDesconto;
  totais: PdvVendaTotais;
  onAbrirCliente: () => void;
  onRemoverCliente: () => void;
  onRemoverItem: (linhaId: string) => void;
  onAlterarQuantidade: (linhaId: string, quantidade: number) => void;
  onAlterarDescontoItem: (linhaId: string, desconto: PdvDesconto) => void;
  onDescontoVendaChange: (desconto: PdvDesconto) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Cliente */}
      <div className="border-b border-border p-4">
        {cliente ? (
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <UserRound className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{cliente.nome}</p>
              <p className="text-xs text-muted-foreground">{cliente.telefone ?? "Sem telefone"}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemoverCliente}
              aria-label="Remover cliente"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            className="h-11 w-full justify-start"
            onClick={onAbrirCliente}
          >
            <UserRound className="size-4" />
            Selecionar cliente
          </Button>
        )}
      </div>

      {/* Itens */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {itens.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <ShoppingBag className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium text-muted-foreground">Carrinho vazio</p>
            <p className="text-xs text-muted-foreground">
              Busque uma peça no catálogo para começar a venda.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {itens.map((item) => {
              const t = totaisDoItem(item);
              return (
                <li key={item.linhaId} className="flex gap-3 rounded-lg border border-border p-2">
                  <div className="size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    <ProdutoImagem
                      produto={{ nome: item.nome, imagemUrl: item.imagemUrl ?? null }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {[item.cor, item.tamanho].filter(Boolean).join(" · ") || "Única"}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() => onAlterarQuantidade(item.linhaId, item.quantidade - 1)}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-7 text-center text-sm font-semibold">
                          {item.quantidade}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() => onAlterarQuantidade(item.linhaId, item.quantidade + 1)}
                          disabled={
                            item.estoqueDisponivel !== undefined &&
                            item.quantidade >= item.estoqueDisponivel
                          }
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="text-[0.7rem] text-muted-foreground">
                          {formatMoeda(item.precoUnitario)} un.
                        </p>
                        <p className="text-sm font-semibold">
                          {t.desconto > 0 ? (
                            <>
                              <span className="mr-1 text-[0.7rem] font-normal text-muted-foreground line-through">
                                {formatMoeda(t.bruto)}
                              </span>
                              {formatMoeda(t.liquido)}
                            </>
                          ) : (
                            formatMoeda(t.bruto)
                          )}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemoverItem(item.linhaId)}
                        aria-label="Remover item"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Label
                        htmlFor={`desconto-item-${item.linhaId}`}
                        className="text-[0.7rem] text-muted-foreground"
                      >
                        Desconto do item
                      </Label>
                      <DescontoInput
                        id={`desconto-item-${item.linhaId}`}
                        base={t.bruto}
                        desconto={item.desconto ?? DESCONTO_ZERO}
                        onChange={(d) => onAlterarDescontoItem(item.linhaId, d)}
                        compacto
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Área financeira */}
      <div className="space-y-3 border-t border-border bg-surface p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatMoeda(totais.subtotalBruto)}</span>
        </div>
        {totais.descontoItens > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Descontos dos itens</span>
            <span className="font-medium">− {formatMoeda(totais.descontoItens)}</span>
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <Label htmlFor="desconto" className="mt-2 text-sm text-muted-foreground">
            Desconto da venda
          </Label>
          <DescontoInput
            id="desconto"
            base={totais.subtotalAposItens}
            desconto={descontoVenda}
            onChange={onDescontoVendaChange}
          />
        </div>
        <div className="flex items-end justify-between border-t border-border pt-3">
          <span className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Total
          </span>
          <span className="text-2xl font-semibold text-primary">{formatMoeda(totais.total)}</span>
        </div>
      </div>
    </div>
  );
}
