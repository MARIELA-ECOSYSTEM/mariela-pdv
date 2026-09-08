import { cn } from "@/lib/utils";
import type { PdvProduto } from "@/types/produto";

/**
 * Exibe a imagem do produto quando a API fornecer imagemUrl.
 * Sem imagem, mostra um bloco de marca (nada de foto inventada).
 */
export function ProdutoImagem({
  produto,
  className,
}: {
  produto: Pick<PdvProduto, "nome" | "imagemUrl">;
  className?: string;
}) {
  if (produto.imagemUrl) {
    return (
      <img
        src={produto.imagemUrl}
        alt={produto.nome}
        loading="lazy"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  const inicial = produto.nome.trim().charAt(0).toUpperCase();
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-full w-full items-center justify-center bg-secondary text-secondary-foreground",
        className,
      )}
    >
      <span className="brand-title text-2xl opacity-60">{inicial}</span>
    </div>
  );
}
