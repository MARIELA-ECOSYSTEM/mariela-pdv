import { CheckCircle2, Clock, Loader2, TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatMoeda } from "@/lib/format";
import type { PdvVendaTentativa } from "@/types/venda";

export function VendaDialog({
  tentativa,
  onFechar,
  onNovaVenda,
  onTentarNovamente,
}: {
  tentativa: PdvVendaTentativa | null;
  onFechar: () => void;
  onNovaVenda: () => void;
  onTentarNovamente: () => void;
}) {
  const aberto = !!tentativa && tentativa.estado !== "rascunho";
  const estado = tentativa?.estado;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && estado !== "processando" && onFechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {estado === "processando" && "Registrando a venda"}
            {estado === "em_pagamento" && "Aguardando pagamento"}
            {estado === "concluida" && "Venda concluída"}
            {estado === "erro" && "A venda não foi concluída"}
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
              {formatMoeda(tentativa?.total ?? 0)}
            </p>
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
              <Button variant="secondary" className="flex-1" onClick={onFechar}>
                Voltar ao carrinho
              </Button>
              <Button className="flex-1" onClick={onTentarNovamente}>
                Tentar novamente
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
