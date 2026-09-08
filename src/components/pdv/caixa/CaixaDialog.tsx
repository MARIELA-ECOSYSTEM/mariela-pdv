import { useState } from "react";
import { Loader2, LockKeyhole, TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseValor } from "@/lib/format";
import type { PdvCaixaEstado } from "@/types/caixa";

export function CaixaDialog({
  estado,
  onAbrirCaixa,
}: {
  estado: PdvCaixaEstado;
  onAbrirCaixa: (valorAbertura: number) => void;
}) {
  const [valor, setValor] = useState("");
  const aberto = estado !== "aberto";

  return (
    <Dialog open={aberto}>
      <DialogContent
        className="max-w-md [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LockKeyhole className="size-5 text-primary" />
            {estado === "carregando" ? "Verificando o caixa" : "Caixa fechado"}
          </DialogTitle>
        </DialogHeader>

        {estado === "carregando" && (
          <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" />
            Consultando o caixa da loja…
          </div>
        )}

        {estado === "abrindo" && (
          <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" />
            Abrindo o caixa…
          </div>
        )}

        {(estado === "fechado" || estado === "conflito" || estado === "erro") && (
          <div className="space-y-4">
            {estado === "conflito" && (
              <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                Já existe um caixa aberto nesta loja. Fale com a gerência antes de continuar.
              </p>
            )}
            {estado === "erro" && (
              <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                Não conseguimos verificar o caixa agora. Tente abrir novamente.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Para começar a vender, abra o caixa informando o valor inicial em dinheiro.
            </p>
            <div className="space-y-2">
              <Label htmlFor="valor-abertura">Valor de abertura</Label>
              <Input
                id="valor-abertura"
                inputMode="decimal"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="h-11 text-lg"
              />
            </div>
            <Button
              className="h-12 w-full text-base"
              onClick={() => onAbrirCaixa(parseValor(valor))}
            >
              ABRIR CAIXA
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
