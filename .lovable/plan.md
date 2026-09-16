# Plano — Cabeçalho, cliente e Minhas Vendas

## Objetivo
Reorganizar o contexto da venda no topo, liberar mais espaço no carrinho e adicionar a estrutura de consulta “Minhas Vendas”, preservando integralmente a venda em andamento e sem inventar integração.

## Alterações de interface
- Reorganizar o cabeçalho em uma composição compacta e responsiva com:
  - marca e estado do caixa;
  - vendedor autenticado, identificado como sessão atual;
  - cliente da venda em grupo separado, com ação “Selecionar” ou “Alterar”;
  - ação “Minhas Vendas”, tema e saída;
  - indicador `01 Cliente → 02 Carrinho → 03 Pagamento` integrado à região superior.
- Usar divisor, espaçamento e bordas já existentes para distinguir vendedor e cliente, sem criar novos cards.
- Remover o resumo duplicado de cliente das etapas Carrinho e Pagamento; a seleção continuará acessível pelo cabeçalho e pela etapa Cliente.
- Preservar o conteúdo e o estado atuais do carrinho, pagamentos, descontos, parcelas e conferência.

## Dialog “Minhas Vendas”
- Criar um dialog somente de consulta, aberto pelo cabeçalho e fechado sem alterar qualquer estado da venda atual.
- Preparar a apresentação compacta da lista, filtros de período (`Hoje`, `Ontem`, `Personalizado`), status, cliente, forma e situação do pagamento.
- Preparar a área interna de detalhe para itens, quantidades, valores, descontos, cliente, pagamentos, parcelas e status, exibindo somente campos que um contrato real venha a fornecer.
- Não oferecer edição, seleção de outro vendedor ou navegação para outra página.

## Limite confirmado da integração
A porta `PdvVendasPort` e o adaptador real possuem somente `criar()` para `POST /api/v1/pdv/vendas`. O próprio projeto documenta que não existe uma operação de “minhas vendas”. Portanto:
- não será criado endpoint, método de porta, tipo de resposta ou dado fictício;
- o dialog mostrará um estado informativo de integração pendente;
- filtros e detalhe ficarão preparados visualmente, mas sem alegar que consultam dados reais;
- a listagem real dependerá do contrato oficial do backend para histórico restrito ao vendedor autenticado.

## Validação
- Verificar visualmente em desktop e largura móvel que o cabeçalho não sobrepõe conteúdo e que o carrinho ganhou espaço.
- Confirmar que cliente pode ser selecionado/alterado e permanece associado à venda.
- Confirmar que abrir e fechar “Minhas Vendas” preserva cliente, itens, pagamentos, parcelas e etapa.
- Confirmar que não existe “04 Conferência” e que `CONFERIR VENDA` permanece inalterado.
- Executar testes, verificação de tipos, lint e build; conferir os diagnósticos finais do preview.
