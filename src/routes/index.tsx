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
import { usePdvAuth } from "@/features/auth/PdvAuthProvider";
import { useCarrinho } from "@/features/carrinho/useCarrinho";
import { useAtalhos } from "@/features/atalhos/useAtalhos";
import { parseValor } from "@/lib/format";
import { pdvDataSource } from "@/services/pdv-data-source";
import type { RequestState } from "@/types/api";
import type { PdvProduto } from "@/types/produto";
import type { PdvCliente } from "@/types/cliente";
import type { PdvCaixaEstado } from "@/types/caixa";
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

  function abrirCaixa() {
    setCaixa("abrindo");
    void (async () => {
      try {
        // O valor de abertura definitivo virá da tela de abertura; o backend valida.
        await pdvDataSource.caixa.abrir(0);
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
    void (async () => {
      try {
        const lista = await pdvDataSource.produtos.listar();
        if (!ativo) return;
        setProdutos(lista);
        setEstadoCatalogo("success");
      } catch {
        if (!ativo) return;
        setProdutos([]);
        setEstadoCatalogo("error");
      }
    })();
    return () => {
      ativo = false;
    };
  }, [recarga]);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(termo) || (p.codigo ?? "").toLowerCase().includes(termo),
    );
  }, [produtos, busca]);

  // ---- Produto / carrinho / cliente ----
  const [produtoSelecionado, setProdutoSelecionado] = useState<PdvProduto | null>(null);
  const [clienteAberto, setClienteAberto] = useState(false);
  const [cliente, setCliente] = useState<PdvCliente | null>(null);
  const carrinho = useCarrinho();

  // ---- Desconto (intenção; backend é a autoridade) ----
  const [descontoTexto, setDescontoTexto] = useState("");
  const desconto = parseValor(descontoTexto);
  const total = Math.max(0, carrinho.subtotal - Math.min(desconto, carrinho.subtotal));

  // ---- Pagamentos ----
  const [pagamentos, setPagamentos] = useState<PdvPagamentoLinha[]>([]);
  const pago = pagamentos.reduce((t, p) => t + p.valor, 0);
  const restante = Math.max(0, total - pago);
  const troco = Math.max(0, pago - total); // apenas auxílio visual; não é enviado ao backend

  function adicionarPagamento(forma: string) {
    setPagamentos((atuais) => [
      ...atuais,
      { id: crypto.randomUUID(), forma, valor: Number(restante.toFixed(2)) },
    ]);
  }

  // ---- Venda ----
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
    const payload: PdvVendaPayload = {
      ...(cliente ? { clienteId: cliente.id } : {}),
      desconto,
      itens: carrinho.itens.map((item) => ({
        produtoId: item.produtoId,
        ...(item.varianteId ? { varianteId: item.varianteId } : {}),
        quantidade: item.quantidade,
      })),
      pagamentos: pagamentos.map((p) => ({ forma: p.forma, valor: p.valor })),
    };

    void (async () => {
      try {
        const venda = await pdvDataSource.vendas.criar(payload, idempotencyKey);
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
        setTentativa((atual) =>
          atual && atual.idempotencyKey === idempotencyKey
            ? { ...atual, estado: "erro", mensagemErro: mensagem }
            : atual,
        );
      }
    })();
  }

  function finalizarVenda() {
    if (carrinho.itens.length === 0 || tentativa?.estado === "processando") return;
    enviarVenda(crypto.randomUUID());
  }

  function novaVenda() {
    carrinho.limpar();
    setCliente(null);
    setPagamentos([]);
    setDescontoTexto("");
    setTentativa(null);
    buscaRef.current?.focus();
  }

  const atalhos = useMemo(
    () => [
      { tecla: "/", acao: () => buscaRef.current?.focus() },
      { tecla: "Enter", ctrl: true, acao: finalizarVenda },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [carrinho.itens.length, total, tentativa?.estado],
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
            descontoTexto={descontoTexto}
            subtotal={carrinho.subtotal}
            desconto={desconto}
            total={total}
            onAbrirCliente={() => setClienteAberto(true)}
            onRemoverCliente={() => setCliente(null)}
            onRemoverItem={carrinho.remover}
            onAlterarQuantidade={carrinho.alterarQuantidade}
            onDescontoChange={setDescontoTexto}
          />

          <PagamentoPanel
            pagamentos={pagamentos}
            total={total}
            pago={pago}
            restante={restante}
            troco={troco}
            onAdicionar={adicionarPagamento}
            onAlterarValor={(id, texto) =>
              setPagamentos((atuais) =>
                atuais.map((p) => (p.id === id ? { ...p, valor: parseValor(texto) } : p)),
              )
            }
            onRemover={(id) => setPagamentos((atuais) => atuais.filter((p) => p.id !== id))}
          />

          <div className="border-t border-border p-4">
            <Button
              className="h-14 w-full text-base tracking-[0.12em]"
              disabled={carrinho.itens.length === 0 || tentativa?.estado === "processando"}
              onClick={finalizarVenda}
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
