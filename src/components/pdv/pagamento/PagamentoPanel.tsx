import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoeda } from "@/lib/format";
import { formaEhCartao, formaEhCredito, opcoesParcelas } from "@/lib/pagamento";
import { MOCK_FORMAS_PAGAMENTO } from "@/data/mock.pdv";
import type { PdvPagamentoTotais } from "@/lib/venda-totais";
import type { PdvPagamentoLinha } from "@/types/venda";

export function PagamentoPanel({
  pagamentos,
  total,
  totais,
  onAdicionar,
  onAlterarValor,
  onAlterarParcelas,
  onRemover,
}: {
  pagamentos: PdvPagamentoLinha[];
  total: number;
  totais: PdvPagamentoTotais;
  onAdicionar: (forma: string) => void;
  onAlterarValor: (id: string, texto: string) => void;
  onAlterarParcelas: (id: string, parcelas: number) => void;
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
            {totais.pendente > 0.001 ? `Falta ${formatMoeda(totais.pendente)}` : "Valor completo"}
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
            <li key={p.id} className="space-y-1">
              <div className="flex items-center gap-2">
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
              </div>

              {formaEhCredito(p.forma) && (
                <div className="flex items-center justify-between gap-2 pl-1">
                  <label
                    htmlFor={`parcelas-${p.id}`}
                    className="text-[0.7rem] text-muted-foreground"
                  >
                    Parcelamento
                  </label>
                  <select
                    id={`parcelas-${p.id}`}
                    value={p.parcelas ?? 1}
                    onChange={(e) => onAlterarParcelas(p.id, Number(e.target.value))}
                    className="h-8 rounded-md border border-border bg-card px-2 text-xs"
                  >
                    {opcoesParcelas().map((n) => (
                      <option key={n} value={n}>
                        {n}x
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formaEhCartao(p.forma) && (
                <div className="space-y-0.5 pl-1 text-[0.7rem] text-muted-foreground">
                  <p>Valor bruto: {formatMoeda(p.valor)}</p>
                  <p>
                    Tarifa da maquininha:{" "}
                    {p.tarifa != null ? formatMoeda(p.tarifa) : "conforme configuração da loja"}
                  </p>
                  <p>
                    Valor líquido:{" "}
                    {p.valorLiquido != null
                      ? formatMoeda(p.valorLiquido)
                      : "calculado no fechamento"}
                  </p>
                  {formaEhCredito(p.forma) && (p.parcelas ?? 1) > 1 && p.valor > 0 && (
                    <p>
                      {p.parcelas}x de {formatMoeda(p.valor / (p.parcelas ?? 1))}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Recebido</span>
        <span className="font-medium">{formatMoeda(totais.recebido)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Pendente</span>
        <span className="font-medium">{formatMoeda(totais.pendente)}</span>
      </div>
      {totais.troco > 0.001 && (
        <div className="flex items-center justify-between rounded-lg bg-accent px-3 py-2 text-sm">
          <span className="font-medium text-accent-foreground">Troco</span>
          <span className="font-semibold text-accent-foreground">{formatMoeda(totais.troco)}</span>
        </div>
      )}
      <p className="text-[0.7rem] text-muted-foreground">Total da venda: {formatMoeda(total)}</p>
    </div>
  );
}
