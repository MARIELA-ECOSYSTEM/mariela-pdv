import { cn } from "@/lib/utils";

export function MarielaMarca({
  className,
  tamanho = "md",
  invertido = false,
}: {
  className?: string;
  tamanho?: "md" | "lg";
  invertido?: boolean;
}) {
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span
        className={cn(
          "brand-title leading-none",
          tamanho === "lg" ? "text-4xl" : "text-2xl",
          invertido ? "text-primary-foreground" : "text-brand",
        )}
      >
        Mariela
      </span>
      <span
        className={cn(
          "rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.28em]",
          invertido
            ? "bg-primary-foreground/15 text-primary-foreground"
            : "bg-accent text-accent-foreground",
        )}
      >
        PDV
      </span>
    </div>
  );
}
