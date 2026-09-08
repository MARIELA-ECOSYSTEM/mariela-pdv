import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampoDecimal } from "@/components/pdv/comum/CampoDecimal";
import { formatMoeda } from "@/lib/format";
import { formaEhCartao, formaEhCredito, formaEhDebito } from "@/lib/pagamento";
import {
  encontrarAdquirente,
  parcelasPermitidas,
  tarifaConfigurada,
  valorParcela,
} from "@/lib/adquirente";
import { arredondarCentavos } from "@/lib/desconto";
import { MOCK_FORMAS_PAGAMENTO } from "@/data/mock.pdv";
import type { PdvPagamentoTotais } from "@/lib/venda-totais";
import type { PdvAdquirente } from "@/types/adquirente";
import type { PdvPagamentoLinha } from "@/types/venda";

const SELECT = "h-8 rounded-md border border-border bg-card px-2 text-xs";

/** Linha de cartão: adquirente, parcelamento autorizado, tarifa e líquido. */
function ResumoCartao({
  pagamento,
  adquirentes,
  onAlterarAdquirente,
  onAlterarParcelas,
}: {
  pagamento: PdvPagamentoLinha;
  adquirentes: PdvAdquirente[];
  onAlterarAdquirente: (id: string, adquirenteId: string) => void;
  onAlterarParcelas: (id: string, parcelas: number) => void;
}) {
  const credito = formaEhCredito(pagamento.forma);
  const adquirente = encontrarAdquirente(adquirentes, pagamento.adquirenteId);
  const permitidas = parcelasPermitidas(adquirente);
  const parcelas = pagamento.parcelas ?? 1;

  // Tarifa e líquido: apenas o que a API/configuração informar. Sem cálculo
  // definitivo de tarifa no frontend — o backend é a autoridade financeira.
  const tarifaApi = pagamento.tarifa ?? null;
  const tarifaConfig = tarifaConfigurada(
    adquirente,
    credito ? "credito" : "debito",
    pagamento.valor,
    parcelas,
  );
  const tarifa = tarifaApi ?? tarifaConfig;
  const liquido =
    pagamento.valorLiquido ?? (tarifa != null ? arredondarCentavos(pagamento.valor - tarifa) : null);

  return (
    <div className="space-y-1.5 rounded-md bg-surface/60 p-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={`adquirente-${pagamento.id}`} className="text-[0.7rem] text-muted-foreground">
          Adquirente
        </label>
        <select
          id={`adquirente-${pagamento.id}`}
          value={pagamento.adquirenteId ?? ""}
          onChange={(e) => onAlterarAdquirente(pagamento.id, e.target.value)}
          className={SELECT}
        >
          <option value="">Selecione</option>
          {adquirentes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </div>

      {credito && (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`parcelas-${pagamento.id}`} className="text-[0.7rem] text-muted-foreground">
            Parcelamento
          </label>
          {permitidas.length === 0 ? (
            <span className="text-[0.7rem] text-muted-foreground">
              Selecione a adquirente para ver as parcelas
            </span>
          ) : (
            <select
              id={`parcelas-${pagamento.id}`}
              value={parcelas}
              onChange={(e) => onAlterarParcelas(pagamento.id, Number(e.target.value))}
              className={SELECT}
            >
              {permitidas.map((n) => (
                <option key={n} value={n}>
                  {n}x
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="space-y-0.5 text-[0.7rem] text-muted-foreground">
        <p>Valor: {formatMoeda(pagamento.valor)}</p>
        {credito && parcelas > 1 && pagamento.valor > 0 && (
          <p className="font-medium text-foreground">
            {parcelas}x de {formatMoeda(valorParcela(pagamento.valor, parcelas))}
          </p>
        )}
        {tarifa != null && <p>Tarifa da maquininha: {formatMoeda(tarifa)}</p>}
        {liquido != null && <p>Valor líquido: {formatMoeda(liquido)}</p>}
      </div>
    </div>
  );
}

export function PagamentoPanel({
  pagamentos,
  total,
  totais,
  adquirentes,
  onAdicionar,
  onAlterarValor,
  onAlterarParcelas,
  onAlterarAdquirente,
  onRemover,
}: {
  pagamentos: PdvPagamentoLinha[];
  total: number;
  totais: PdvPagamentoTotais;
  adquirentes: PdvAdquirente[];
  onAdicionar: (forma: string) => void;
  onAlterarValor: (id: string, valor: number) => void;
  onAlterarParcelas: (id: string, parcelas: number) => void;
  onAlterarAdquirente: (id: string, adquirenteId: string) => void;
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
            <li key={p.id} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm">{p.forma}</span>
                <CampoDecimal
                  valor={p.valor}
                  onChange={(valor) => onAlterarValor(p.id, valor)}
                  ariaLabel={`Valor em ${p.forma}`}
                  className="h-9 w-28"
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

              {formaEhCartao(p.forma) && (
                <ResumoCartao
                  pagamento={p}
                  adquirentes={adquirentes.filter((a) =>
                    formaEhDebito(p.forma) ? !!a.modalidades.debito : true,
                  )}
                  onAlterarAdquirente={onAlterarAdquirente}
                  onAlterarParcelas={onAlterarParcelas}
                />
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
