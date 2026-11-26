/**
 * Para onde o foco vai quando o diálogo do produto fecha (sem timers: chamado
 * no evento de fim de fechamento do próprio diálogo).
 *  - Depois de ADICIONAR: busca do catálogo (próximo produto).
 *  - Depois de cancelar/fechar: o card que abriu o diálogo, se ainda estiver
 *    na tela e utilizável; senão, a busca.
 * `null` = nenhum destino utilizável (o foco fica onde o navegador deixar).
 */
export function destinoDoFocoAoFecharProduto({
  adicionou,
  origem,
  busca,
}: {
  adicionou: boolean;
  origem: HTMLElement | null;
  busca: HTMLInputElement | null;
}): HTMLElement | null {
  if (!adicionou && utilizavel(origem)) return origem;
  if (utilizavel(busca)) return busca;
  return null;
}

function utilizavel(el: HTMLElement | null): el is HTMLElement {
  if (!el || !el.isConnected) return false;
  if ((el as HTMLButtonElement | HTMLInputElement).disabled) return false;
  return el.getAttribute("aria-hidden") !== "true";
}
