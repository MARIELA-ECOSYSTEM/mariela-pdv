/**
 * Leitura da configuração de adquirentes para a interface.
 *
 * Não existe regra fixa "1x até 12x": as parcelas oferecidas vêm sempre da
 * configuração da adquirente. Tarifa e valor líquido só são apresentados quando
 * a configuração/API os informa — o backend segue autoridade dos valores finais.
 */
import { arredondarCentavos } from "@/lib/desconto";
import type { PdvAdquirente, PdvModalidadeCartao } from "@/types/adquirente";

export function encontrarAdquirente(
  adquirentes: PdvAdquirente[],
  id: string | undefined | null,
): PdvAdquirente | undefined {
  if (!id) return undefined;
  return adquirentes.find((a) => a.id === id);
}

export function suportaModalidade(
  adquirente: PdvAdquirente | undefined,
  modalidade: PdvModalidadeCartao,
): boolean {
  if (!adquirente) return false;
  if (modalidade === "debito") return !!adquirente.modalidades.debito;
  return (adquirente.modalidades.credito?.opcoes?.length ?? 0) > 0;
}

/** Parcelas autorizadas para o crédito daquela adquirente, em ordem crescente. */
export function parcelasPermitidas(adquirente: PdvAdquirente | undefined): number[] {
  const opcoes = adquirente?.modalidades.credito?.opcoes ?? [];
  return opcoes
    .map((o) => Math.floor(o.parcelas))
    .filter((n) => Number.isFinite(n) && n >= 1)
    .sort((a, b) => a - b);
}

/** Mantém a escolha do operador quando autorizada; senão cai na menor opção. */
export function ajustarParcelas(
  adquirente: PdvAdquirente | undefined,
  parcelas: number | undefined,
): number | undefined {
  const permitidas = parcelasPermitidas(adquirente);
  if (permitidas.length === 0) return undefined;
  if (parcelas && permitidas.includes(parcelas)) return parcelas;
  return permitidas[0];
}

/**
 * Tarifa em R$ conforme a configuração. Retorna null quando a configuração não
 * informa tarifa — nesse caso a interface não deve exibir valor nenhum.
 */
export function tarifaConfigurada(
  adquirente: PdvAdquirente | undefined,
  modalidade: PdvModalidadeCartao,
  valor: number,
  parcelas?: number | undefined,
): number | null {
  if (!adquirente || !Number.isFinite(valor) || valor <= 0) return null;
  const percentual =
    modalidade === "debito"
      ? adquirente.modalidades.debito?.tarifaPercentual
      : adquirente.modalidades.credito?.opcoes.find((o) => o.parcelas === (parcelas ?? 1))
          ?.tarifaPercentual;
  if (percentual == null || !Number.isFinite(percentual)) return null;
  return arredondarCentavos((valor * percentual) / 100);
}

/** Valor de cada parcela apenas para apresentação ao operador. */
export function valorParcela(valor: number, parcelas: number | undefined): number {
  const n = Math.max(1, Math.floor(parcelas ?? 1));
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  return arredondarCentavos(valor / n);
}
