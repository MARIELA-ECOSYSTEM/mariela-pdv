import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PdvHeader } from "@/components/pdv/header/PdvHeader";
import { CatalogoProdutos } from "@/components/pdv/catalogo/CatalogoProdutos";
import { ProdutoDialog } from "@/components/pdv/produto/ProdutoDialog";
import { CarrinhoPanel } from "@/components/pdv/carrinho/CarrinhoPanel";
import { ClienteDialog } from "@/components/pdv/cliente/ClienteDialog";
import { PagamentoPanel } from "@/components/pdv/pagamento/PagamentoPanel";
import { CaixaDialog } from "@/components/pdv/caixa/CaixaDialog";
import { VendaDialog } from "@/components/pdv/venda/VendaDialog";
import { ConferenciaDialog } from "@/components/pdv/venda/ConferenciaDialog";
import { usePdvAuth } from "@/features/auth/PdvAuthProvider";
import { useCarrinho } from "@/features/carrinho/useCarrinho";
import { useAtalhos } from "@/features/atalhos/useAtalhos";
import { useAdquirentes } from "@/features/pagamento/useAdquirentes";
import { formaEhCredito } from "@/lib/pagamento";
import { ajustarParcelas, encontrarAdquirente } from "@/lib/adquirente";
import { arredondarCentavos } from "@/lib/desconto";
import { calcularTotaisPagamento, calcularTotaisVenda } from "@/lib/venda-totais";
import { gerarUuid } from "@/lib/uuid";
import { pdvDataSource } from "@/services/pdv-data-source";

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
  // ---- Caixa: GET /api/v1/pdv/caixa/atual e POST /api/v1/pdv/caixa/abertura ----
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

  function abrirCaixa(valorInicial: number) {
    setCaixa("abrindo");
    void (async () => {
      try {
        await pdvDataSource.caixa.abrir(valorInicial);
        setCaixa("aberto");
      } catch {
        setCaixa("erro");
      }
    })();
  }

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
  // Adquirentes vêm de configuração (Backoffice/API), nunca de lista fixa aqui.
  const { adquirentes } = useAdquirentes();
  const [pagamentos, setPagamentos] = useState<PdvPagamentoLinha[]>([]);
  const pagamentoTotais = useMemo(
    () => calcularTotaisPagamento(pagamentos, total),
    [pagamentos, total],
  );

  function adicionarPagamento(forma: string) {
    setPagamentos((atuais) => [
      ...atuais,
      {
        id: gerarUuid(),
        forma,
        valor: arredondarCentavos(pagamentoTotais.pendente),
        ...(formaEhCredito(forma) ? { parcelas: 1 } : {}),
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
  const [conferenciaAberta, setConferenciaAberta] = useState(false);
  const [tentativa, setTentativa] = useState<PdvVendaTentativa | null>(null);

  function enviarVenda(idempotencyKey: string) {
    setTentativa({
      idempotencyKey,
      estado: "processando",
      itens: carrinho.itens,
      total,
    });

    // POST /api/v1/pdv/vendas — o frontend envia apenas intenção.
    // Preço, estoque e total são autoridade do backend; troco não é enviado.
    // Descontos por item, parcelas e tarifa ainda não têm campo no contrato
    // atual, então permanecem apenas no estado local até o contrato existir.
    const payload: PdvVendaPayload = {
      ...(cliente ? { clienteId: cliente.id } : {}),
      descontoVenda: totais.descontoVenda,
      itens: carrinho.itens.map((item) => ({
        produtoId: item.produtoId,
        varianteId: item.varianteId,
        tamanhoId: item.tamanhoId,
        quantidade: item.quantidade,
      })),
      pagamentos: pagamentos.map((p) => ({ forma: p.forma, valor: p.valor })),
    };

    void (async () => {
      try {
        const venda = await pdvDataSource.vendas.criar(payload, idempotencyKey);
        setConferenciaAberta(false);
        setTentativa((atual) =>
          atual && atual.idempotencyKey === idempotencyKey
            ? { ...atual, estado: "concluida", vendaId: venda.id }
            : atual,
        );
      } catch (error) {
        const mensagem =
          error instanceof Error && error.message
            ? error.message
            : "Não foi possível concluir a venda.";
        setConferenciaAberta(false);
        setTentativa((atual) =>
          atual && atual.idempotencyKey === idempotencyKey
            ? { ...atual, estado: "erro", mensagemErro: mensagem }
            : atual,
        );
      }
    })();
  }

  /** Abre a conferência — nada é enviado ao backend aqui. */
  function abrirConferencia() {
    if (carrinho.itens.length === 0 || tentativa?.estado === "processando") return;
    setConferenciaAberta(true);
  }

  /** Ctrl+Enter avança no fluxo: carrinho → pagamento → conferência. */
  function avancarFluxo() {
    if (carrinho.itens.length === 0) return;
    if (etapa === "carrinho") {
      setEtapa("pagamento");
      return;
    }
    abrirConferencia();
  }

  /** Confirmação definitiva: nova venda = nova idempotencyKey. */
  function confirmarVenda() {
    if (tentativa?.estado === "processando") return;
    enviarVenda(gerarUuid());
  }

  function novaVenda() {
    carrinho.limpar();
    setCliente(null);
    setPagamentos([]);
    setDescontoVenda(DESCONTO_ZERO);
    setTentativa(null);
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
    [carrinho.itens.length, total, tentativa?.estado, etapa],
  );
  useAtalhos(atalhos, caixa === "aberto");

  const bloqueado = caixa !== "aberto";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <PdvHeader vendedorNome={vendedorNome} caixa={caixa} onSair={onSair} />

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
          <CarrinhoPanel
            itens={carrinho.itens}
            cliente={cliente}
            descontoVenda={descontoVenda}
            totais={totais}
            onAbrirCliente={() => setClienteAberto(true)}
            onRemoverCliente={() => setCliente(null)}
            onRemoverItem={carrinho.remover}
            onAlterarQuantidade={carrinho.alterarQuantidade}
            onAlterarDescontoItem={carrinho.alterarDesconto}
            onDescontoVendaChange={setDescontoVenda}
          />

          {/* Pagamento rola por conta própria: nunca empurra o botão para fora. */}
          <div className="max-h-[45%] shrink-0 overflow-y-auto">
            <PagamentoPanel
              pagamentos={pagamentos}
              total={total}
              totais={pagamentoTotais}
              adquirentes={adquirentes}
              onAdicionar={adicionarPagamento}
              onAlterarValor={(id, valor) =>
                setPagamentos((atuais) => atuais.map((p) => (p.id === id ? { ...p, valor } : p)))
              }
              onAlterarParcelas={(id, parcelas) =>
                setPagamentos((atuais) => atuais.map((p) => (p.id === id ? { ...p, parcelas } : p)))
              }
              onAlterarAdquirente={alterarAdquirente}
              onRemover={(id) => setPagamentos((atuais) => atuais.filter((p) => p.id !== id))}
            />
          </div>

          <div className="shrink-0 border-t border-border p-4">
            <Button
              className="h-14 w-full text-base tracking-[0.12em]"
              disabled={carrinho.itens.length === 0 || tentativa?.estado === "processando"}
              onClick={abrirConferencia}
            >
              {tentativa?.estado === "processando" ? (
                <Loader2 className="size-5 animate-spin" />
              ) : null}
              FINALIZAR VENDA
            </Button>
            <p className="mt-2 text-center text-[0.7rem] text-muted-foreground">
              Atalhos: / buscar · Ctrl+Enter finalizar · Esc fechar
            </p>
          </div>
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

      <CaixaDialog estado={caixa} onAbrirCaixa={abrirCaixa} />

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
        onVoltar={() => setConferenciaAberta(false)}
        onConfirmar={confirmarVenda}
      />

      <VendaDialog
        tentativa={tentativa}
        onFechar={() => setTentativa(null)}
        onNovaVenda={novaVenda}
        onTentarNovamente={() => {
          if (tentativa) enviarVenda(tentativa.idempotencyKey);
        }}
      />
    </div>
  );
}
