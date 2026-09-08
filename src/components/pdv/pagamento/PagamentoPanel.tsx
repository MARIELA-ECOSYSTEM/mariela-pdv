import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoeda } from "@/lib/format";
import { MOCK_FORMAS_PAGAMENTO } from "@/data/mock.pdv";
import type { PdvPagamentoLinha } from "@/types/venda";

export function PagamentoPanel({
  pagamentos,
  total,
  pago,
  restante,
  troco,
  onAdicionar,
  onAlterarValor,
  onRemover,
}: {
  pagamentos: PdvPagamentoLinha[];
  total: number;
  pago: number;
  restante: number;
  troco: number;
  onAdicionar: (forma: string) => void;
  onAlterarValor: (id: string, texto: string) => void;
  onRemover: (id: string) => void;
}) {
  return (
    <div className="space-y-3 border-t border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Pagamento
        </p>
        {pagamentos.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {restante > 0.001 ? `Falta ${formatMoeda(restante)}` : "Valor completo"}
          </p>
        )}
      </div>

      {/* forma é string livre no contrato — estas são apenas opções rápidas */}
      <div className="grid grid-cols-4 gap-2">
        {MOCK_FORMAS_PAGAMENTO.map((forma) => (
          <Button
            key={forma}
            variant="outline"
            className="h-10 text-xs"
            onClick={() => onAdicionar(forma)}
          >
            {forma}
          </Button>
        ))}
      </div>

      {pagamentos.length > 0 && (
        <ul className="space-y-2">
          {pagamentos.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <span className="flex-1 text-sm">{p.forma}</span>
              <Input
                inputMode="decimal"
                value={p.valor ? String(p.valor).replace(".", ",") : ""}
                placeholder="0,00"
                onChange={(e) => onAlterarValor(p.id, e.target.value)}
                className="h-9 w-28 text-right"
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => onRemover(p.id)}
                aria-label="Remover forma de pagamento"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Recebido</span>
        <span className="font-medium">{formatMoeda(pago)}</span>
      </div>
      {troco > 0.001 && (
        <div className="flex items-center justify-between rounded-lg bg-accent px-3 py-2 text-sm">
          <span className="font-medium text-accent-foreground">Troco</span>
          <span className="font-semibold text-accent-foreground">{formatMoeda(troco)}</span>
        </div>
      )}
      <p className="text-[0.7rem] text-muted-foreground">Total da venda: {formatMoeda(total)}</p>
    </div>
  );
}
