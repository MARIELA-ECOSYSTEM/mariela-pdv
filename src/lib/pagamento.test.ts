import { describe, expect, it } from "vitest";
import type { PdvAdquirente } from "@/types/adquirente";
import {
  aplicarTroco,
  calcularTroco,
  formaCartaoAmbigua,
  formasParaExibir,
  mensagemFaltaReceber,
  modalidadeCartao,
  validarPagamentos,
  formaEhCartao,
  formaEhCredito,
  formaEhDebito,
  formaEhFiado,
  montarPagamentosParaEnvio,
  opcoesParcelas,
} from "./pagamento";

describe("formas de pagamento", () => {
  it("reconhece crédito e débito com ou sem acento", () => {
    expect(formaEhCredito("Crédito")).toBe(true);
    expect(formaEhCredito("credito")).toBe(true);
    expect(formaEhDebito("Débito")).toBe(true);
    expect(formaEhCartao("Débito")).toBe(true);
  });

  it("dinheiro e PIX não são cartão", () => {
    expect(formaEhCartao("Dinheiro")).toBe(false);
    expect(formaEhCartao("PIX")).toBe(false);
  });

  it("reconhece fiado e não confunde com cartão", () => {
    expect(formaEhFiado("Fiado")).toBe(true);
    expect(formaEhFiado("fiado 3x")).toBe(true);
    expect(formaEhFiado("Crédito")).toBe(false);
    expect(formaEhCartao("Fiado")).toBe(false);
  });

  it("oferece parcelas de 1x até o máximo permitido", () => {
    expect(opcoesParcelas(6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(opcoesParcelas()[0]).toBe(1);
  });
});

describe("montarPagamentosParaEnvio (contrato de POST /pdv/vendas)", () => {
  it("uma venda sem Fiado envia todos os pagamentos (cartão com modalidade e adquirente)", () => {
    const resultado = montarPagamentosParaEnvio(
      [
        { forma: "Dinheiro", valor: 50 },
        { forma: "Crédito", valor: 50, parcelas: 3, adquirenteId: "adq-1" },
      ],
      100,
    );

    expect(resultado.pagamentos).toEqual([
      { forma: "Dinheiro", valor: 50 },
      { forma: "Crédito", valor: 50, parcelas: 3, modalidade: "credito", adquirenteId: "adq-1" },
    ]);
    expect(resultado.totalParcelas).toBeUndefined();
  });

  it("a linha Fiado NUNCA é enviada como pagamento — só vira totalParcelas", () => {
    const resultado = montarPagamentosParaEnvio(
      [
        { forma: "Dinheiro", valor: 100 },
        { forma: "Fiado", valor: 200, parcelas: 4 },
      ],
      300,
    );

    expect(resultado.pagamentos).toEqual([{ forma: "Dinheiro", valor: 100 }]);
    expect(resultado.pagamentos.some((p) => p.forma === "Fiado")).toBe(false);
    expect(resultado.totalParcelas).toBe(4);
  });

  it("Fiado sem parcelas definidas não envia totalParcelas (o backend usa o padrão dele)", () => {
    const resultado = montarPagamentosParaEnvio([{ forma: "Fiado", valor: 200 }], 200);

    expect(resultado.pagamentos).toEqual([]);
    expect(resultado.totalParcelas).toBeUndefined();
  });

  it("venda 100% fiado gera um payload de pagamentos vazio (backend calcula o pendente sozinho)", () => {
    const resultado = montarPagamentosParaEnvio([{ forma: "Fiado", valor: 300, parcelas: 2 }], 300);

    expect(resultado.pagamentos).toEqual([]);
    expect(resultado.totalParcelas).toBe(2);
  });
});

describe("dinheiro e troco", () => {
  it("dinheiro com troco: recebe R$ 100 numa venda de R$ 89,90 → envia R$ 89,90 e troco R$ 10,10", () => {
    const pagamentos = [{ forma: "Dinheiro", valor: 100 }];

    expect(calcularTroco(pagamentos, 89.9)).toEqual({ troco: 10.1, excedente: 0 });
    const envio = montarPagamentosParaEnvio(pagamentos, 89.9);
    expect(envio.pagamentos).toEqual([{ forma: "Dinheiro", valor: 89.9 }]);
    // Respeita a regra do backend: soma dos pagamentos ≤ valor final.
    expect(envio.pagamentos.reduce((s, p) => s + p.valor, 0)).toBeLessThanOrEqual(89.9);
  });

  it("dinheiro exato: sem troco e o valor vai inalterado", () => {
    const pagamentos = [{ forma: "Dinheiro", valor: 89.9 }];

    expect(calcularTroco(pagamentos, 89.9)).toEqual({ troco: 0, excedente: 0 });
    expect(montarPagamentosParaEnvio(pagamentos, 89.9).pagamentos).toEqual([
      { forma: "Dinheiro", valor: 89.9 },
    ]);
  });

  it("dinheiro menor que o total: sem troco, envia o recebido (o restante fica pendente)", () => {
    const pagamentos = [{ forma: "Dinheiro", valor: 50 }];

    expect(calcularTroco(pagamentos, 89.9)).toEqual({ troco: 0, excedente: 0 });
    expect(montarPagamentosParaEnvio(pagamentos, 89.9).pagamentos).toEqual([
      { forma: "Dinheiro", valor: 50 },
    ]);
  });

  it("PIX + dinheiro: o troco sai só do dinheiro", () => {
    const pagamentos = [
      { forma: "PIX", valor: 60 },
      { forma: "Dinheiro", valor: 50 },
    ];

    expect(calcularTroco(pagamentos, 100)).toEqual({ troco: 10, excedente: 0 });
    expect(montarPagamentosParaEnvio(pagamentos, 100).pagamentos).toEqual([
      { forma: "PIX", valor: 60 },
      { forma: "Dinheiro", valor: 40 },
    ]);
  });

  it("cartão cobre o total e ainda há dinheiro: a linha de dinheiro vira troco integral e não é enviada", () => {
    const pagamentos = [
      { forma: "Crédito", valor: 100, parcelas: 1, adquirenteId: "adq-1" },
      { forma: "Dinheiro", valor: 20 },
    ];

    expect(calcularTroco(pagamentos, 100)).toEqual({ troco: 20, excedente: 0 });
    expect(montarPagamentosParaEnvio(pagamentos, 100).pagamentos).toEqual([
      { forma: "Crédito", valor: 100, parcelas: 1, modalidade: "credito", adquirenteId: "adq-1" },
    ]);
  });

  it("valor acima do total sem dinheiro não vira troco: é excedente (pagamento inválido)", () => {
    expect(calcularTroco([{ forma: "PIX", valor: 120 }], 100)).toEqual({
      troco: 0,
      excedente: 20,
    });
  });

  it("troco desconta da última linha de dinheiro primeiro", () => {
    const aplicados = aplicarTroco(
      [
        { forma: "Dinheiro", valor: 50 },
        { forma: "Dinheiro", valor: 70 },
      ],
      100,
    );
    expect(aplicados.map((p) => p.valorAplicado)).toEqual([50, 50]);
  });

  it("dinheiro + fiado com troco: o fiado nunca é enviado e o dinheiro vai só pelo aplicado", () => {
    const envio = montarPagamentosParaEnvio(
      [
        { forma: "Dinheiro", valor: 100 },
        { forma: "Fiado", valor: 50, parcelas: 2 },
      ],
      120,
    );
    expect(envio.pagamentos).toEqual([{ forma: "Dinheiro", valor: 70 }]);
    expect(envio.totalParcelas).toBe(2);
  });

  it("centavos sem ruído de ponto flutuante", () => {
    const envio = montarPagamentosParaEnvio(
      [
        { forma: "PIX", valor: 0.1 },
        { forma: "Dinheiro", valor: 0.3 },
      ],
      0.3,
    );
    expect(envio.pagamentos).toEqual([
      { forma: "PIX", valor: 0.1 },
      { forma: "Dinheiro", valor: 0.2 },
    ]);
  });
});

// Adquirentes no formato real de GET /pdv/pagamentos/adquirentes.
const STONE: PdvAdquirente = {
  id: "adq-stone",
  nome: "Stone",
  modalidades: {
    debito: { tarifaPercentual: 1.2 },
    credito: {
      opcoes: [
        { parcelas: 1, tarifaPercentual: 2.9 },
        { parcelas: 6, tarifaPercentual: 4.5 },
      ],
    },
  },
};
const SO_CREDITO: PdvAdquirente = {
  id: "adq-cielo",
  nome: "Cielo",
  modalidades: { debito: null, credito: { opcoes: [{ parcelas: 3, tarifaPercentual: 3.3 }] } },
};
const ADQUIRENTES = [STONE, SO_CREDITO];

describe("modalidade das formas cadastradas", () => {
  it("débito e crédito exigem adquirente; dinheiro, PIX e outras não", () => {
    expect(modalidadeCartao("Crédito")).toBe("credito");
    expect(modalidadeCartao("Cartão de crédito")).toBe("credito");
    expect(modalidadeCartao("Débito")).toBe("debito");
    expect(modalidadeCartao("Dinheiro")).toBeUndefined();
    expect(modalidadeCartao("PIX")).toBeUndefined();
    expect(modalidadeCartao("Vale-presente")).toBeUndefined();
  });
});

describe("formasParaExibir (formas reais da API)", () => {
  it("mostra exatamente as formas cadastradas, na ordem da API, mais o Fiado local", () => {
    expect(formasParaExibir(["PIX", "Cartão de Crédito", "Dinheiro"])).toEqual([
      "PIX",
      "Cartão de Crédito",
      "Dinheiro",
      "Fiado",
    ]);
  });

  it("não inventa formas: lista vazia da API mostra apenas o Fiado local", () => {
    expect(formasParaExibir([])).toEqual(["Fiado"]);
  });

  it("não duplica Fiado quando a loja já o cadastrou e ignora vazios/repetidos", () => {
    expect(formasParaExibir(["Dinheiro", " ", "dinheiro", "Fiado"])).toEqual(["Dinheiro", "Fiado"]);
  });
});

describe("validarPagamentos (pagamento incompleto)", () => {
  it("dinheiro e PIX não exigem adquirente", () => {
    expect(
      validarPagamentos(
        [
          { forma: "Dinheiro", valor: 50 },
          { forma: "PIX", valor: 50 },
        ],
        100,
        [],
      ),
    ).toBeNull();
  });

  it("cartão sem maquininha escolhida bloqueia", () => {
    expect(validarPagamentos([{ forma: "Débito", valor: 100 }], 100, ADQUIRENTES)).toBe(
      "Escolha a maquininha do pagamento em Débito.",
    );
  });

  it("id que não está na lista real (ex.: lista recarregada) bloqueia", () => {
    expect(
      validarPagamentos(
        [{ forma: "Débito", valor: 100, adquirenteId: "dev-adq-1" }],
        100,
        ADQUIRENTES,
      ),
    ).toBe("Escolha a maquininha do pagamento em Débito.");
  });

  it("maquininha que não aceita a modalidade bloqueia", () => {
    expect(
      validarPagamentos(
        [{ forma: "Débito", valor: 100, adquirenteId: "adq-cielo" }],
        100,
        ADQUIRENTES,
      ),
    ).toBe("A maquininha Cielo não aceita débito.");
  });

  it("crédito com parcelamento não configurado bloqueia", () => {
    expect(
      validarPagamentos(
        [{ forma: "Crédito", valor: 100, adquirenteId: "adq-stone", parcelas: 3 }],
        100,
        ADQUIRENTES,
      ),
    ).toBe("Escolha o parcelamento do pagamento em Crédito.");
  });

  it("débito e crédito completos passam", () => {
    expect(
      validarPagamentos(
        [
          { forma: "Débito", valor: 40, adquirenteId: "adq-stone" },
          { forma: "Crédito", valor: 60, adquirenteId: "adq-cielo", parcelas: 3 },
        ],
        100,
        ADQUIRENTES,
      ),
    ).toBeNull();
  });

  it("linha de cartão sem valor não é enviada e não bloqueia", () => {
    expect(
      validarPagamentos(
        [
          { forma: "Dinheiro", valor: 100 },
          { forma: "Crédito", valor: 0 },
        ],
        100,
        ADQUIRENTES,
      ),
    ).toBeNull();
  });
});

describe("forma de cartão ambígua (Fase C)", () => {
  it("“Cartão” sem débito/crédito é ambígua; formas com modalidade reconhecida não são", () => {
    expect(formaCartaoAmbigua("Cartão")).toBe(true);
    expect(formaCartaoAmbigua("cartao")).toBe(true);
    expect(formaCartaoAmbigua("Cartão de crédito")).toBe(false);
    expect(formaCartaoAmbigua("Cartão débito")).toBe(false);
    expect(formaCartaoAmbigua("Crédito")).toBe(false);
    expect(formaCartaoAmbigua("PIX")).toBe(false);
    expect(formaCartaoAmbigua("Dinheiro")).toBe(false);
  });

  it("pagamento numa forma ambígua bloqueia a conferência (nunca vai sem maquininha)", () => {
    expect(validarPagamentos([{ forma: "Cartão", valor: 100 }], 100, ADQUIRENTES, true)).toBe(
      "“Cartão” não informa se é débito ou crédito. Remova este pagamento e use uma forma de débito ou crédito.",
    );
  });
});

describe("pagamento parcial e Fiado (Fase C)", () => {
  it("pagamento abaixo do total sem Fiado bloqueia e diz quanto falta", () => {
    // formatMoeda (Intl) usa espaço não separável depois de "R$".
    expect(validarPagamentos([{ forma: "PIX", valor: 60 }], 100, [], true)).toMatch(
      /^Falta receber R\$\s40,00\. Adicione outro pagamento ou lance a diferença no Fiado\.$/,
    );
  });

  it("a mensagem de falta é exatamente mensagemFaltaReceber (a tela a mostra uma só vez)", () => {
    expect(validarPagamentos([{ forma: "PIX", valor: 60 }], 100, [], true)).toBe(
      mensagemFaltaReceber(40),
    );
    expect(validarPagamentos([{ forma: "PIX", valor: 0.1 }], 0.3, [], true)).toBe(
      mensagemFaltaReceber(0.2),
    );
  });

  it("sem nenhum valor informado também bloqueia", () => {
    expect(validarPagamentos([{ forma: "Dinheiro", valor: 0 }], 100, [], true)).toMatch(
      /^Falta receber R\$\s100,00/,
    );
  });

  it("diferença lançada no Fiado com cliente é permitida", () => {
    expect(
      validarPagamentos(
        [
          { forma: "PIX", valor: 60 },
          { forma: "Fiado", valor: 40, parcelas: 2 },
        ],
        100,
        [],
        true,
      ),
    ).toBeNull();
  });

  it("Fiado sem cliente bloqueia (o backend exige cliente para saldo pendente)", () => {
    expect(
      validarPagamentos(
        [
          { forma: "PIX", valor: 60 },
          { forma: "Fiado", valor: 40 },
        ],
        100,
        [],
        false,
      ),
    ).toBe("Venda no Fiado precisa de cliente. Selecione a cliente antes de conferir.");
  });

  it("venda 100% no Fiado com cliente é permitida", () => {
    expect(validarPagamentos([{ forma: "Fiado", valor: 100 }], 100, [], true)).toBeNull();
  });

  it("linha Fiado zerada com pagamento completo não exige cliente", () => {
    expect(
      validarPagamentos(
        [
          { forma: "PIX", valor: 100 },
          { forma: "Fiado", valor: 0 },
        ],
        100,
        [],
        false,
      ),
    ).toBeNull();
  });

  it("regressão Fase A: dinheiro com troco cobre o total e passa sem cliente", () => {
    expect(validarPagamentos([{ forma: "Dinheiro", valor: 100 }], 89.9, [], false)).toBeNull();
  });

  it("regressão Fase B: cartão completo pago integralmente passa sem cliente", () => {
    expect(
      validarPagamentos(
        [{ forma: "Crédito", valor: 100, adquirenteId: "adq-stone", parcelas: 6 }],
        100,
        ADQUIRENTES,
        false,
      ),
    ).toBeNull();
  });

  it("Fiado + dinheiro com troco: o que vai ao backend como pendente é exatamente o Fiado", () => {
    const pagamentos = [
      { forma: "Dinheiro", valor: 100 },
      { forma: "Fiado", valor: 50, parcelas: 2 },
    ];
    expect(validarPagamentos(pagamentos, 120, [], true)).toBeNull();
    const envio = montarPagamentosParaEnvio(pagamentos, 120);
    const pago = envio.pagamentos.reduce((s, p) => s + p.valor, 0);
    expect(120 - pago).toBe(50);
  });
});

describe("envio com identificadores reais", () => {
  it("crédito envia modalidade, adquirenteId real e parcelas; débito envia modalidade e adquirenteId sem parcelas", () => {
    const { pagamentos } = montarPagamentosParaEnvio(
      [
        { forma: "Crédito", valor: 60, adquirenteId: "adq-stone", parcelas: 6 },
        { forma: "Débito", valor: 40, adquirenteId: "adq-stone" },
      ],
      100,
    );
    expect(pagamentos).toEqual([
      {
        forma: "Crédito",
        valor: 60,
        modalidade: "credito",
        adquirenteId: "adq-stone",
        parcelas: 6,
      },
      { forma: "Débito", valor: 40, modalidade: "debito", adquirenteId: "adq-stone" },
    ]);
  });

  it("dinheiro e PIX vão sem modalidade e sem adquirente (campos opcionais no contrato)", () => {
    const { pagamentos } = montarPagamentosParaEnvio(
      [
        { forma: "PIX", valor: 30 },
        { forma: "Dinheiro", valor: 70 },
      ],
      100,
    );
    expect(pagamentos).toEqual([
      { forma: "PIX", valor: 30 },
      { forma: "Dinheiro", valor: 70 },
    ]);
  });

  it("regressão Fase A: cartão + dinheiro com troco — troco sai só do dinheiro e o cartão vai com seus ids", () => {
    const { pagamentos } = montarPagamentosParaEnvio(
      [
        { forma: "Débito", valor: 60, adquirenteId: "adq-stone" },
        { forma: "Dinheiro", valor: 50 },
      ],
      100,
    );
    expect(pagamentos).toEqual([
      { forma: "Débito", valor: 60, modalidade: "debito", adquirenteId: "adq-stone" },
      { forma: "Dinheiro", valor: 40 },
    ]);
  });
});
