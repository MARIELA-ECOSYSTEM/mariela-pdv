import { CheckCircle2, CircleHelp, Clock, Loader2, TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatMoeda } from "@/lib/format";
import type { PdvVendaTentativa } from "@/types/venda";

/**
 * Resultado do envio da venda. Regras de fechamento:
 *  - processando: não fecha;
 *  - concluída: fechar equivale a "Nova venda" (o carrinho já vendido nunca
 *    volta para a tela, evitando um segundo envio do mesmo carrinho);
 *  - demais: fechar volta ao carrinho mantendo a MESMA tentativa (mesma chave).
 */
export function VendaDialog({
  tentativa,
  onVoltarAoCarrinho,
  onNovaVenda,
  onTentarNovamente,
}: {
  tentativa: PdvVendaTentativa | null;
  onVoltarAoCarrinho: () => void;
  onNovaVenda: () => void;
  onTentarNovamente: () => void;
}) {
  const aberto = !!tentativa && tentativa.estado !== "rascunho";
  const estado = tentativa?.estado;

  function fechar() {
    if (estado === "processando") return;
    if (estado === "concluida") onNovaVenda();
    else onVoltarAoCarrinho();
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && fechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {estado === "processando" && "Registrando a venda"}
            {estado === "em_pagamento" && "Aguardando pagamento"}
            {estado === "concluida" && "Venda concluída"}
            {estado === "erro" && "A venda não foi concluída"}
            {estado === "desconhecida" && "Venda sem confirmação"}
            {estado === "conflito" && "A venda anterior já foi registrada"}
          </DialogTitle>
        </DialogHeader>

        {estado === "processando" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Não feche esta janela. Estamos registrando a venda.
            </p>
          </div>
        )}

        {estado === "em_pagamento" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Clock className="size-8 text-primary" />
            <p className="text-sm text-muted-foreground">
              A venda está em pagamento. Conclua o recebimento com a cliente.
            </p>
          </div>
        )}

        {estado === "concluida" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="size-10 text-success" />
            <p className="text-2xl font-semibold text-foreground">
              {formatMoeda(tentativa?.valorFinal ?? tentativa?.total ?? 0)}
            </p>
            {tentativa?.codigo && (
              <p className="text-sm font-medium text-foreground">Venda {tentativa.codigo}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {tentativa?.itens?.length ?? 0} item(ns) vendidos com sucesso.
            </p>
            <Button className="mt-2 h-12 w-full text-base" onClick={onNovaVenda}>
              NOVA VENDA
            </Button>
          </div>
        )}

        {estado === "erro" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <TriangleAlert className="size-8 text-destructive" />
            <p className="text-sm text-muted-foreground">
              {tentativa?.mensagemErro ??
                "Não foi possível registrar a venda. O carrinho continua aqui."}
            </p>
            <div className="mt-2 flex w-full gap-2">
              <Button variant="secondary" className="flex-1" onClick={onVoltarAoCarrinho}>
                Voltar ao carrinho
              </Button>
              <Button className="flex-1" onClick={onTentarNovamente}>
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {estado === "desconhecida" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CircleHelp className="size-8 text-primary" />
            <p className="text-sm text-muted-foreground">{tentativa?.mensagemErro}</p>
            <div className="mt-2 flex w-full flex-col gap-2">
              <Button className="h-12 w-full text-base" onClick={onTentarNovamente}>
                Tentar novamente
              </Button>
              <Button variant="secondary" className="w-full" onClick={onVoltarAoCarrinho}>
                Voltar ao carrinho
              </Button>
            </div>
          </div>
        )}

        {estado === "conflito" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <TriangleAlert className="size-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{tentativa?.mensagemErro}</p>
            <Button variant="secondary" className="mt-2 w-full" onClick={onVoltarAoCarrinho}>
              Voltar ao carrinho
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
