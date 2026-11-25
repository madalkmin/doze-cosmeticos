# Doze Cosméticos — Sistema de Gestão

Sistema web interno da loja (uso da equipe, não é loja virtual).

## Módulos
1. **Vendas (PDV)**: caixa com leitor de código de barras, carrinho, descontos, formas de pagamento (Pix, cartão, dinheiro), cancelamento/troca.
2. **Estoque**: cadastro de produtos (EAN, marca, categoria, custo, preço, validade/lote), baixa automática na venda, entrada por nota/bipe, alerta de estoque mínimo e de vencimento, inventário por bipe.
3. **Clientes**: cadastro, histórico de compras, aniversariantes, contato por WhatsApp.
4. **Financeiro**: fluxo de caixa, contas a pagar/receber, abertura/fechamento de caixa, margem por produto.
5. **Métricas**: faturamento por dia/mês, ticket médio, mais vendidos, produtos parados, curva ABC.

## Leitor de código de barras (bipe)
- Leitor USB/Bluetooth funciona como teclado: "digita" o código e aperta Enter. O site só precisa de um campo focado que escuta isso — sem driver, sem integração especial.
- Cosméticos já vêm com EAN-13 de fábrica: cadastra uma vez (bipa + preenche), depois toda venda é só bipar.
- Produtos sem código (kits, fracionados): o sistema gera código interno e imprime etiqueta (impressora térmica, opcional).
- Alternativa sem comprar nada: câmera do celular como leitor (mais lento, bom pra inventário).
- Fluxos com bipe: venda (baixa no estoque), entrada de mercadoria (soma), inventário/contagem (confere).

## Decisões (2026-11-18)
- **Local da loja: Limeira - SP** (não é Itapema-SC; o Instagram aberto no início mostrava outro nome). Nota fiscal segue as regras da SEFAZ-SP; em SP o SAT está sendo substituído pela NFC-e — confirmar com o contador qual a loja usa hoje.
- **Nota fiscal: sim.** A loja emite NFC-e → integrar via API de emissor (Focus NFe, PlugNotas ou NFE.io), não construir do zero. Exige certificado digital A1 + CSC da SEFAZ-SP. Produto precisa de NCM, CFOP, CEST e tributação no cadastro.
- **Uso:** site acessível de qualquer lugar; foco é o computador do caixa (tela otimizada pra teclado + leitor).
- **Catálogo grande:** cadastro robusto com categorias/subcategorias, marcas, variações (cor/tom/tamanho), preço de custo/venda, margem, fotos, busca rápida, importação por planilha.
- **Cartão:** maquininha separada; sistema só registra forma de pagamento (e parcelas/taxa pro financeiro).
- **Stack:** front estático (HTML/JS ou React + Vite build) + backend PHP (Laravel) com API em `/api` + banco MySQL.
- **Hospedagem:** HostGator (cPanel; PHP + MySQL; sem Node na hospedagem compartilhada). SSL ativo por causa do login.

- **Permissões:** sim. Perfis iniciais: Administrador (tudo), Gerente (sem config. de usuários), Vendedora (caixa, clientes, consulta de estoque; sem financeiro/custos).
- Cupom = DANFE NFC-e em impressora térmica (ou envio por WhatsApp).

## Fase atual: PROTÓTIPO para orçamento
Objetivo: demonstrar o sistema para a cliente (amiga) e fechar o orçamento.
- Telas navegáveis com dados fictícios realistas de cosméticos; sem backend real.
- NFC-e apenas simulada (mostrar o cupom com QR Code de exemplo).
- Troca de perfil na demo para mostrar as permissões.

## Pontos em aberto
- Emissor de NFC-e atual: desconhecido (perguntar à loja).
- Regime tributário: desconhecido (perguntar ao contador).
