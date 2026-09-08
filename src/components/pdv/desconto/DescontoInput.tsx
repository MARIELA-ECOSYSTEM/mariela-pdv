import { CampoDecimal } from "@/components/pdv/comum/CampoDecimal";
import { cn } from "@/lib/utils";
import { converterModalidade, descontoEmPercentual, descontoEmValor } from "@/lib/desconto";
import { formatarDecimalBr } from "@/lib/decimal";
import { formatMoeda } from "@/lib/format";
import type { PdvDesconto, PdvDescontoTipo } from "@/types/desconto";

/**
 * Campo único de desconto com seletor de modalidade (% ou R$) e equivalência
 * imediata. Aceita casas decimais ("10,5%", "R$ 20,50"). O frontend só calcula a
 * equivalência para feedback — o backend continua sendo a autoridade do desconto
 * aplicado na venda.
 */
export function DescontoInput({
  id,
  base,
  desconto,
  onChange,
  className,
  compacto = false,
}: {
  id: string;
  base: number;
  desconto: PdvDesconto;
  onChange: (desconto: PdvDesconto) => void;
  className?: string;
  compacto?: boolean;
}) {
  const emValor = descontoEmValor(base, desconto);
  const emPercentual = descontoEmPercentual(base, desconto);

  function digitar(numero: number) {
    const limite = desconto.tipo === "percentual" ? 100 : base;
    onChange({ tipo: desconto.tipo, valor: Math.max(0, Math.min(numero, limite)) });
  }

  function trocarTipo(tipo: PdvDescontoTipo) {
    onChange(converterModalidade(base, desconto, tipo));
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-1">
        <CampoDecimal
          id={id}
          valor={desconto.valor}
          onChange={digitar}
          placeholder="0"
          className={cn("bg-card", compacto ? "h-8 w-20 text-xs" : "h-9 w-24")}
        />
        <div className="flex overflow-hidden rounded-md border border-border">
          {(["percentual", "monetario"] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              aria-pressed={desconto.tipo === tipo}
              onClick={() => trocarTipo(tipo)}
              className={cn(
                "px-2 text-xs font-medium transition-colors",
                compacto ? "h-8" : "h-9",
                desconto.tipo === tipo
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent",
              )}
            >
              {tipo === "percentual" ? "%" : "R$"}
            </button>
          ))}
        </div>
      </div>
      {desconto.valor > 0 && (
        <p
          className={cn(
            "text-right text-muted-foreground",
            compacto ? "text-[0.65rem]" : "text-xs",
          )}
        >
          {desconto.tipo === "percentual"
            ? `Equivale a ${formatMoeda(emValor)}`
            : `Equivale a ${formatarDecimalBr(emPercentual)}%`}
        </p>
      )}
    </div>
  );
}
