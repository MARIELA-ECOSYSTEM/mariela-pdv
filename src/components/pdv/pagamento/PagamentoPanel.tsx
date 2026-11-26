import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampoDecimal } from "@/components/pdv/comum/CampoDecimal";
import { formatMoeda } from "@/lib/format";
import {
  formaCartaoAmbigua,
  formaEhCartao,
  formaEhCredito,
  formaEhDinheiro,
  formaEhFiado,
  formasParaExibir,
  MENSAGEM_FIADO_SEM_CLIENTE,
  mensagemFaltaReceber,
  opcoesParcelas,
} from "@/lib/pagamento";
import { situacaoPagamento, type TipoSituacaoPagamento } from "@/lib/situacao-pagamento";
import { cn } from "@/lib/utils";
import {
  encontrarAdquirente,
  parcelasPermitidas,
  suportaModalidade,
  valorParcela,
} from "@/lib/adquirente";
import { arredondarCentavos } from "@/lib/desconto";
import type { ListaCarregada } from "@/features/pagamento/useOpcoesPagamento";
import type { PdvPagamentoTotais, PdvVendaTotais } from "@/lib/venda-totais";
import type { PdvAdquirente } from "@/types/adquirente";
import type { RequestState } from "@/types/api";
import type { PdvPagamentoLinha } from "@/types/venda";
import type { PdvCliente } from "@/types/cliente";

const SELECT = "h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground";

const ESTILO_SITUACAO: Record<TipoSituacaoPagamento, string> = {
  falta: "bg-destructive/10 text-destructive",
  ajustar: "bg-destructive/10 text-destructive",
  bloqueado: "bg-muted text-muted-foreground",
  fiado: "bg-primary/10 text-primary",
  completo: "bg-success/15 text-success",
};

/**
 * Linha FIADO: valor que ficará pendente e em quantas parcelas o cliente
 * pagará depois. Vencimentos e cobrança são regra do backend — aqui só a
 * intenção do operador.
 */
function ResumoFiado({
  pagamento,
  onAlterarParcelas,
}: {
  pagamento: PdvPagamentoLinha;
  onAlterarParcelas: (id: string, parcelas: number) => void;
}) {
  const parcelas = pagamento.parcelas ?? 1;

  return (
    <div className="space-y-1.5 rounded-md bg-surface p-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={`fiado-${pagamento.id}`} className="text-[0.7rem] text-muted-foreground">
          Parcelas do fiado
        </label>
        <select
          id={`fiado-${pagamento.id}`}
          value={parcelas}
          onChange={(e) => onAlterarParcelas(pagamento.id, Number(e.target.value))}
          className={SELECT}
        >
          {opcoesParcelas().map((n) => (
            <option key={n} value={n}>
              {n}x
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-0.5 text-[0.7rem] text-muted-foreground">
        <p>Valor a receber depois: {formatMoeda(pagamento.valor)}</p>
        {pagamento.valor > 0 && (
          <p className="font-medium text-foreground">
            {parcelas}x de {formatMoeda(valorParcela(pagamento.valor, parcelas))}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Linha de cartão: maquininha (só as que aceitam a modalidade, vindas da API)
 * e parcelamento autorizado.
 */
function ResumoCartao({
  pagamento,
  adquirentes,
  estadoAdquirentes,
  onRecarregar,
  onAlterarAdquirente,
  onAlterarParcelas,
}: {
  pagamento: PdvPagamentoLinha;
  /** Já filtradas pela modalidade desta linha. */
  adquirentes: PdvAdquirente[];
  estadoAdquirentes: RequestState;
  onRecarregar: () => void;
  onAlterarAdquirente: (id: string, adquirenteId: string) => void;
  onAlterarParcelas: (id: string, parcelas: number) => void;
}) {
  if (estadoAdquirentes === "loading" || estadoAdquirentes === "idle") {
    return (
      <p className="flex items-center gap-1.5 rounded-md bg-surface p-2 text-[0.7rem] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Carregando maquininhas…
      </p>
    );
  }
  if (estadoAdquirentes === "error") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md bg-destructive/10 p-2 text-[0.7rem] text-destructive">
        <span>Não foi possível carregar as maquininhas.</span>
        <Button variant="outline" size="sm" className="h-7 text-[0.7rem]" onClick={onRecarregar}>
          Tentar novamente
        </Button>
      </div>
    );
  }
  if (adquirentes.length === 0) {
    return (
      <p className="rounded-md bg-destructive/10 p-2 text-[0.7rem] text-destructive">
        Nenhuma maquininha aceita {formaEhCredito(pagamento.forma) ? "crédito" : "débito"}. Peça ao
        responsável para configurar no Backoffice.
      </p>
    );
  }
  return (
    <ResumoCartaoConfigurado
      pagamento={pagamento}
      adquirentes={adquirentes}
      onAlterarAdquirente={onAlterarAdquirente}
      onAlterarParcelas={onAlterarParcelas}
    />
  );
}

function ResumoCartaoConfigurado({
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
  // Tarifa, valor bruto e valor líquido são informação financeira interna da
  // loja: não aparecem para a vendedora. O backend continua aplicando e
  // registrando a tarifa na venda (`tarifaAplicada`); nada muda no envio.

  return (
    <div className="space-y-1.5 rounded-md bg-surface p-2">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={`adquirente-${pagamento.id}`}
          className="text-[0.7rem] text-muted-foreground"
        >
          Maquininha
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
              Escolha a maquininha para ver as parcelas
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

      {credito && parcelas > 1 && pagamento.valor > 0 && (
        <p className="text-[0.7rem] font-medium text-foreground">
          {parcelas}x de {formatMoeda(valorParcela(pagamento.valor, parcelas))}
        </p>
      )}
    </div>
  );
}

export function PagamentoPanel({
  pagamentos,
  totaisVenda,
  totais,
  formas,
  adquirentes,
  problema = null,
  onRecarregarOpcoes,
  onSelecionarCliente,
  cliente = null,
  enviando,
  bloqueado = false,
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
  /** GET /pdv/pagamentos/formas — com estado de carregamento. */
  formas: ListaCarregada<string>;
  /** GET /pdv/pagamentos/adquirentes — com estado de carregamento. */
  adquirentes: ListaCarregada<PdvAdquirente>;
  /** Pagamento incompleto/inválido (ver validarPagamentos) — impede conferir. */
  problema?: string | null;
  onRecarregarOpcoes: () => void;
  /** Abre o diálogo de cliente já existente (o mesmo do cabeçalho). */
  onSelecionarCliente?: () => void;
  cliente?: PdvCliente | null;
  enviando: boolean;
  /** Sem caixa aberto (abertura é exclusiva do Backoffice) a venda não conclui. */
  bloqueado?: boolean;
  onAdicionar: (forma: string) => void;
  onAlterarValor: (id: string, valor: number) => void;
  onAlterarParcelas: (id: string, parcelas: number) => void;
  onAlterarAdquirente: (id: string, adquirenteId: string) => void;
  onRemover: (id: string) => void;
  onVoltar: () => void;
  onConferir: () => void;
}) {
  const descontoTotal = arredondarCentavos(totaisVenda.descontoItens + totaisVenda.descontoVenda);
  const temFiado = totais.fiado > 0.001;
  const faltaReceber = totais.pendente > 0.001;
  const situacao = situacaoPagamento({
    quantidadePagamentos: pagamentos.length,
    totais,
    problema,
    bloqueado,
    clienteNome: cliente?.nome,
  });
  // "Falta receber" aparece UMA vez, na situação do pagamento — a mesma
  // mensagem vinda da validação não é repetida embaixo (o bloqueio continua).
  const problemaExibido =
    problema && faltaReceber && problema === mensagemFaltaReceber(totais.pendente)
      ? null
      : problema;

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
        {/* Total da venda — único lugar do painel onde o total aparece */}
        <div className="space-y-1 rounded-lg border border-border bg-surface px-3 py-2">
          {descontoTotal > 0 && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-surface-foreground">
                  {formatMoeda(totaisVenda.subtotalBruto)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Desconto</span>
                <span className="font-medium text-surface-foreground">
                  − {formatMoeda(descontoTotal)}
                </span>
              </div>
            </>
          )}
          <div
            className={cn(
              "flex items-end justify-between",
              descontoTotal > 0 && "border-t border-border pt-1.5",
            )}
          >
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Total
            </span>
            <span className="text-lg font-semibold text-primary">
              {formatMoeda(totaisVenda.total)}
            </span>
          </div>
        </div>

        {/* Formas cadastradas no Backoffice (API) + Fiado local (saldo pendente) */}
        {formas.estado === "loading" || formas.estado === "idle" ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando formas de pagamento…
          </p>
        ) : formas.estado === "error" ? (
          <div className="flex items-center justify-between gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            <span>Não foi possível carregar as formas de pagamento.</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={onRecarregarOpcoes}
            >
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            {formas.dados.length === 0 && (
              <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                Nenhuma forma de pagamento cadastrada. Peça ao responsável para cadastrar em
                Configurações no Backoffice.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {formasParaExibir(formas.dados).map((forma) => (
                <Button
                  key={forma}
                  variant="outline"
                  className="h-10 text-xs"
                  disabled={formaCartaoAmbigua(forma)}
                  onClick={() => onAdicionar(forma)}
                >
                  {forma}
                </Button>
              ))}
            </div>
            {formas.dados.some(formaCartaoAmbigua) && (
              <p className="text-[0.7rem] leading-snug text-muted-foreground">
                {formas.dados.filter(formaCartaoAmbigua).join(", ")}: indisponível, o cadastro não
                diz se é débito ou crédito. Use débito ou crédito.
              </p>
            )}
          </>
        )}

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
                    casasFixas
                    onChange={(valor) => onAlterarValor(p.id, valor)}
                    ariaLabel={
                      formaEhDinheiro(p.forma)
                        ? "Valor recebido em dinheiro"
                        : `Valor em ${p.forma}`
                    }
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

                {formaEhDinheiro(p.forma) && (
                  <p className="text-[0.7rem] text-muted-foreground">
                    Digite o valor recebido da cliente. O troco é calculado sozinho.
                  </p>
                )}

                {formaEhCartao(p.forma) && (
                  <ResumoCartao
                    pagamento={p}
                    adquirentes={adquirentes.dados.filter((a) =>
                      suportaModalidade(a, formaEhCredito(p.forma) ? "credito" : "debito"),
                    )}
                    estadoAdquirentes={adquirentes.estado}
                    onRecarregar={onRecarregarOpcoes}
                    onAlterarAdquirente={onAlterarAdquirente}
                    onAlterarParcelas={onAlterarParcelas}
                  />
                )}

                {formaEhFiado(p.forma) && (
                  <ResumoFiado pagamento={p} onAlterarParcelas={onAlterarParcelas} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recebido, troco e UMA indicação de situação — sempre visíveis */}
      {pagamentos.length > 0 && (
        <div className="shrink-0 space-y-1.5 border-t border-border bg-surface px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{temFiado ? "Pago agora" : "Recebido"}</span>
            <span className="font-medium text-surface-foreground">
              {formatMoeda(temFiado ? totais.pagoAgora : totais.recebido)}
            </span>
          </div>
          {totais.troco > 0.001 && (
            <div className="flex items-center justify-between rounded-lg bg-accent px-3 py-2 text-sm">
              <span className="font-medium text-accent-foreground">Troco a devolver</span>
              <span className="font-semibold text-accent-foreground">
                {formatMoeda(totais.troco)}
              </span>
            </div>
          )}
          {situacao && (
            <p
              data-situacao={situacao.tipo}
              className={cn(
                "rounded-md px-2 py-1.5 text-center text-sm font-semibold",
                ESTILO_SITUACAO[situacao.tipo],
              )}
            >
              {situacao.texto}
              {situacao.detalhe && (
                <span className="block text-[0.7rem] font-normal">{situacao.detalhe}</span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Ação principal da etapa — conferência antes do envio */}
      <div className="shrink-0 space-y-2 border-t border-border p-4">
        {bloqueado && (
          <p className="text-center text-[0.7rem] leading-snug text-destructive">
            Sem caixa aberto: solicite a abertura pelo MARIELA Backoffice para finalizar a venda.
          </p>
        )}
        {totais.excedente > 0 && (
          <p role="alert" className="text-center text-[0.7rem] leading-snug text-destructive">
            Os pagamentos passam do total em {formatMoeda(totais.excedente)}. Só dinheiro pode ter
            troco — ajuste os valores.
          </p>
        )}
        {problemaExibido && (
          <div
            role="alert"
            className="space-y-1.5 text-center text-[0.7rem] leading-snug text-destructive"
          >
            <p>{problemaExibido}</p>
            {/* Fiado sem cliente: atalho para o MESMO diálogo de cliente do cabeçalho. */}
            {problemaExibido === MENSAGEM_FIADO_SEM_CLIENTE && onSelecionarCliente && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={onSelecionarCliente}
              >
                Selecionar cliente
              </Button>
            )}
          </div>
        )}
        <Button
          className="h-14 w-full text-base tracking-[0.12em]"
          disabled={
            pagamentos.length === 0 || enviando || bloqueado || totais.excedente > 0 || !!problema
          }
          onClick={onConferir}
        >
          {enviando ? <Loader2 className="size-5 animate-spin" /> : null}
          CONFERIR VENDA
        </Button>
      </div>
    </div>
  );
}
