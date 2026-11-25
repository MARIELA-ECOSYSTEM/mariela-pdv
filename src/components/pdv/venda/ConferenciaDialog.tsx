import { useEffect, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatarDecimalBr } from "@/lib/decimal";
import { formatMoeda } from "@/lib/format";
import { aplicarTroco, formaEhCredito, formaEhDinheiro, formaEhFiado } from "@/lib/pagamento";
import { encontrarAdquirente, valorParcela } from "@/lib/adquirente";
import { totaisDoItem, type PdvPagamentoTotais, type PdvVendaTotais } from "@/lib/venda-totais";
import type { PdvAdquirente } from "@/types/adquirente";
import type { PdvItemCarrinho } from "@/types/carrinho";
import type { PdvCliente } from "@/types/cliente";
import type { PdvPagamentoLinha } from "@/types/venda";

const SITUACAO = {
  pago: { rotulo: "PAGO", classe: "bg-success/15 text-success" },
  parcial: { rotulo: "PAGAMENTO PARCIAL", classe: "bg-primary/15 text-primary" },
  pendente: { rotulo: "PENDENTE", classe: "bg-destructive/10 text-destructive" },
  fiado: { rotulo: "FIADO — SALDO A RECEBER", classe: "bg-primary/15 text-primary" },
} as const;

function Linha({
  rotulo,
  valor,
  destaque = false,
  negativo = false,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
  negativo?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={destaque ? "font-medium" : "text-muted-foreground"}>{rotulo}</span>
      <span className={destaque ? "font-semibold" : "font-medium"}>
        {negativo && valor > 0 ? "− " : ""}
        {formatMoeda(valor)}
      </span>
    </div>
  );
}

export function ConferenciaDialog({
  aberto,
  vendedorNome,
  cliente,
  itens,
  totais,
  pagamentos,
  pagamentoTotais,
  adquirentes = [],
  enviando,
  pendencia,
  onVoltar,
  onConfirmar,
  onRegistrarComoNovaVenda,
}: {
  aberto: boolean;
  vendedorNome: string;
  cliente: PdvCliente | null;
  itens: PdvItemCarrinho[];
  totais: PdvVendaTotais;
  pagamentos: PdvPagamentoLinha[];
  pagamentoTotais: PdvPagamentoTotais;
  adquirentes?: PdvAdquirente[];
  enviando: boolean;
  /** Tentativa anterior desta venda ainda não resolvida (ver controle-venda.ts). */
  pendencia?: "desconhecida" | "conflito" | undefined;
  onVoltar: () => void;
  onConfirmar: () => void;
  onRegistrarComoNovaVenda: () => void;
}) {
  const situacao = SITUACAO[pagamentoTotais.situacao];
  // Valor efetivamente aplicado à venda por linha (dinheiro descontado do troco).
  const aplicados = aplicarTroco(pagamentos, totais.total);
  const conflito = pendencia === "conflito";
  // Registrar como nova venda exige um segundo toque explícito.
  const [confirmandoNova, setConfirmandoNova] = useState(false);
  useEffect(() => {
    if (!aberto || !conflito) setConfirmandoNova(false);
  }, [aberto, conflito]);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && !enviando && onVoltar()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conferir venda</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {pendencia === "desconhecida" && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>
                A tentativa anterior desta venda ficou <strong>sem confirmação</strong>. Finalizar
                agora usa a mesma tentativa: se ela já tiver sido registrada, o sistema{" "}
                <strong>não registra de novo</strong>.
              </p>
            </div>
          )}

          {conflito && (
            <div
              role="alert"
              className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
            >
              <p className="flex items-start gap-2 font-medium text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />A tentativa anterior desta venda
                JÁ FOI registrada, com outros itens.
              </p>
              <p className="text-muted-foreground">
                Confira a venda anterior no Backoffice. Os itens abaixo ainda NÃO foram vendidos. Só
                registre como nova venda se a cliente está levando estes itens além da venda
                anterior.
              </p>
              {confirmandoNova ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setConfirmandoNova(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setConfirmandoNova(false);
                      onRegistrarComoNovaVenda();
                    }}
                  >
                    Confirmo: é uma nova venda
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setConfirmandoNova(true)}
                >
                  Registrar estes itens como nova venda
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <p className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
                Vendedora
              </p>
              <p className="truncate text-sm font-medium">{vendedorNome}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
                Cliente
              </p>
              <p className="truncate text-sm font-medium">{cliente?.nome ?? "Sem cliente"}</p>
            </div>
          </div>

          {/* Produtos */}
          <section className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Produtos
            </p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {itens.map((item) => {
                const t = totaisDoItem(item);
                return (
                  <li key={item.linhaId} className="flex gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {[item.cor, item.tamanho].filter(Boolean).join(" · ") || "Única"} ·{" "}
                        {item.quantidade} × {formatMoeda(item.precoUnitario)}
                      </p>
                      {t.desconto > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Desconto do item: − {formatMoeda(t.desconto)} (
                          {String(t.percentualDesconto).replace(".", ",")}%)
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {t.desconto > 0 && (
                        <p className="text-[0.7rem] text-muted-foreground line-through">
                          {formatMoeda(t.bruto)}
                        </p>
                      )}
                      <p className="text-sm font-semibold">{formatMoeda(t.liquido)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Resumo financeiro */}
          <section className="space-y-2 rounded-lg border border-border bg-surface p-3">
            <Linha rotulo="Subtotal dos produtos" valor={totais.subtotalBruto} />
            <Linha rotulo="Descontos dos itens" valor={totais.descontoItens} negativo />
            <Linha rotulo="Subtotal após descontos dos itens" valor={totais.subtotalAposItens} />
            <Linha rotulo="Desconto da venda" valor={totais.descontoVenda} negativo />
            <div className="flex items-end justify-between border-t border-border pt-2">
              <span className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Total da venda
              </span>
              <span className="text-xl font-semibold text-primary">
                {formatMoeda(totais.total)}
              </span>
            </div>
          </section>

          {/* Pagamentos */}
          <section className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Pagamentos
            </p>
            {pagamentos.length === 0 ? (
              <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                Nenhum pagamento informado.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {pagamentos.map((p, indice) => {
                  const adquirente = encontrarAdquirente(adquirentes, p.adquirenteId);
                  const aplicado = aplicados[indice]?.valorAplicado ?? p.valor;
                  const comTroco = formaEhDinheiro(p.forma) && aplicado < p.valor;
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.forma}</p>
                        <p className="text-xs text-muted-foreground">
                          {adquirente ? `${adquirente.nome} · ` : ""}
                          {(formaEhCredito(p.forma) || formaEhFiado(p.forma)) &&
                          p.parcelas &&
                          p.parcelas > 1
                            ? `${p.parcelas}x de ${formatMoeda(valorParcela(p.valor, p.parcelas))}`
                            : formaEhFiado(p.forma)
                              ? "Pagamento posterior"
                              : "À vista"}
                          {p.tarifa != null ? ` · Tarifa ${formatMoeda(p.tarifa)}` : ""}
                          {p.valorLiquido != null
                            ? ` · Líquido ${formatMoeda(p.valorLiquido)}`
                            : ""}
                          {comTroco ? ` · Recebido ${formatMoeda(p.valor)}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-semibold">{formatMoeda(aplicado)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
              <Linha
                rotulo={pagamentoTotais.fiado > 0.001 ? "Pago agora (entrada)" : "Total recebido"}
                valor={
                  pagamentoTotais.fiado > 0.001
                    ? pagamentoTotais.pagoAgora
                    : pagamentoTotais.recebido
                }
                destaque
              />
              {pagamentoTotais.fiado > 0.001 && (
                <Linha rotulo="Fiado (a receber)" valor={pagamentoTotais.fiado} />
              )}
              <Linha rotulo="Valor pendente" valor={pagamentoTotais.pendente} />
              {pagamentoTotais.troco > 0.001 && (
                <Linha rotulo="Troco a devolver" valor={pagamentoTotais.troco} destaque />
              )}
            </div>
          </section>

          {/* Situação */}
          <div
            className={`rounded-lg px-3 py-2 text-center text-sm font-semibold tracking-[0.14em] ${situacao.classe}`}
          >
            {situacao.rotulo}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              className="h-12 flex-1 text-base"
              disabled={enviando}
              onClick={onVoltar}
            >
              VOLTAR E EDITAR
            </Button>
            <Button
              className="h-12 flex-1 text-base"
              disabled={enviando || conflito}
              onClick={onConfirmar}
            >
              {enviando ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  FINALIZANDO VENDA…
                </>
              ) : (
                "FINALIZAR VENDA"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
