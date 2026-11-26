import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  formatarDecimalBr,
  formatarDecimalFixoBr,
  parseDecimalBr,
  sanitizarDecimal,
} from "@/lib/decimal";
import { cn } from "@/lib/utils";

/**
 * Campo numérico no padrão brasileiro (vírgula decimal). Mantém o texto
 * digitado enquanto o operador escreve, para que "20," e "20,5" não sejam
 * truncados, e informa o número já convertido.
 *
 * `casasFixas`: fora da edição, exibe sempre `maxDecimais` casas (valores em
 * dinheiro: "289,90", "100,00"). Durante a digitação nada é reformatado.
 */
export function CampoDecimal({
  id,
  valor,
  onChange,
  placeholder = "0,00",
  className,
  maxDecimais = 2,
  casasFixas = false,
  ariaLabel,
}: {
  id?: string;
  valor: number;
  onChange: (valor: number) => void;
  placeholder?: string;
  className?: string;
  maxDecimais?: number;
  casasFixas?: boolean;
  ariaLabel?: string;
}) {
  const exibir = (v: number) =>
    v
      ? casasFixas
        ? formatarDecimalFixoBr(v, maxDecimais)
        : formatarDecimalBr(v, maxDecimais)
      : "";
  const [texto, setTexto] = useState(() => exibir(valor));
  const editando = useRef(false);

  useEffect(() => {
    if (editando.current) return;
    setTexto(exibir(valor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, maxDecimais, casasFixas]);

  // Reflete mudanças externas (troca de modalidade, limites) sem apagar o que
  // está sendo digitado.
  useEffect(() => {
    if (!editando.current) return;
    if (parseDecimalBr(texto) !== valor) {
      setTexto(exibir(valor));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return (
    <Input
      id={id}
      inputMode="decimal"
      placeholder={placeholder}
      value={texto}
      aria-label={ariaLabel}
      onFocus={() => {
        editando.current = true;
      }}
      onBlur={() => {
        editando.current = false;
        setTexto(exibir(valor));
      }}
      onChange={(e) => {
        const limpo = sanitizarDecimal(e.target.value, maxDecimais);
        setTexto(limpo);
        onChange(parseDecimalBr(limpo));
      }}
      className={cn("text-right", className)}
    />
  );
}
