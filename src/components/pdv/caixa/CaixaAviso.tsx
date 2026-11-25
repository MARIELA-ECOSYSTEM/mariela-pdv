import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PdvCaixaEstado } from "@/types/caixa";

/**
 * Aviso discreto sobre o caixa. O PDV NÃO abre caixa: a abertura é
 * exclusividade do MARIELA Backoffice e o mesmo caixa é compartilhado por
 * todos os vendedores. Aqui apenas refletimos o estado consultado na API
 * (GET /pdv/caixa/atual) e permitimos consultá-lo de novo depois que o
 * responsável abrir o caixa — sem recarregar o PDV.
 */
export function CaixaAviso({
  estado,
  verificando = false,
  onVerificar,
}: {
  estado: PdvCaixaEstado;
  verificando?: boolean;
  onVerificar?: () => void;
}) {
  if (estado === "aberto") return null;

  if (estado === "carregando") {
    return (
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-surface px-4 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" />
        Verificando o caixa da loja…
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex shrink-0 items-center gap-2 border-b border-border bg-destructive/10 px-4 py-2.5 text-xs leading-snug text-destructive"
    >
      <TriangleAlert className="size-4 shrink-0" />
      <span className="flex-1">
        {estado === "erro"
          ? "Não foi possível verificar o caixa agora. "
          : "Nenhum caixa aberto no momento. "}
        Solicite ao responsável a abertura do caixa pelo MARIELA Backoffice para finalizar vendas.
      </span>
      {onVerificar && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 shrink-0 text-xs"
          disabled={verificando}
          onClick={onVerificar}
        >
          {verificando ? <Loader2 className="size-3 animate-spin" /> : null}
          Verificar novamente
        </Button>
      )}
    </div>
  );
}
