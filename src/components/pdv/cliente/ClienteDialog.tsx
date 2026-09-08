import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClienteBusca } from "@/components/pdv/cliente/ClienteBusca";
import type { PdvCliente } from "@/types/cliente";

export function ClienteDialog({
  aberto,
  onFechar,
  onSelecionar,
}: {
  aberto: boolean;
  onFechar: () => void;
  onSelecionar: (cliente: PdvCliente) => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar cliente</DialogTitle>
          <DialogDescription>Busque por nome ou telefone.</DialogDescription>
        </DialogHeader>

        <ClienteBusca
          ativo={aberto}
          autoFocus
          onSelecionar={(cliente) => {
            onSelecionar(cliente);
            onFechar();
          }}
        />

        <Button variant="ghost" onClick={onFechar}>
          Continuar sem cliente
        </Button>
      </DialogContent>
    </Dialog>
  );
}
