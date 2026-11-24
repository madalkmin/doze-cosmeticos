# Plano: trazer o estoque-pdv para o sistema Doze

Comparação entre o **estoque-pdv** (React + Vite + Supabase, `Desktop/estoque-pdv`) e o **protótipo Doze** (`prototipo/`, HTML/JS puro, dados fictícios em memória). Não analisei o backend Supabase em si, só o que o front usa dele.

## Decisão principal (antes de tudo)
**Opção A, recomendada: usar o estoque-pdv como base do sistema Doze.** Ele já é um sistema de verdade (login, banco, várias máquinas sincronizadas, cupom térmico, Pix). Aplica-se o tema Botânica Rosé pelo `src/tema.js` e acrescenta-se o que só o Doze tem.
**Opção B: copiar as funções para dentro do protótipo.** Não recomendo: o protótipo não tem banco nem login reais, então seria refazer o que o estoque-pdv já resolve.

O plano abaixo assume a opção A.

## 1. O que o estoque-pdv tem e o Doze não tem

### Caixa (PDV)
1. **Pagamento dividido**: várias formas na mesma venda (ex.: R$ 50 no Pix + o resto no cartão).
2. **Pix com QR Code real**: gerado pela chave Pix da loja já com o valor (`lib/pix.js`). No Doze o QR é falso.
3. **Fiado** como forma de pagamento, mostrando o saldo devedor do cliente.
4. **`3*código`**: bipa já com quantidade.
5. **Preço editável no carrinho**, só para administrador.
6. **Aviso de estoque insuficiente** ao bipar.
7. **Cadastro rápido de cliente** dentro do caixa, e busca por nome, telefone ou documento.

### Abrir e fechar caixa (página nova)
8. Abertura com **fundo de troco**.
9. **Sangria** (retirada) e **suprimento** (reforço) com motivo.
10. **Fechamento**: valor esperado × contado, com diferença destacada.
11. **Histórico de caixas** por operador, detalhes e impressão do fechamento.
12. O caixa só vende com o caixa aberto.

### Vendas (página nova)
13. Lista de todas as vendas com filtros e detalhes.
14. **Reimpressão do cupom.**
15. **Cancelamento de venda com motivo**: os itens voltam ao estoque. (No Doze, precisa também cancelar a NFC-e na SEFAZ.)

### Clientes e fiado
16. **Limite de crédito**, saldo devedor, **registrar recebimento** de fiado, total a receber, filtro "só quem deve".

### Estoque
17. **Variações de verdade** (ex.: batom com vários tons): cada tom com código de barras, SKU, preço e estoque próprios.
18. **Categorias gerenciáveis** (criar/editar na tela).
19. **Ajuste de estoque com motivo** (avaria, inventário, devolução).
20. **Página Movimentações**: histórico de toda entrada e saída, com quem e quando.

### Compras e fornecedores (páginas novas)
21. **Cadastro de fornecedores.**
22. **Registrar compra**: itens, custo, nº da nota; dá entrada no estoque e **atualiza o preço de custo**.

### Relatórios (página nova)
23. Faturamento, lucro bruto, ticket médio, descontos concedidos, vendas por dia, mais vendidos, por forma de pagamento.
24. **Valor em estoque** a preço de custo e de venda; itens sem estoque.
25. **Exportar CSV** e filtro por período.

### Configurações (página nova)
26. Dados da loja (nome, CNPJ, endereço, telefone), chave Pix, **largura da impressora 58/80 mm**, mensagem no rodapé do cupom.

### Usuários e acesso
27. **Login real**: e-mail e senha, criar conta, recuperar senha, medidor de força, aceite de termos (bom para a LGPD).
28. **Aprovação de funcionário**: quem se cadastra fica aguardando o admin liberar ou bloquear.

### Interface
29. **Modo escuro**, menu lateral recolhível no celular.
30. **Tema por arquivo** (`tema.js`): logo, cores, fontes e nome. É onde entra a identidade Botânica Rosé.
31. Componentes prontos: tabela com ordenação e filtros, seletor de data, máscaras (CPF, telefone, moeda), carregamento em esqueleto, confirmações e avisos.
32. **Impressão térmica de verdade** (`lib/cupom.js`), com reimpressão.

## 2. O que o Doze tem e precisa ser levado para a base
- **NFC-e** (hoje simulada): o cupom não fiscal do estoque-pdv vira o cupom da NFC-e via API de emissão. Ver `docs/nota-fiscal.md`.
- **Dados fiscais no produto**: NCM, CEST, CFOP, CSOSN, origem (o estoque-pdv não tem esses campos).
- **Validade/lote** com alerta de vencimento.
- **Contagem de estoque (inventário) por bipe**, mostrando diferenças.
- **Entrada de mercadoria por bipe** (o estoque-pdv faz entrada via Compras, digitando).
- **Financeiro**: contas a pagar e a receber.
- **3 perfis** (Administrador, Gerente, Vendedora) com tabela de permissões. O estoque-pdv tem só 2 (Admin e Operador).
- **Aniversariantes** e WhatsApp do cliente; CPF na nota.
- **Painel** com variação percentual e gráfico de 8 semanas; miniaturas por categoria; som do bipe.
- **Importar produtos por planilha** (no protótipo é só um botão; precisa ser feito de verdade, importante para a migração do sistema antigo).

## 3. Conflitos para decidir
| Tema | estoque-pdv | Doze | Sugestão |
|---|---|---|---|
| Atalhos | F2 finalizar, F4 cliente | F2 buscar, F4 finalizar | ficar com o do estoque-pdv |
| Cupom | não fiscal | NFC-e | NFC-e (obrigatório) |
| Perfis | 2 | 3 | 3, com Gerente entre os dois |
| Fiado | tem | não tem | perguntar se a loja vende fiado |
| Desconto | em R$ | em R$ | igual; avaliar % também |

## 4. Fases sugeridas
1. **Base**: copiar o estoque-pdv para o projeto Doze, novo projeto Supabase, aplicar o tema Botânica Rosé (cores, Fraunces/Inter, símbolo escolhido).
2. **Perfis**: acrescentar Gerente e a tabela de permissões.
3. **Produto fiscal e cosmético**: campos NCM/CEST/CFOP/CSOSN/origem, validade/lote, importação por planilha (cadastro do sistema antigo ou XMLs).
4. **Estoque por bipe**: entrada e contagem/inventário.
5. **NFC-e em homologação**: integrar a API de emissão; cancelamento, contingência, CPF na nota.
6. **Financeiro**: contas a pagar/receber, ligado ao fechamento de caixa e às compras.
7. **Extras**: aniversariantes/WhatsApp, painel com comparativos.
8. **Produção**: testes com o contador, migração dos dados, treinamento.

## Perguntas para você
- Vamos de opção A (estoque-pdv como base)?
- Quais itens da seção 1 entram? (Sugestão: todos; o único talvez dispensável é o fiado.)
- Os atalhos de teclado ficam como no estoque-pdv?
