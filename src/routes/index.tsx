import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PdvHeader } from "@/components/pdv/header/PdvHeader";
import { CatalogoProdutos } from "@/components/pdv/catalogo/CatalogoProdutos";
import { ProdutoDialog } from "@/components/pdv/produto/ProdutoDialog";
import { CarrinhoPanel } from "@/components/pdv/carrinho/CarrinhoPanel";
import { ClienteDialog } from "@/components/pdv/cliente/ClienteDialog";
import { PagamentoPanel } from "@/components/pdv/pagamento/PagamentoPanel";
import { CaixaAviso } from "@/components/pdv/caixa/CaixaAviso";
import { VendaDialog } from "@/components/pdv/venda/VendaDialog";
import { ConferenciaDialog } from "@/components/pdv/venda/ConferenciaDialog";
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
import {
  calcularTotaisPagamento,
  calcularTotaisVenda,
  descontoVendaParaCarrinho,
  limitarDescontosDaVenda,
} from "@/lib/venda-totais";
import {
  juntarPaginas,
  relerProdutosVendidos,
  substituirProdutos,
} from "@/features/catalogo/catalogo";
import { PDV_CATALOGO_POR_PAGINA } from "@/config/pdv.config";
import { gerarUuid } from "@/lib/uuid";
import { pdvDataSource } from "@/services/pdv-data-source";
import { criarControleVenda, type ControleVenda } from "@/features/venda/controle-venda";
import { consultarEstadoCaixa } from "@/features/caixa/estado-caixa";
import { destinoDoFocoAoFecharProduto } from "@/features/produto/foco-produto";

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
  // Consultado ao abrir, a pedido da vendedora e antes de cada conferência
  // (ver features/caixa/estado-caixa.ts) — sem polling.
  const [caixa, setCaixa] = useState<PdvCaixaEstado>("carregando");
  const [verificandoCaixa, setVerificandoCaixa] = useState(false);
  const verificandoCaixaRef = useRef(false);
  useEffect(() => {
    let ativo = true;
    void consultarEstadoCaixa(pdvDataSource.caixa).then((estado) => {
      if (ativo) setCaixa(estado);
    });
    return () => {
      ativo = false;
    };
  }, []);

  /** Reconsulta o caixa (uma requisição); devolve o estado atualizado. */
  async function verificarCaixa(): Promise<PdvCaixaEstado | null> {
    if (verificandoCaixaRef.current) return null;
    verificandoCaixaRef.current = true;
    setVerificandoCaixa(true);
    try {
      const estado = await consultarEstadoCaixa(pdvDataSource.caixa);
      setCaixa(estado);
      return estado;
    } finally {
      verificandoCaixaRef.current = false;
      setVerificandoCaixa(false);
    }
  }

  // ---- Catálogo: GET /api/v1/pdv/produtos?busca=&page=&limit= ----
  // A busca é do backend (nome, código ou categoria) e não é refiltrada aqui.
  // "Carregar mais" pede a próxima página do mesmo resultado.
  const [busca, setBusca] = useState("");
  const [estadoCatalogo, setEstadoCatalogo] = useState<RequestState>("loading");
  const [produtos, setProdutos] = useState<PdvProduto[]>([]);
  const [paginaCatalogo, setPaginaCatalogo] = useState({ pagina: 1, totalPaginas: 1, total: 0 });
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroCarregarMais, setErroCarregarMais] = useState(false);
  // Muda a cada nova busca: descarta "Carregar mais" de uma busca anterior.
  const versaoBuscaRef = useRef(0);
  const buscaRef = useRef<HTMLInputElement>(null);

  const [recarga, setRecarga] = useState(0);
  useEffect(() => {
    let ativo = true;
    const versao = ++versaoBuscaRef.current;
    setEstadoCatalogo("loading");
    setCarregandoMais(false);
    setErroCarregarMais(false);
    // Debounce apenas para não disparar uma requisição por tecla.
    const termo = busca.trim();
    const disparo = setTimeout(
      () => {
        void (async () => {
          try {
            const pagina = await pdvDataSource.produtos.listar({
              ...(termo ? { busca: termo } : {}),
              page: 1,
              limit: PDV_CATALOGO_POR_PAGINA,
            });
            if (!ativo || versao !== versaoBuscaRef.current) return;
            setProdutos(pagina.itens);
            setPaginaCatalogo({
              pagina: pagina.pagina,
              totalPaginas: pagina.totalPaginas,
              total: pagina.total,
            });
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

  async function carregarMaisProdutos() {
    if (carregandoMais || paginaCatalogo.pagina >= paginaCatalogo.totalPaginas) return;
    const versao = versaoBuscaRef.current;
    const termo = busca.trim();
    setCarregandoMais(true);
    setErroCarregarMais(false);
    try {
      const pagina = await pdvDataSource.produtos.listar({
        ...(termo ? { busca: termo } : {}),
        page: paginaCatalogo.pagina + 1,
        limit: PDV_CATALOGO_POR_PAGINA,
      });
      if (versao !== versaoBuscaRef.current) return;
      setProdutos((atuais) => juntarPaginas(atuais, pagina.itens));
      setPaginaCatalogo({
        pagina: pagina.pagina,
        totalPaginas: pagina.totalPaginas,
        total: pagina.total,
      });
    } catch {
      if (versao === versaoBuscaRef.current) setErroCarregarMais(true);
    } finally {
      if (versao === versaoBuscaRef.current) setCarregandoMais(false);
    }
  }

  // ---- Produto / carrinho / cliente ----
  const [produtoSelecionado, setProdutoSelecionado] = useState<PdvProduto | null>(null);
  // Card que abriu o diálogo do produto — destino do foco ao cancelar/fechar.
  const cardOrigemRef = useRef<HTMLElement | null>(null);
  const [clienteAberto, setClienteAberto] = useState(false);
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
  // Carrinho mudou (quantidade, remoção, inclusão): um desconto em R$ maior que
  // o novo subtotal é reduzido sozinho ao máximo possível — o backend recusa
  // desconto acima da base e a vendedora não precisa corrigir à mão. Carrinho
  // vazio zera o desconto em R$ de vez (ver descontoVendaParaCarrinho).
  useEffect(() => {
    setDescontoVenda((atual) => {
      const ajustado = descontoVendaParaCarrinho(carrinho.itens, atual);
      return ajustado.tipo === atual.tipo && ajustado.valor === atual.valor ? atual : ajustado;
    });
  }, [carrinho.itens]);

  // ---- Pagamentos ----
  // Formas e adquirentes vêm da API (GET /pdv/pagamentos/*), nunca de lista fixa.
  const opcoesPagamento = useOpcoesPagamento();
  const adquirentes = opcoesPagamento.adquirentes.dados;
  const [pagamentos, setPagamentos] = useState<PdvPagamentoLinha[]>([]);
  const pagamentoTotais = useMemo(
    () => calcularTotaisPagamento(pagamentos, total),
    [pagamentos, total],
  );
  // Pagamento incompleto (cartão sem maquininha, falta receber, Fiado sem
  // cliente, cartão ambíguo) impede conferir a venda.
  const temCliente = !!cliente;
  const problemaPagamento = useMemo(
    () => validarPagamentos(pagamentos, total, adquirentes, temCliente),
    [pagamentos, total, adquirentes, temCliente],
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
  // Painel lateral: carrinho ou pagamento. A cliente é escolhida pelo
  // cabeçalho, em qualquer momento — não existe etapa própria para ela.
  const [etapa, setEtapa] = useState<"carrinho" | "pagamento">("carrinho");

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

  // Venda concluída: relê do backend SÓ os produtos vendidos (GET
  // /pdv/produtos/:id) para o estoque do catálogo não ficar velho. Uma vez por
  // venda; sem recarregar o catálogo inteiro.
  const vendaComEstoqueRelidoRef = useRef<string | null>(null);
  useEffect(() => {
    if (tentativa?.estado !== "concluida" || !tentativa.vendaId) return;
    if (vendaComEstoqueRelidoRef.current === tentativa.vendaId) return;
    vendaComEstoqueRelidoRef.current = tentativa.vendaId;
    const ids = (tentativa.itens ?? []).map((item) => item.produtoId);
    void relerProdutosVendidos(ids, pdvDataSource.produtos).then((atualizados) => {
      setProdutos((lista) => substituirProdutos(lista, atualizados));
    });
  }, [tentativa]);

  function montarPayload(): PdvVendaPayload {
    // POST /api/v1/pdv/vendas — o frontend envia apenas intenção.
    // Preço, estoque e total são autoridade do backend; troco não é enviado
    // (dinheiro vai pelo valor aplicado). A linha local "Fiado" nunca vai em
    // `pagamentos` (ver montarPagamentosParaEnvio).
    const { pagamentos: pagamentosParaEnvio, totalParcelas } = montarPagamentosParaEnvio(
      pagamentos,
      total,
    );
    // Descontos sempre dentro da base atual: envia exatamente o que a tela mostra.
    const descontos = limitarDescontosDaVenda(carrinho.itens, descontoVenda);

    return {
      ...(cliente ? { clienteId: cliente.id } : {}),
      descontoVenda: descontos.descontoVenda,
      itens: descontos.itens.map((item) => ({
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

  /**
   * Abre a conferência — nada é enviado ao backend aqui. Antes, reconsulta o
   * caixa (uma requisição): ele pode ter sido fechado/aberto no Backoffice
   * desde que o PDV foi aberto.
   */
  async function abrirConferencia() {
    if (carrinho.itens.length === 0) return;
    if (tentativa?.estado === "processando" || tentativa?.estado === "concluida") return;
    // Valor acima do total que não pode virar troco (ex.: PIX acima do total).
    if (pagamentoTotais.excedente > 0) return;
    if (problemaPagamento) return;
    // Sem caixa aberto não há finalização: quem abre o caixa é o Backoffice.
    const estadoCaixa = await verificarCaixa();
    if (estadoCaixa !== "aberto") return;
    setConferenciaAberta(true);
  }

  /** Ctrl+Enter avança no fluxo: carrinho → pagamento → conferência. */
  function avancarFluxo() {
    if (carrinho.itens.length === 0) return;
    if (etapa === "carrinho") {
      setEtapa("pagamento");
      return;
    }
    void abrirConferencia();
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

  /** Abre o produto — nunca com o caixa fechado (mesma regra da busca e dos cards). */
  function abrirProduto(produto: PdvProduto, origem?: HTMLElement) {
    if (bloqueado) return;
    cardOrigemRef.current = origem ?? null;
    setProdutoSelecionado(produto);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <PdvHeader
        vendedorNome={vendedorNome}
        cliente={cliente}
        caixa={caixa}
        onAlterarCliente={() => setClienteAberto(true)}
        onRemoverCliente={() => setCliente(null)}
        onSair={onSair}
      />
      <CaixaAviso
        estado={caixa}
        verificando={verificandoCaixa}
        onVerificar={() => void verificarCaixa()}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_400px]">
        <div className="flex min-h-0 flex-col">
          <CatalogoProdutos
            ref={buscaRef}
            produtos={produtos}
            estado={estadoCatalogo}
            busca={busca}
            onBuscaChange={setBusca}
            onSelecionar={abrirProduto}
            onTentarNovamente={() => setRecarga((n) => n + 1)}
            bloqueado={bloqueado}
            total={paginaCatalogo.total}
            temMais={paginaCatalogo.pagina < paginaCatalogo.totalPaginas}
            carregandoMais={carregandoMais}
            erroCarregarMais={erroCarregarMais}
            onCarregarMais={() => void carregarMaisProdutos()}
          />
        </div>

        <aside className="surface-panel flex min-h-0 flex-col overflow-hidden">
          {etapa === "carrinho" ? (
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
              onSelecionarCliente={() => setClienteAberto(true)}
              cliente={cliente}
              enviando={tentativa?.estado === "processando" || verificandoCaixa}
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
        quantidadeNoCarrinho={carrinho.quantidadeDaLinha}
        // Após adicionar: busca com o termo selecionado (próximo produto).
        // Após cancelar/fechar: o card que abriu o diálogo (ou a busca).
        onAposFechar={(adicionou) => {
          const destino = destinoDoFocoAoFecharProduto({
            adicionou,
            origem: cardOrigemRef.current,
            busca: buscaRef.current,
          });
          cardOrigemRef.current = null;
          destino?.focus();
          if (destino && destino === buscaRef.current && adicionou) buscaRef.current.select();
        }}
      />

      <ClienteDialog
        aberto={clienteAberto}
        onFechar={() => setClienteAberto(false)}
        onSelecionar={setCliente}
      />

      {/* Conferência antes do POST — "Voltar e editar" preserva toda a venda. */}
      <ConferenciaDialog
        aberto={conferenciaAberta}
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
