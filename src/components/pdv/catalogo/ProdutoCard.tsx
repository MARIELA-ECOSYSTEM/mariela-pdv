import { ProdutoImagem } from "@/components/pdv/ProdutoImagem";
import { formatMoeda } from "@/lib/format";
import type { PdvProduto } from "@/types/produto";

export function ProdutoCard({
  produto,
  onSelecionar,
}: {
  produto: PdvProduto;
  onSelecionar: (produto: PdvProduto) => void;
}) {
  const estoque = produto.variantes.reduce((t, v) => t + v.quantidade, 0);
  const disponivel = produto.disponivel && estoque > 0;

  return (
    <button
      type="button"
      onClick={() => onSelecionar(produto)}
      disabled={!disponivel}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        <ProdutoImagem produto={produto} />
        <span
          className={
            disponivel
              ? "absolute left-2 top-2 rounded-full bg-card/90 px-2 py-0.5 text-[0.65rem] font-semibold text-success"
              : "absolute left-2 top-2 rounded-full bg-card/90 px-2 py-0.5 text-[0.65rem] font-semibold text-destructive"
          }
        >
          {disponivel ? `${estoque} em estoque` : "Indisponível"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
          {produto.codigo ?? "—"}
        </p>
        <p className="line-clamp-2 text-sm font-medium text-foreground">{produto.nome}</p>
        <p className="mt-auto pt-2 text-base font-semibold text-primary">
          {formatMoeda(produto.preco)}
        </p>
      </div>
    </button>
  );
}
