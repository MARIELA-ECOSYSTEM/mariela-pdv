/** SIMULADO: regra pura de apresentação da situação do pagamento (F-01). */
import { describe, expect, it } from "vitest";
import { mensagemFaltaReceber, MENSAGEM_FIADO_SEM_CLIENTE } from "./pagamento";
import { situacaoPagamento } from "./situacao-pagamento";

const base = { pendente: 0, excedente: 0, fiado: 0, recebido: 389.9 };
const s = (over: Partial<Parameters<typeof situacaoPagamento>[0]>) =>
  situacaoPagamento({
    quantidadePagamentos: 1,
    totais: base,
    problema: null,
    bloqueado: false,
    ...over,
  });

describe("situacaoPagamento (F-01)", () => {
  it("sem pagamentos: nenhuma situação", () => {
    expect(s({ quantidadePagamentos: 0 })).toBeNull();
  });

  it("válido e pago: Pagamento completo", () => {
    expect(s({})).toMatchObject({ tipo: "completo", texto: "Pagamento completo" });
  });

  it("valor acima do total (PIX 500 em 389,90): NÃO é 'completo'", () => {
    const r = s({ totais: { ...base, recebido: 500, excedente: 110.1 } });
    expect(r?.tipo).toBe("ajustar");
    expect(r?.texto).not.toMatch(/completo/i);
  });

  it("crédito sem maquininha (problema de validação): NÃO é 'completo'", () => {
    const r = s({ problema: "Escolha a maquininha do pagamento em Crédito." });
    expect(r).toMatchObject({ tipo: "ajustar", texto: "Pagamento a ajustar" });
    // Não repete o motivo (que fica no aviso abaixo).
    expect(JSON.stringify(r)).not.toContain("maquininha");
  });

  it("insuficiente: 'Falta receber' com o valor, mesmo havendo o problema de falta", () => {
    const r = s({
      totais: { ...base, recebido: 100, pendente: 289.9 },
      problema: mensagemFaltaReceber(289.9),
    });
    expect(r?.tipo).toBe("falta");
    expect(r?.texto).toMatch(/^Falta receber R\$\s289,90$/);
  });

  it("Fiado sem cliente: a ajustar (e não 'Fiado' positivo)", () => {
    const r = s({
      totais: { ...base, recebido: 389.9, fiado: 289.9 },
      problema: MENSAGEM_FIADO_SEM_CLIENTE,
    });
    expect(r?.tipo).toBe("ajustar");
  });

  it("Fiado válido com cliente: mostra o saldo e a cliente", () => {
    const r = s({ totais: { ...base, fiado: 289.9 }, clienteNome: "Carolina" });
    expect(r?.tipo).toBe("fiado");
    expect(r?.texto).toMatch(/^Fiado: R\$\s289,90 a receber de Carolina$/);
  });

  it("caixa fechado com valores corretos: bloqueado (não 'completo')", () => {
    expect(s({ bloqueado: true })).toMatchObject({ tipo: "bloqueado", texto: "Venda bloqueada" });
  });

  it("prioridade: falta > ajustar > bloqueado", () => {
    expect(
      s({ totais: { ...base, pendente: 10, excedente: 0 }, problema: "x", bloqueado: true })?.tipo,
    ).toBe("falta");
    expect(s({ problema: "x", bloqueado: true })?.tipo).toBe("ajustar");
  });
});
