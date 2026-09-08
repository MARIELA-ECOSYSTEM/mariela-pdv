import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
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
import type { PdvPagamentoTotais, PdvVendaTotais } from "@/lib/venda-totais";
import type { PdvAdquirente } from "@/types/adquirente";
import type { PdvPagamentoLinha } from "@/types/venda";

const SELECT = "h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground";

const SITUACAO = {
  pago: { rotulo: "PAGO", classe: "bg-success/20 text-success" },
  parcial: { rotulo: "PAGAMENTO PARCIAL", classe: "bg-primary/20 text-primary" },
  pendente: { rotulo: "PENDENTE", classe: "bg-destructive/20 text-destructive" },
} as const;

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
    pagamento.valorLiquido ??
    (tarifa != null ? arredondarCentavos(pagamento.valor - tarifa) : null);

  return (
    <div className="space-y-1.5 rounded-md bg-surface p-2">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={`adquirente-${pagamento.id}`}
          className="text-[0.7rem] text-muted-foreground"
        >
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
          <label
            htmlFor={`parcelas-${pagamento.id}`}
            className="text-[0.7rem] text-muted-foreground"
          >
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
        <p>Valor bruto: {formatMoeda(pagamento.valor)}</p>
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
  totaisVenda,
  totais,
  adquirentes,
  enviando,
  onAdicionar,
  onAlterarValor,
  onAlterarParcelas,
  onAlterarAdquirente,
  onRemover,
  onVoltar,
  onConferir,
}: {
  pagamentos: PdvPagamentoLinha[];
  totaisVenda: PdvVendaTotais;
  totais: PdvPagamentoTotais;
  adquirentes: PdvAdquirente[];
  enviando: boolean;
  onAdicionar: (forma: string) => void;
  onAlterarValor: (id: string, valor: number) => void;
  onAlterarParcelas: (id: string, parcelas: number) => void;
  onAlterarAdquirente: (id: string, adquirenteId: string) => void;
  onRemover: (id: string) => void;
  onVoltar: () => void;
  onConferir: () => void;
}) {
  const situacao = SITUACAO[totais.situacao];
  const descontoTotal = arredondarCentavos(totaisVenda.descontoItens + totaisVenda.descontoVenda);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Cabeçalho da etapa */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onVoltar}>
          <ArrowLeft className="size-4" />
          Voltar ao carrinho
        </Button>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Pagamento
        </p>
      </div>

      {/* Conteúdo rolável da etapa */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {/* Resumo compacto da venda */}
        <div className="space-y-1 rounded-lg border border-border bg-surface px-3 py-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-surface-foreground">
              {formatMoeda(totaisVenda.subtotalBruto)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Desconto</span>
            <span className="font-medium text-surface-foreground">
              {descontoTotal > 0 ? "− " : ""}
              {formatMoeda(descontoTotal)}
            </span>
          </div>
          <div className="flex items-end justify-between border-t border-border pt-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Total
            </span>
            <span className="text-lg font-semibold text-primary">
              {formatMoeda(totaisVenda.total)}
            </span>
          </div>
        </div>

        {/* forma é string livre no contrato — estas são apenas opções rápidas */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
            {pagamentos.map((p, indice) => (
              <li key={p.id} className="space-y-1.5 rounded-lg border border-border p-2">
                <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Pagamento {indice + 1}
                </p>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm font-medium">{p.forma}</span>
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
      </div>

      {/* Situação do pagamento — sempre visível */}
      <div className="shrink-0 space-y-1.5 border-t border-border bg-surface px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total da venda</span>
          <span className="font-medium text-surface-foreground">
            {formatMoeda(totaisVenda.total)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total recebido</span>
          <span className="font-medium text-surface-foreground">
            {formatMoeda(totais.recebido)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Pendente</span>
          <span className="font-medium text-surface-foreground">
            {formatMoeda(totais.pendente)}
          </span>
        </div>
        {totais.troco > 0.001 && (
          <div className="flex items-center justify-between rounded-lg bg-accent px-3 py-2 text-sm">
            <span className="font-medium text-accent-foreground">Troco</span>
            <span className="font-semibold text-accent-foreground">
              {formatMoeda(totais.troco)}
            </span>
          </div>
        )}
        <p
          className={`rounded-md px-2 py-1 text-center text-xs font-semibold tracking-[0.14em] ${situacao.classe}`}
        >
          {situacao.rotulo}
        </p>
      </div>

      {/* Ação principal da etapa — conferência antes do envio */}
      <div className="shrink-0 border-t border-border p-4">
        <Button
          className="h-14 w-full text-base tracking-[0.12em]"
          disabled={pagamentos.length === 0 || enviando}
          onClick={onConferir}
        >
          {enviando ? <Loader2 className="size-5 animate-spin" /> : null}
          FINALIZAR VENDA
        </Button>
      </div>
    </div>
  );
}
