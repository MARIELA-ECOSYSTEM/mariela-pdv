import { Loader2, TriangleAlert } from "lucide-react";
import type { PdvCaixaEstado } from "@/types/caixa";

/**
 * Aviso discreto sobre o caixa. O PDV NÃO abre caixa: a abertura é
 * exclusividade do MARIELA Backoffice e o mesmo caixa é compartilhado por
 * todos os vendedores. Aqui apenas refletimos o estado consultado na API
 * (GET /pdv/caixa/atual) — nenhuma ação de abertura é oferecida.
 */
export function CaixaAviso({ estado }: { estado: PdvCaixaEstado }) {
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
      className="flex shrink-0 items-start gap-2 border-b border-border bg-destructive/10 px-4 py-2.5 text-xs leading-snug text-destructive"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <span>
        {estado === "erro"
          ? "Não foi possível verificar o caixa agora. "
          : "Nenhum caixa aberto no momento. "}
        Solicite ao responsável a abertura do caixa pelo MARIELA Backoffice para finalizar vendas.
      </span>
    </div>
  );
}
