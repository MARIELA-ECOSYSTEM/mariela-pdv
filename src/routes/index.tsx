import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PdvHeader } from "@/components/pdv/header/PdvHeader";
import { CatalogoProdutos } from "@/components/pdv/catalogo/CatalogoProdutos";
import { ProdutoDialog } from "@/components/pdv/produto/ProdutoDialog";
import { CarrinhoPanel } from "@/components/pdv/carrinho/CarrinhoPanel";
import { ClienteDialog } from "@/components/pdv/cliente/ClienteDialog";
import { ClientePanel } from "@/components/pdv/cliente/ClientePanel";
import type { PdvEtapa } from "@/components/pdv/fluxo/EtapaIndicador";
import { PagamentoPanel } from "@/components/pdv/pagamento/PagamentoPanel";
import { CaixaAviso } from "@/components/pdv/caixa/CaixaAviso";
import { VendaDialog } from "@/components/pdv/venda/VendaDialog";
import { ConferenciaDialog } from "@/components/pdv/venda/ConferenciaDialog";
import { MinhasVendasDialog } from "@/components/pdv/venda/MinhasVendasDialog";
import { usePdvAuth } from "@/features/auth/PdvAuthProvider";
import { useCarrinho } from "@/features/carrinho/useCarrinho";
import { useAtalhos } from "@/features/atalhos/useAtalhos";
import { useOpcoesPagamento } from "@/features/pagamento/useOpcoesPagamento";
import {
  formaEhCredito,
  formaEhFiado,
  modalidadeCartao,
  montarPagamentosParaEnvio,
  validarPagamentos,
} from "@/lib/pagamento";
import { ajustarParcelas, encontrarAdquirente, suportaModalidade } from "@/lib/adquirente";
import { arredondarCentavos } from "@/lib/desconto";
import { calcularTotaisPagamento, calcularTotaisVenda } from "@/lib/venda-totais";
import { gerarUuid } from "@/lib/uuid";
import { pdvDataSource } from "@/services/pdv-data-source";
import { criarControleVenda, type ControleVenda } from "@/features/venda/controle-venda";

import type { RequestState } from "@/types/api";
import type { PdvProduto } from "@/types/produto";
import type { PdvCliente } from "@/types/cliente";
import type { PdvCaixaEstado } from "@/types/caixa";
import { DESCONTO_ZERO, type PdvDesconto } from "@/types/desconto";
import type { PdvPagamentoLinha, PdvVendaPayload, PdvVendaTentativa } from "@/types/venda";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MARIELA PDV — Ponto de venda da loja" },
      {
        name: "description",
        content:
          "Tela operacional do MARIELA PDV: catálogo, carrinho, cliente, desconto, pagamentos e finalização da venda.",
      },
      { property: "og:title", content: "MARIELA PDV — Ponto de venda da loja" },
      {
        property: "og:description",
        content:
          "Tela operacional do MARIELA PDV: catálogo, carrinho, cliente, desconto, pagamentos e finalização da venda.",
      },
    ],
  }),
  component: PdvPage,
});

function PdvPage() {
  const { status, vendedor, sair } = usePdvAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "deslogado" || status === "erro") void navigate({ to: "/login" });
  }, [status, navigate]);

  if (status !== "autenticado" || !vendedor) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-primary" />
        Abrindo o PDV…
      </div>
    );
  }

  return <PdvOperacao vendedorNome={vendedor.nome} onSair={sair} />;
}

function PdvOperacao({ vendedorNome, onSair }: { vendedorNome: string; onSair: () => void }) {
  // ---- Caixa: apenas leitura de GET /api/v1/pdv/caixa/atual ----
  // O PDV NÃO abre caixa: a abertura é exclusiva do MARIELA Backoffice e o
  // mesmo caixa é compartilhado por todos os vendedores do PDV.
  const [caixa, setCaixa] = useState<PdvCaixaEstado>("carregando");
  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const atual = await pdvDataSource.caixa.atual();
        if (!ativo) return;
        setCaixa(atual ? "aberto" : "fechado");
      } catch {
        if (ativo) setCaixa("erro");
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  // ---- Catálogo: GET /api/v1/pdv/produtos (via porta de dados) ----
  const [busca, setBusca] = useState("");
  const [estadoCatalogo, setEstadoCatalogo] = useState<RequestState>("loading");
  const [produtos, setProdutos] = useState<PdvProduto[]>([]);
  const buscaRef = useRef<HTMLInputElement>(null);

  const [recarga, setRecarga] = useState(0);
  useEffect(() => {
    let ativo = true;
    setEstadoCatalogo("loading");
    // O termo digitado vai ao backend como `busca` (GET /pdv/produtos?busca=).
    // Debounce apenas para não disparar uma requisição por tecla.
    const termo = busca.trim();
    const disparo = setTimeout(
      () => {
        void (async () => {
          try {
            const lista = await pdvDataSource.produtos.listar(termo ? { busca: termo } : undefined);
            if (!ativo) return;
            setProdutos(lista);
            setEstadoCatalogo("success");
          } catch {
            if (!ativo) return;
            setProdutos([]);
            setEstadoCatalogo("error");
          }
        })();
      },
      termo ? 300 : 0,
    );
    return () => {
      ativo = false;
      clearTimeout(disparo);
    };
  }, [recarga, busca]);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter(
      (p) => p.nome.toLowerCase().includes(termo) || (p.codigo ?? "").toLowerCase().includes(termo),
    );
  }, [produtos, busca]);

  // ---- Produto / carrinho / cliente ----
  const [produtoSelecionado, setProdutoSelecionado] = useState<PdvProduto | null>(null);
  const [clienteAberto, setClienteAberto] = useState(false);
  const [minhasVendasAberto, setMinhasVendasAberto] = useState(false);
  const [cliente, setCliente] = useState<PdvCliente | null>(null);
  const carrinho = useCarrinho();

  // ---- Descontos (intenção; backend é a autoridade) ----
  // Desconto por item vive no carrinho; este é o desconto sobre o subtotal.
  const [descontoVenda, setDescontoVenda] = useState<PdvDesconto>(DESCONTO_ZERO);
  const totais = useMemo(
    () => calcularTotaisVenda(carrinho.itens, descontoVenda),
    [carrinho.itens, descontoVenda],
  );
  const total = totais.total;

  // ---- Pagamentos ----
  // Formas e adquirentes vêm da API (GET /pdv/pagamentos/*), nunca de lista fixa.
  const opcoesPagamento = useOpcoesPagamento();
  const adquirentes = opcoesPagamento.adquirentes.dados;
  const [pagamentos, setPagamentos] = useState<PdvPagamentoLinha[]>([]);
  const pagamentoTotais = useMemo(
    () => calcularTotaisPagamento(pagamentos, total),
    [pagamentos, total],
  );
  // Pagamento incompleto (ex.: cartão sem maquininha) impede conferir a venda.
  const problemaPagamento = useMemo(
    () => validarPagamentos(pagamentos, total, adquirentes),
    [pagamentos, total, adquirentes],
  );

  function adicionarPagamento(forma: string) {
    // Cartão com uma única maquininha válida: já vem escolhida (menos um passo).
    const modalidade = modalidadeCartao(forma);
    const validas = modalidade ? adquirentes.filter((a) => suportaModalidade(a, modalidade)) : [];
    const unica = validas.length === 1 ? validas[0] : undefined;
    const parcelas =
      modalidade === "credito"
        ? (ajustarParcelas(unica, 1) ?? 1)
        : formaEhFiado(forma)
          ? 1
          : undefined;
    setPagamentos((atuais) => [
      ...atuais,
      {
        id: gerarUuid(),
        forma,
        valor: arredondarCentavos(pagamentoTotais.pendente),
        ...(unica ? { adquirenteId: unica.id } : {}),
        ...(parcelas ? { parcelas } : {}),
      },
    ]);
  }

  /** Troca de adquirente reajusta as parcelas para as autorizadas na configuração. */
  function alterarAdquirente(id: string, adquirenteId: string) {
    const adquirente = encontrarAdquirente(adquirentes, adquirenteId);
    setPagamentos((atuais) =>
      atuais.map((p) => {
        if (p.id !== id) return p;
        const parcelas = formaEhCredito(p.forma)
          ? (ajustarParcelas(adquirente, p.parcelas) ?? 1)
          : undefined;
        return { ...p, adquirenteId, ...(parcelas ? { parcelas } : {}) };
      }),
    );
  }

  // ---- Etapa do fluxo (apenas UX; nada de estado da venda é perdido) ----
  const [etapa, setEtapa] = useState<PdvEtapa>("carrinho");

  // ---- Venda ----
  // A chave de idempotência e o resultado da tentativa vivem no controle de
  // venda (ver features/venda/controle-venda.ts) — nunca são recriados aqui.
  const [conferenciaAberta, setConferenciaAberta] = useState(false);
  const [tentativa, setTentativa] = useState<PdvVendaTentativa | null>(null);
  const controleRef = useRef<ControleVenda | null>(null);
  if (!controleRef.current) {
    controleRef.current = criarControleVenda({
      enviar: (payload, chave) => pdvDataSource.vendas.criar(payload, chave),
      gerarChave: gerarUuid,
      aoMudar: setTentativa,
    });
  }
  const controleVenda = controleRef.current;

  function montarPayload(): PdvVendaPayload {
    // POST /api/v1/pdv/vendas — o frontend envia apenas intenção.
    // Preço, estoque e total são autoridade do backend; troco não é enviado
    // (dinheiro vai pelo valor aplicado). A linha local "Fiado" nunca vai em
    // `pagamentos` (ver montarPagamentosParaEnvio).
    const { pagamentos: pagamentosParaEnvio, totalParcelas } = montarPagamentosParaEnvio(
      pagamentos,
      total,
    );

    return {
      ...(cliente ? { clienteId: cliente.id } : {}),
      descontoVenda: descontoVenda,
      itens: carrinho.itens.map((item) => ({
        produtoId: item.produtoId,
        varianteId: item.varianteId,
        tamanhoId: item.tamanhoId,
        quantidade: item.quantidade,
        desconto: item.desconto,
      })),
      pagamentos: pagamentosParaEnvio,
      ...(totalParcelas ? { totalParcelas } : {}),
    };
  }

  /**
   * Envia (ou reenvia) a venda. O controle reaproveita a chave da tentativa
   * atual e ignora o pedido se já houver um envio em andamento.
   */
  function enviarVenda() {
    if (caixa !== "aberto") return;
    const envio = controleVenda.finalizar(montarPayload(), { itens: carrinho.itens, total });
    // Um único diálogo por vez: o resultado aparece no VendaDialog.
    if (envio) setConferenciaAberta(false);
  }

  /** Abre a conferência — nada é enviado ao backend aqui. */
  function abrirConferencia() {
    if (carrinho.itens.length === 0) return;
    if (tentativa?.estado === "processando" || tentativa?.estado === "concluida") return;
    // Sem caixa aberto não há finalização: quem abre o caixa é o Backoffice.
    if (caixa !== "aberto") return;
    // Valor acima do total que não pode virar troco (ex.: PIX acima do total).
    if (pagamentoTotais.excedente > 0) return;
    if (problemaPagamento) return;
    setConferenciaAberta(true);
  }

  /** Ctrl+Enter avança no fluxo: carrinho → pagamento → conferência. */
  function avancarFluxo() {
    if (etapa === "cliente") {
      setEtapa("carrinho");
      return;
    }
    if (carrinho.itens.length === 0) return;
    if (etapa === "carrinho") {
      setEtapa("pagamento");
      return;
    }
    abrirConferencia();
  }

  function novaVenda() {
    // Só renova a chave quando a venda anterior foi resolvida (concluída).
    if (!controleVenda.iniciarNovaVenda()) return;
    carrinho.limpar();
    setCliente(null);
    setPagamentos([]);
    setDescontoVenda(DESCONTO_ZERO);
    setConferenciaAberta(false);
    setEtapa("carrinho");
    buscaRef.current?.focus();
  }

  const atalhos = useMemo(
    () => [
      { tecla: "/", acao: () => buscaRef.current?.focus() },
      { tecla: "Enter", ctrl: true, acao: avancarFluxo },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      carrinho.itens.length,
      total,
      tentativa?.estado,
      etapa,
      pagamentoTotais.excedente,
      problemaPagamento,
    ],
  );
  useAtalhos(atalhos, caixa === "aberto");

  const bloqueado = caixa !== "aberto";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <PdvHeader
        vendedorNome={vendedorNome}
        cliente={cliente}
        caixa={caixa}
        etapa={etapa}
        onIrParaEtapa={setEtapa}
        onAlterarCliente={() => setClienteAberto(true)}
        onAbrirMinhasVendas={() => setMinhasVendasAberto(true)}
        onSair={onSair}
      />
      <CaixaAviso estado={caixa} />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_400px]">
        <div className="flex min-h-0 flex-col">
          <CatalogoProdutos
            ref={buscaRef}
            produtos={produtosFiltrados}
            estado={estadoCatalogo}
            busca={busca}
            onBuscaChange={setBusca}
            onSelecionar={setProdutoSelecionado}
            onTentarNovamente={() => setRecarga((n) => n + 1)}
            bloqueado={bloqueado}
          />
        </div>

        <aside className="surface-panel flex min-h-0 flex-col overflow-hidden">
          {etapa === "cliente" ? (
            <ClientePanel
              cliente={cliente}
              onSelecionar={setCliente}
              onRemover={() => setCliente(null)}
              onSeguirParaCarrinho={() => setEtapa("carrinho")}
            />
          ) : etapa === "carrinho" ? (
            <CarrinhoPanel
              itens={carrinho.itens}
              descontoVenda={descontoVenda}
              totais={totais}
              onRemoverItem={carrinho.remover}
              onAlterarQuantidade={carrinho.alterarQuantidade}
              onAlterarDescontoItem={carrinho.alterarDesconto}
              onDescontoVendaChange={setDescontoVenda}
              onSeguirParaPagamento={() => setEtapa("pagamento")}
            />
          ) : (
            <PagamentoPanel
              pagamentos={pagamentos}
              totaisVenda={totais}
              totais={pagamentoTotais}
              formas={opcoesPagamento.formas}
              adquirentes={opcoesPagamento.adquirentes}
              problema={problemaPagamento}
              onRecarregarOpcoes={opcoesPagamento.recarregar}
              cliente={cliente}
              enviando={tentativa?.estado === "processando"}
              bloqueado={bloqueado}
              onAdicionar={adicionarPagamento}
              onAlterarValor={(id, valor) =>
                setPagamentos((atuais) => atuais.map((p) => (p.id === id ? { ...p, valor } : p)))
              }
              onAlterarParcelas={(id, parcelas) =>
                setPagamentos((atuais) => atuais.map((p) => (p.id === id ? { ...p, parcelas } : p)))
              }
              onAlterarAdquirente={alterarAdquirente}
              onRemover={(id) => setPagamentos((atuais) => atuais.filter((p) => p.id !== id))}
              onVoltar={() => setEtapa("carrinho")}
              onConferir={abrirConferencia}
            />
          )}

          <p className="shrink-0 border-t border-border px-4 py-2 text-center text-[0.7rem] text-muted-foreground">
            Atalhos: / buscar · Ctrl+Enter avançar · Esc fechar
          </p>
        </aside>
      </div>

      <ProdutoDialog
        produto={produtoSelecionado}
        aberto={!!produtoSelecionado}
        onFechar={() => setProdutoSelecionado(null)}
        onAdicionar={carrinho.adicionar}
      />

      <ClienteDialog
        aberto={clienteAberto}
        onFechar={() => setClienteAberto(false)}
        onSelecionar={setCliente}
      />

      <MinhasVendasDialog
        aberto={minhasVendasAberto}
        vendedorNome={vendedorNome}
        onFechar={() => setMinhasVendasAberto(false)}
      />

      {/* Conferência antes do POST — "Voltar e editar" preserva toda a venda. */}
      <ConferenciaDialog
        aberto={conferenciaAberta}
        vendedorNome={vendedorNome}
        cliente={cliente}
        itens={carrinho.itens}
        totais={totais}
        pagamentos={pagamentos}
        pagamentoTotais={pagamentoTotais}
        adquirentes={adquirentes}
        enviando={tentativa?.estado === "processando"}
        pendencia={tentativa?.pendencia}
        onVoltar={() => setConferenciaAberta(false)}
        onConfirmar={enviarVenda}
        onRegistrarComoNovaVenda={() => controleVenda.registrarComoNovaVenda()}
      />

      <VendaDialog
        tentativa={tentativa}
        onVoltarAoCarrinho={() => controleVenda.voltarAoCarrinho()}
        onNovaVenda={novaVenda}
        onTentarNovamente={enviarVenda}
      />
    </div>
  );
}
