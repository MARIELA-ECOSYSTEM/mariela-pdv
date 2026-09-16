import { useState } from "react";
import { CalendarDays, History, Info, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Periodo = "hoje" | "ontem" | "personalizado";

export function MinhasVendasDialog({
  aberto,
  vendedorNome,
  onFechar,
}: {
  aberto: boolean;
  vendedorNome: string;
  onFechar: () => void;
}) {
  const [periodo, setPeriodo] = useState<Periodo>("hoje");

  return (
    <Dialog open={aberto} onOpenChange={(valor) => !valor && onFechar()}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 pb-4 pt-6 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <History className="size-5 text-primary" />
            Minhas vendas
          </DialogTitle>
          <DialogDescription>
            Histórico de {vendedorNome}. Esta consulta nunca altera a venda em andamento.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 border-b border-border bg-surface px-6 py-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-1.5">
            <Label htmlFor="historico-periodo">Período</Label>
            <Select value={periodo} onValueChange={(valor) => setPeriodo(valor as Periodo)}>
              <SelectTrigger id="historico-periodo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="ontem">Ontem</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodo === "personalizado" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="historico-inicio">Data inicial</Label>
                <Input id="historico-inicio" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="historico-fim">Data final</Label>
                <Input id="historico-fim" type="date" />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="historico-cliente">Cliente</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input id="historico-cliente" className="pl-9" placeholder="Nome do cliente" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="historico-status">Status</Label>
            <Select defaultValue="todos">
              <SelectTrigger id="historico-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="historico-pagamento">Pagamento</Label>
            <Select defaultValue="todos">
              <SelectTrigger id="historico-pagamento">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as formas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="historico-situacao">Situação</Label>
            <Select defaultValue="todas">
              <SelectTrigger id="historico-situacao">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
              </SelectContent>
            </Select>
          </aside>
        </div>

        <div className="grid min-h-72 flex-1 overflow-y-auto md:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
          <section className="flex items-center justify-center border-b border-border px-6 py-10 md:border-b-0 md:border-r">
            <div className="max-w-sm text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <CalendarDays className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">Histórico aguardando integração</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                O contrato atual do PDV ainda não disponibiliza a consulta das vendas do vendedor.
                Nenhuma venda fictícia é exibida aqui.
              </p>
            </div>
          </section>

          <aside className="flex items-center justify-center bg-surface px-6 py-10" aria-label="Detalhes da venda">
            <div className="max-w-xs text-center">
              <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                Detalhes da venda
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Selecione uma venda para conferir itens, descontos, pagamentos, parcelas e status.
              </p>
              <p className="mt-4 flex items-start justify-center gap-1.5 text-xs leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                Quando a consulta oficial estiver disponível, os dados serão restritos à sua sessão.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-border px-6 py-4">
          <Button variant="secondary" onClick={onFechar}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}