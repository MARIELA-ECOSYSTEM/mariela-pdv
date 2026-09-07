/**
 * MOCK — dados locais mínimos apenas para visualizar a interface.
 * Remover integralmente quando a API real (mariela-backend) for conectada.
 */
import type { PdvProduto } from "@/types/produto";
import type { PdvCliente } from "@/types/cliente";

export const MOCK_PRODUTOS: PdvProduto[] = [
  {
    id: "p1",
    codigo: "VST-1042",
    nome: "Vestido Midi Plissado",
    preco: 389.9,
    disponivel: true,
    variantes: [
      { id: "p1-lilas-p", cor: "Lilás", tamanho: "P", estoque: 3 },
      { id: "p1-lilas-m", cor: "Lilás", tamanho: "M", estoque: 5 },
      { id: "p1-preto-m", cor: "Preto", tamanho: "M", estoque: 2 },
      { id: "p1-preto-g", cor: "Preto", tamanho: "G", estoque: 0 },
    ],
  },
  {
    id: "p2",
    codigo: "BLS-2210",
    nome: "Blusa de Seda Manga Longa",
    preco: 249.0,
    disponivel: true,
    variantes: [
      { id: "p2-off-p", cor: "Off White", tamanho: "P", estoque: 4 },
      { id: "p2-off-m", cor: "Off White", tamanho: "M", estoque: 6 },
      { id: "p2-uva-g", cor: "Uva", tamanho: "G", estoque: 1 },
    ],
  },
  {
    id: "p3",
    codigo: "CLC-3388",
    nome: "Calça Alfaiataria Reta",
    preco: 329.9,
    disponivel: true,
    variantes: [
      { id: "p3-preto-36", cor: "Preto", tamanho: "36", estoque: 2 },
      { id: "p3-preto-38", cor: "Preto", tamanho: "38", estoque: 3 },
      { id: "p3-areia-40", cor: "Areia", tamanho: "40", estoque: 2 },
    ],
  },
  {
    id: "p4",
    codigo: "SAI-4501",
    nome: "Saia Longa Acetinada",
    preco: 279.9,
    disponivel: true,
    variantes: [
      { id: "p4-lilas-p", cor: "Lilás", tamanho: "P", estoque: 2 },
      { id: "p4-lilas-m", cor: "Lilás", tamanho: "M", estoque: 4 },
    ],
  },
  {
    id: "p5",
    codigo: "BLZ-5120",
    nome: "Blazer Estruturado",
    preco: 599.0,
    disponivel: true,
    variantes: [
      { id: "p5-uva-m", cor: "Uva", tamanho: "M", estoque: 1 },
      { id: "p5-preto-g", cor: "Preto", tamanho: "G", estoque: 2 },
    ],
  },
  {
    id: "p6",
    codigo: "TOP-6033",
    nome: "Top Cropped Canelado",
    preco: 129.9,
    disponivel: true,
    variantes: [
      { id: "p6-branco-p", cor: "Branco", tamanho: "P", estoque: 8 },
      { id: "p6-lilas-m", cor: "Lilás", tamanho: "M", estoque: 5 },
    ],
  },
  {
    id: "p7",
    codigo: "MAC-7211",
    nome: "Macacão Pantalona",
    preco: 459.9,
    disponivel: false,
    variantes: [{ id: "p7-preto-m", cor: "Preto", tamanho: "M", estoque: 0 }],
  },
  {
    id: "p8",
    codigo: "CAM-8140",
    nome: "Camisa Linho Oversized",
    preco: 299.0,
    disponivel: true,
    variantes: [
      { id: "p8-areia-m", cor: "Areia", tamanho: "M", estoque: 3 },
      { id: "p8-branco-g", cor: "Branco", tamanho: "G", estoque: 2 },
    ],
  },
];

export const MOCK_CLIENTES: PdvCliente[] = [
  { id: "c1", nome: "Ana Beatriz Camargo", telefone: "(11) 98812-4410" },
  { id: "c2", nome: "Carolina Duarte", telefone: "(11) 99730-2288" },
  { id: "c3", nome: "Fernanda Lopes", telefone: "(21) 98455-6612" },
  { id: "c4", nome: "Juliana Prado", telefone: "(11) 97441-0093" },
  { id: "c5", nome: "Marina Teixeira", telefone: "(31) 98120-7745" },
];

export const MOCK_FORMAS_PAGAMENTO = ["Dinheiro", "PIX", "Débito", "Crédito"];
