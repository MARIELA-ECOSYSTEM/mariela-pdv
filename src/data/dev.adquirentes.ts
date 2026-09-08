/**
 * DADOS TEMPORÁRIOS DE DESENVOLVIMENTO — NÃO É CONTRATO DE API.
 *
 * A configuração real de adquirentes (nome, observação, tarifas e parcelas
 * autorizadas) é cadastrada no Backoffice e será entregue pela API do
 * mariela-backend. Enquanto o endpoint oficial não existir, estes valores
 * servem apenas para operar a interface do PDV em desenvolvimento.
 *
 * Nada aqui deve ser tratado como regra de negócio nem copiado para a camada
 * de API (src/services/api/*).
 */
import type { PdvAdquirente } from "@/types/adquirente";

export const DEV_ADQUIRENTES: PdvAdquirente[] = [
  {
    id: "dev-adq-1",
    nome: "Adquirente A",
    observacao: "Exemplo de desenvolvimento",
    modalidades: {
      debito: { tarifaPercentual: 1.39 },
      credito: {
        opcoes: [
          { parcelas: 1, tarifaPercentual: 3.09 },
          { parcelas: 2, tarifaPercentual: 4.2 },
          { parcelas: 3, tarifaPercentual: 4.9 },
          { parcelas: 6, tarifaPercentual: 6.5 },
          { parcelas: 10, tarifaPercentual: 8.9 },
        ],
      },
    },
  },
  {
    id: "dev-adq-2",
    nome: "Adquirente B",
    observacao: null,
    modalidades: {
      debito: { tarifaPercentual: null },
      credito: {
        opcoes: [{ parcelas: 1 }, { parcelas: 2 }, { parcelas: 3 }],
      },
    },
  },
];
