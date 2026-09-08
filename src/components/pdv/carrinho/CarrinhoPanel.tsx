import { useState } from "react";
import { ArrowRight, Minus, Percent, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProdutoImagem } from "@/components/pdv/ProdutoImagem";
import { DescontoInput } from "@/components/pdv/desconto/DescontoInput";
import { formatarDecimalBr } from "@/lib/decimal";
import { formatMoeda } from "@/lib/format";
import { totaisDoItem, type PdvVendaTotais } from "@/lib/venda-totais";
import { DESCONTO_ZERO, type PdvDesconto } from "@/types/desconto";
import type { PdvItemCarrinho } from "@/types/carrinho";

/**
 * Item compacto: identidade do produto em destaque, dados secundários menores e
 * desconto em seção expansível para não aumentar a altura do card.
 */
function ItemCarrinho({
  item,
  onRemover,
  onAlterarQuantidade,
  onAlterarDesconto,
}: {
  item: PdvItemCarrinho;
  onRemover: (linhaId: string) => void;
  onAlterarQuantidade: (linhaId: string, quantidade: number) => void;
  onAlterarDesconto: (linhaId: string, desconto: PdvDesconto) => void;
}) {
  const t = totaisDoItem(item);
  const temDesconto = t.desconto > 0;
  const [aberto, setAberto] = useState(false);

  return (
    <li className="rounded-lg border border-border p-2">
      <div className="flex gap-3">
        <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
          <ProdutoImagem produto={{ nome: item.nome, imagemUrl: item.imagemUrl ?? null }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{item.nome}</p>
              <p className="truncate text-[0.7rem] text-muted-foreground">
                {[item.cor, item.tamanho].filter(Boolean).join(" · ") || "Única"} ·{" "}
                {formatMoeda(item.precoUnitario)} un.
              </p>
            </div>
            <div className="shrink-0 text-right">
              {temDesconto && (
                <p className="text-[0.65rem] text-muted-foreground line-through">
                  {formatMoeda(t.bruto)}
                </p>
              )}
              <p className="text-sm font-semibold leading-tight">{formatMoeda(t.liquido)}</p>
            </div>
          </div>

          <div className="mt-1.5 flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => onAlterarQuantidade(item.linhaId, item.quantidade - 1)}
              aria-label="Diminuir quantidade"
            >
              <Minus className="size-3" />
            </Button>
            <span className="w-7 text-center text-sm font-semibold">{item.quantidade}</span>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => onAlterarQuantidade(item.linhaId, item.quantidade + 1)}
              disabled={
                item.estoqueDisponivel !== undefined && item.quantidade >= item.estoqueDisponivel
              }
              aria-label="Aumentar quantidade"
            >
              <Plus className="size-3" />
            </Button>

            <Button
              variant={aberto || temDesconto ? "secondary" : "ghost"}
              size="sm"
              className="ml-auto h-7 px-2 text-[0.7rem]"
              aria-expanded={aberto}
              onClick={() => setAberto((v) => !v)}
            >
              <Percent className="size-3" />
              {temDesconto ? `− ${formatMoeda(t.desconto)}` : "Desconto"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={() => onRemover(item.linhaId)}
              aria-label="Remover item"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          {aberto && (
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
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
                onChange={(d) => onAlterarDesconto(item.linhaId, d)}
                compacto
              />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export function CarrinhoPanel({
  itens,
  descontoVenda,
  totais,
  onRemoverItem,
  onAlterarQuantidade,
  onAlterarDescontoItem,
  onDescontoVendaChange,
  onSeguirParaPagamento,
}: {
  itens: PdvItemCarrinho[];
  descontoVenda: PdvDesconto;
  totais: PdvVendaTotais;
  onRemoverItem: (linhaId: string) => void;
  onAlterarQuantidade: (linhaId: string, quantidade: number) => void;
  onAlterarDescontoItem: (linhaId: string, desconto: PdvDesconto) => void;
  onDescontoVendaChange: (desconto: PdvDesconto) => void;
  onSeguirParaPagamento: () => void;
}) {
  const quantidadeItens = itens.reduce((soma, i) => soma + i.quantidade, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Cabeçalho */}
      <div className="flex shrink-0 items-baseline justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Carrinho
        </p>
        <p className="text-xs text-muted-foreground">
          {quantidadeItens === 1 ? "1 item" : `${quantidadeItens} itens`}
        </p>
      </div>

      {/* Lista de itens — única área que cresce e rola */}
      <div className="min-h-[6rem] flex-1 overflow-y-auto p-3">
        {itens.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <ShoppingBag className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium text-muted-foreground">Carrinho vazio</p>
            <p className="text-xs text-muted-foreground">
              Busque uma peça no catálogo para começar a venda.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {itens.map((item) => (
              <ItemCarrinho
                key={item.linhaId}
                item={item}
                onRemover={onRemoverItem}
                onAlterarQuantidade={onAlterarQuantidade}
                onAlterarDesconto={onAlterarDescontoItem}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Resumo financeiro — sempre visível, separado da lista */}
      <div className="shrink-0 space-y-2 border-t border-border bg-surface px-4 py-3">
        <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Resumo</p>
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
            {totais.descontoVenda > 0 && (
              <span className="ml-1 text-xs">
                (− {formatMoeda(totais.descontoVenda)} ·{" "}
                {formatarDecimalBr(
                  totais.subtotalAposItens > 0
                    ? (totais.descontoVenda / totais.subtotalAposItens) * 100
                    : 0,
                )}
                %)
              </span>
            )}
          </Label>
          <DescontoInput
            id="desconto"
            base={totais.subtotalAposItens}
            desconto={descontoVenda}
            onChange={onDescontoVendaChange}
          />
        </div>
        <div className="flex items-end justify-between border-t border-border pt-2">
          <span className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Total
          </span>
          <span className="text-2xl font-semibold text-primary">{formatMoeda(totais.total)}</span>
        </div>
      </div>

      {/* Ação principal do carrinho — sempre acessível */}
      <div className="shrink-0 border-t border-border p-4">
        <Button
          className="h-14 w-full text-base tracking-[0.12em]"
          disabled={itens.length === 0}
          onClick={onSeguirParaPagamento}
        >
          SEGUIR PARA PAGAMENTO
          <ArrowRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}
