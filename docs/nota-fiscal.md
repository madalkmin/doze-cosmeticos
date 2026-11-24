# Nota fiscal no sistema Doze — guia de estudo

Loja em Limeira-SP → regras da **SEFAZ-SP**.

## 1. Que nota a loja emite
- Venda no balcão para consumidor final: **NFC-e (modelo 65)**. É a nota do caixa.
- Em SP, o antigo **SAT (CF-e)** acabou: emissão proibida desde 01/01/2026 (Portaria SRE 79/2024). Só NFC-e agora.
  - Correção do que falei antes: eu disse que SAT não se aplicava; na verdade SP usava SAT, mas ele foi extinto, então o caminho é mesmo NFC-e.
- Venda para empresa (CNPJ), devolução a fornecedor, transferência: **NF-e (modelo 55)**. Raro na loja; deixar para fase 2.

## 2. Como a NFC-e funciona (fluxo)
1. Venda finalizada no caixa.
2. Sistema monta um **XML** com: dados da loja, itens (com dados fiscais), totais, pagamento, CPF do cliente (opcional).
3. XML é **assinado** com o certificado digital da loja.
4. Enviado ao **web service da SEFAZ-SP** → resposta em segundos: **autorizada** (com protocolo) ou **rejeitada** (com código do erro).
5. Imprime o **DANFE NFC-e** (cupom com QR Code) ou manda por WhatsApp/e-mail.
6. XML guardado por **5 anos** (obrigação legal).

Extras que o sistema precisa ter:
- **Cancelamento**: até 30 min após autorização (prazo SP; confirmar), com justificativa.
- **Inutilização**: quando um número de nota é pulado (falha), avisar a SEFAZ.
- **Contingência offline**: sem internet, emite em modo offline e transmite depois (prazo curto).
- **Numeração e série** sequenciais por caixa.

## 3. O que a loja precisa providenciar (com o contador)
| Item | O que é | Quem resolve |
|---|---|---|
| Inscrição Estadual ativa | cadastro no ICMS | contador |
| Credenciamento NFC-e na SEFAZ-SP | autoriza a emitir | contador / dona no portal |
| Certificado digital **e-CNPJ A1** | arquivo .pfx que assina as notas (~R$150–250/ano) | certificadora |
| **CSC** (código de segurança do contribuinte) + ID | usado no QR Code | gerado no portal SEFAZ-SP |
| Regime tributário | Simples Nacional? define CSOSN vs CST | contador |

## 4. Dados fiscais de cada produto (o cadastro precisa ter)
- **NCM** (8 dígitos): classificação do produto. Ex.: batom 3304.10.00, perfume 3303.00.10, shampoo 3305.10.00 (contador confirma).
- **CEST**: obrigatório para itens com substituição tributária — **cosméticos e perfumaria em SP costumam ter ST**, importante.
- **CFOP**: natureza da operação. Venda comum 5102; produto com ST já recolhida 5405.
- **CSOSN** (Simples) ou **CST** (regime normal): situação do ICMS. Ex.: 102 ou 500 (ST).
- **Origem** (0 nacional, 1/2 importado), unidade, EAN.
- PIS/COFINS conforme regime.
- **Reforma tributária (IBS/CBS)**: desde 2026 a nota tem campos novos de IBS/CBS (fase de teste). Verificar com o contador/emissor se a loja precisa preencher.

> Dica: o contador pode mandar uma planilha "NCM + CFOP + CSOSN" por categoria. Assim o sistema preenche automático pela categoria do produto.

## 5. Como o sistema vai emitir (decisão técnica)
Não falar direto com a SEFAZ; usar uma **API de emissão**:
- **Focus NFe**, **PlugNotas (TecnoSpeed)**, **NFE.io**, **Nuvem Fiscal** — ~R$50–150/mês.
- Elas cuidam de: montar XML no padrão, assinar, enviar, contingência, DANFE em PDF, guardar XML.
- O sistema só manda um JSON: `{itens, pagamento, cliente}` → recebe `{status, chave, protocolo, url_danfe, url_xml}`.
- Todas têm **ambiente de homologação** (testes, notas sem valor) → dá para desenvolver sem a loja ter certificado ainda.

## 6. Ordem de estudo sugerida
1. Ler o portal NFC-e da SEFAZ-SP (perguntas frequentes).
2. Criar conta grátis/sandbox em 1–2 APIs e emitir uma nota de teste.
3. Ver um XML de NFC-e real (pedir uma nota à loja) e identificar os campos acima.
4. Reunião com o contador: regime, NCM/CSOSN por categoria, ST, CSC.
5. Implementar no sistema: cadastro fiscal → emissão → cancelamento → contingência.

## Perguntas para o contador
- Regime tributário da loja?
- Tabela NCM / CFOP / CSOSN / CEST por categoria de produto?
- Quais produtos têm ST?
- Loja já credenciada para NFC-e? Qual emissor usa hoje? (SAT acabou em 2025, então já deve ter migrado)
- Precisa preencher IBS/CBS agora?

Fontes: blog.tecnospeed.com.br/sefaz-sp-portaria-sre/ · eticaplanejamento.com.br (fim do SAT) · juscon.com.br (prazo 31/12/2025). Conferir no portal oficial portal.fazenda.sp.gov.br.
