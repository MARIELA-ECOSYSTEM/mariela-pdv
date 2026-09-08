/**
 * MOCK — dados locais mínimos apenas para visualizar a interface.
 * Consumidos exclusivamente pelo adaptador mock (src/services/mock).
 * Remover integralmente quando a API real (mariela-backend) for conectada.
 *
 * Estrutura de produto igual à real (ProdutoCatalogoPdv): cada variante é uma
 * cor com `tamanhos[]` próprios, cada tamanho com seu próprio id — nunca uma
 * combinação cor+tamanho achatada num único id fabricado.
 */
import type { PdvProduto } from "@/types/produto";
import type { PdvCliente } from "@/types/cliente";

export const MOCK_PRODUTOS: PdvProduto[] = [
  {
    id: "p1",
    codigo: "VST-1042",
    nome: "Vestido Midi Plissado",
    preco: 389.9,
    imagemUrl: null,
    disponivel: true,
    variantes: [
      {
        id: "p1-lilas",
        cor: "Lilás",
        foto: null,
        quantidade: 8,
        disponivel: true,
        tamanhos: [
          { id: "p1-lilas-p", tamanho: "P", quantidade: 3, disponivel: true },
          { id: "p1-lilas-m", tamanho: "M", quantidade: 5, disponivel: true },
        ],
      },
      {
        id: "p1-preto",
        cor: "Preto",
        foto: null,
        quantidade: 2,
        disponivel: true,
        tamanhos: [
          { id: "p1-preto-m", tamanho: "M", quantidade: 2, disponivel: true },
          { id: "p1-preto-g", tamanho: "G", quantidade: 0, disponivel: false },
        ],
      },
    ],
  },
  {
    id: "p2",
    codigo: "BLS-2210",
    nome: "Blusa de Seda Manga Longa",
    preco: 249.0,
    imagemUrl: null,
    disponivel: true,
    variantes: [
      {
        id: "p2-off",
        cor: "Off White",
        foto: null,
        quantidade: 10,
        disponivel: true,
        tamanhos: [
          { id: "p2-off-p", tamanho: "P", quantidade: 4, disponivel: true },
          { id: "p2-off-m", tamanho: "M", quantidade: 6, disponivel: true },
        ],
      },
      {
        id: "p2-uva",
        cor: "Uva",
        foto: null,
        quantidade: 1,
        disponivel: true,
        tamanhos: [{ id: "p2-uva-g", tamanho: "G", quantidade: 1, disponivel: true }],
      },
    ],
  },
  {
    id: "p3",
    codigo: "CLC-3388",
    nome: "Calça Alfaiataria Reta",
    preco: 329.9,
    imagemUrl: null,
    disponivel: true,
    variantes: [
      {
        id: "p3-preto",
        cor: "Preto",
        foto: null,
        quantidade: 5,
        disponivel: true,
        tamanhos: [
          { id: "p3-preto-36", tamanho: "36", quantidade: 2, disponivel: true },
          { id: "p3-preto-38", tamanho: "38", quantidade: 3, disponivel: true },
        ],
      },
      {
        id: "p3-areia",
        cor: "Areia",
        foto: null,
        quantidade: 2,
        disponivel: true,
        tamanhos: [{ id: "p3-areia-40", tamanho: "40", quantidade: 2, disponivel: true }],
      },
    ],
  },
  {
    id: "p4",
    codigo: "SAI-4501",
    nome: "Saia Longa Acetinada",
    preco: 279.9,
    imagemUrl: null,
    disponivel: true,
    variantes: [
      {
        id: "p4-lilas",
        cor: "Lilás",
        foto: null,
        quantidade: 6,
        disponivel: true,
        tamanhos: [
          { id: "p4-lilas-p", tamanho: "P", quantidade: 2, disponivel: true },
          { id: "p4-lilas-m", tamanho: "M", quantidade: 4, disponivel: true },
        ],
      },
    ],
  },
  {
    id: "p5",
    codigo: "BLZ-5120",
    nome: "Blazer Estruturado",
    preco: 599.0,
    imagemUrl: null,
    disponivel: true,
    variantes: [
      {
        id: "p5-uva",
        cor: "Uva",
        foto: null,
        quantidade: 1,
        disponivel: true,
        tamanhos: [{ id: "p5-uva-m", tamanho: "M", quantidade: 1, disponivel: true }],
      },
      {
        id: "p5-preto",
        cor: "Preto",
        foto: null,
        quantidade: 2,
        disponivel: true,
        tamanhos: [{ id: "p5-preto-g", tamanho: "G", quantidade: 2, disponivel: true }],
      },
    ],
  },
  {
    id: "p6",
    codigo: "TOP-6033",
    nome: "Top Cropped Canelado",
    preco: 129.9,
    imagemUrl: null,
    disponivel: true,
    variantes: [
      {
        id: "p6-branco",
        cor: "Branco",
        foto: null,
        quantidade: 8,
        disponivel: true,
        tamanhos: [{ id: "p6-branco-p", tamanho: "P", quantidade: 8, disponivel: true }],
      },
      {
        id: "p6-lilas",
        cor: "Lilás",
        foto: null,
        quantidade: 5,
        disponivel: true,
        tamanhos: [{ id: "p6-lilas-m", tamanho: "M", quantidade: 5, disponivel: true }],
      },
    ],
  },
  {
    id: "p7",
    codigo: "MAC-7211",
    nome: "Macacão Pantalona",
    preco: 459.9,
    imagemUrl: null,
    disponivel: false,
    variantes: [
      {
        id: "p7-preto",
        cor: "Preto",
        foto: null,
        quantidade: 0,
        disponivel: false,
        tamanhos: [{ id: "p7-preto-m", tamanho: "M", quantidade: 0, disponivel: false }],
      },
    ],
  },
  {
    id: "p8",
    codigo: "CAM-8140",
    nome: "Camisa Linho Oversized",
    preco: 299.0,
    imagemUrl: null,
    disponivel: true,
    variantes: [
      {
        id: "p8-areia",
        cor: "Areia",
        foto: null,
        quantidade: 3,
        disponivel: true,
        tamanhos: [{ id: "p8-areia-m", tamanho: "M", quantidade: 3, disponivel: true }],
      },
      {
        id: "p8-branco",
        cor: "Branco",
        foto: null,
        quantidade: 2,
        disponivel: true,
        tamanhos: [{ id: "p8-branco-g", tamanho: "G", quantidade: 2, disponivel: true }],
      },
    ],
  },
];

export const MOCK_CLIENTES: PdvCliente[] = [
  { id: "c1", codigo: "CLI-0001", nome: "Ana Beatriz Camargo", telefone: "(11) 98812-4410" },
  { id: "c2", codigo: "CLI-0002", nome: "Carolina Duarte", telefone: "(11) 99730-2288" },
  { id: "c3", codigo: "CLI-0003", nome: "Fernanda Lopes", telefone: "(21) 98455-6612" },
  { id: "c4", codigo: "CLI-0004", nome: "Juliana Prado", telefone: "(11) 97441-0093" },
  { id: "c5", codigo: "CLI-0005", nome: "Marina Teixeira", telefone: "(31) 98120-7745" },
];

export const MOCK_FORMAS_PAGAMENTO = ["Dinheiro", "PIX", "Débito", "Crédito"];
