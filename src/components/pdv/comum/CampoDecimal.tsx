import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatarDecimalBr, parseDecimalBr, sanitizarDecimal } from "@/lib/decimal";
import { cn } from "@/lib/utils";

/**
 * Campo numérico no padrão brasileiro (vírgula decimal). Mantém o texto
 * digitado enquanto o operador escreve, para que "20," e "20,5" não sejam
 * truncados, e informa o número já convertido.
 */
export function CampoDecimal({
  id,
  valor,
  onChange,
  placeholder = "0,00",
  className,
  maxDecimais = 2,
  ariaLabel,
}: {
  id?: string;
  valor: number;
  onChange: (valor: number) => void;
  placeholder?: string;
  className?: string;
  maxDecimais?: number;
  ariaLabel?: string;
}) {
  const [texto, setTexto] = useState(() => (valor ? formatarDecimalBr(valor, maxDecimais) : ""));
  const editando = useRef(false);

  useEffect(() => {
    if (editando.current) return;
    setTexto(valor ? formatarDecimalBr(valor, maxDecimais) : "");
  }, [valor, maxDecimais]);

  // Reflete mudanças externas (troca de modalidade, limites) sem apagar o que
  // está sendo digitado.
  useEffect(() => {
    if (!editando.current) return;
    if (parseDecimalBr(texto) !== valor) {
      setTexto(valor ? formatarDecimalBr(valor, maxDecimais) : "");
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
        setTexto(valor ? formatarDecimalBr(valor, maxDecimais) : "");
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
