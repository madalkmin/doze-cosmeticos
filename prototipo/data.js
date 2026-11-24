// Dados fictícios para demonstração
const CATEGORIAS = ['Maquiagem', 'Skincare', 'Cabelos', 'Perfumaria', 'Corpo & Banho', 'Unhas', 'Acessórios'];
const MARCAS = ['Ruby Rose', 'Vult', 'Océane', 'Eudora', 'Natura', 'Boticário', 'Payot', 'Neutrogena', 'La Roche-Posay', 'Salon Line', 'Lola', 'Risqué', 'Dailus', 'Macrilan'];

const PRODUTOS_SEED = [
  ['7891350034567','Batom Matte Vermelho Paixão','Maquiagem','Ruby Rose','Vermelho',8.5,19.9,24,5,'2027-08'],
  ['7891350034574','Batom Matte Nude Rosé','Maquiagem','Ruby Rose','Nude',8.5,19.9,3,5,'2027-08'],
  ['7899045600112','Base Líquida HD Bege Médio','Maquiagem','Vult','Bege 03',22,49.9,12,4,'2027-03'],
  ['7899045600129','Base Líquida HD Bege Claro','Maquiagem','Vult','Bege 01',22,49.9,7,4,'2027-03'],
  ['7899045600235','Corretivo Líquido Cobertura Alta','Maquiagem','Vult','Claro',14,32.9,15,4,'2027-05'],
  ['7898612340011','Máscara de Cílios Volume Extremo','Maquiagem','Océane','Preto',18,39.9,20,5,'2027-01'],
  ['7898612340028','Paleta de Sombras Nude 12 cores','Maquiagem','Océane','',35,79.9,6,3,'2028-02'],
  ['7891033201451','Pó Compacto Translúcido','Maquiagem','Dailus','',12,27.9,2,4,'2027-11'],
  ['7891033201468','Blush Compacto Pêssego','Maquiagem','Dailus','Pêssego',11,24.9,9,4,'2027-10'],
  ['7891350099901','Delineador em Caneta','Maquiagem','Ruby Rose','Preto',9,21.9,18,5,'2027-06'],
  ['7896090611009','Sérum Vitamina C 30ml','Skincare','Payot','',42,89.9,10,3,'2027-02'],
  ['7896090611016','Hidratante Facial FPS 30','Skincare','Payot','',38,79.9,8,3,'2026-12'],
  ['7891010031234','Gel de Limpeza Facial 150g','Skincare','Neutrogena','',24,49.9,14,4,'2027-07'],
  ['3337875597388','Protetor Solar Anthelios FPS 70','Skincare','La Roche-Posay','',62,119.9,5,3,'2027-04'],
  ['3337875545778','Água Termal 150ml','Skincare','La Roche-Posay','',45,89.9,1,3,'2027-09'],
  ['7898944770012','Máscara Capilar Cachos 1kg','Cabelos','Salon Line','',18,39.9,22,5,'2027-12'],
  ['7898944770029','Creme de Pentear Definição 300ml','Cabelos','Salon Line','',9,19.9,30,6,'2027-12'],
  ['7898944770036','Óleo Reparador de Pontas','Cabelos','Salon Line','',11,24.9,4,5,'2028-01'],
  ['7898556870012','Shampoo Detox 250ml','Cabelos','Lola','',22,49.9,11,4,'2027-05'],
  ['7898556870029','Condicionador Detox 250ml','Cabelos','Lola','',22,49.9,9,4,'2027-05'],
  ['7891033102345','Perfume Floratta Rose 75ml','Perfumaria','Boticário','',85,169.9,6,2,'2029-01'],
  ['7891033102352','Perfume Malbec 100ml','Perfumaria','Boticário','',110,219.9,4,2,'2029-01'],
  ['7891033302311','Body Splash Morango 200ml','Perfumaria','Eudora','',25,54.9,13,4,'2028-06'],
  ['7909189012345','Hidratante Corporal Tododia 400ml','Corpo & Banho','Natura','Macadâmia',32,64.9,10,4,'2027-10'],
  ['7909189012352','Sabonete Líquido Ekos 195ml','Corpo & Banho','Natura','Castanha',19,39.9,0,4,'2027-08'],
  ['7909189012369','Esfoliante Corporal 200g','Corpo & Banho','Natura','',22,44.9,7,3,'2027-06'],
  ['7891350500011','Esmalte Cremoso Vermelho','Unhas','Risqué','Vermelho Ferrari',3.2,7.9,48,10,'2028-03'],
  ['7891350500028','Esmalte Cremoso Nude','Unhas','Risqué','Bege',3.2,7.9,36,10,'2028-03'],
  ['7891350500035','Base Fortalecedora','Unhas','Risqué','',4,9.9,25,8,'2028-03'],
  ['7896006200011','Removedor de Esmalte 100ml','Unhas','Macrilan','',3,7.5,19,6,'2028-05'],
  ['7896006299992','Kit Pincéis 12 peças','Acessórios','Macrilan','',28,69.9,5,2,''],
  ['7896006299985','Esponja de Maquiagem Gota','Acessórios','Macrilan','',4,12.9,40,8,''],
];

// Linha = produto "pai"; cada tom/cor é uma variação com código e estoque próprios
const LINHAS = {
  '7891350034567': 'Batom Matte Ruby Rose', '7891350034574': 'Batom Matte Ruby Rose',
  '7899045600112': 'Base Líquida HD Vult', '7899045600129': 'Base Líquida HD Vult',
  '7891350500011': 'Esmalte Cremoso Risqué', '7891350500028': 'Esmalte Cremoso Risqué',
};
const PRODUTOS = PRODUTOS_SEED.map((p, i) => ({
  id: i + 1, ean: p[0], nome: p[1], categoria: p[2], marca: p[3], variacao: p[4],
  custo: p[5], preco: p[6], estoque: p[7], minimo: p[8], validade: p[9],
  linha: LINHAS[p[0]] || p[1], sku: 'DZ-' + String(i + 1).padStart(4, '0'),
}));

const CLIENTES = [
  { id: 1, nome: 'Ana Paula Souza', cpf: '123.456.789-00', fone: '(19) 99912-3456', nasc: '1990-11-21', compras: [] },
  { id: 2, nome: 'Juliana Martins', cpf: '987.654.321-00', fone: '(19) 99876-5432', nasc: '1985-11-19', compras: [] },
  { id: 3, nome: 'Fernanda Lima', cpf: '456.789.123-00', fone: '(19) 98811-2233', nasc: '1998-03-02', compras: [] },
  { id: 4, nome: 'Camila Rocha', cpf: '321.654.987-00', fone: '(19) 99654-7788', nasc: '1993-07-15', compras: [] },
  { id: 5, nome: 'Patrícia Alves', cpf: '159.753.486-00', fone: '(19) 99123-9988', nasc: '1979-12-05', compras: [] },
  { id: 6, nome: 'Beatriz Costa', cpf: '753.159.852-00', fone: '(19) 98456-1122', nasc: '2001-11-25', compras: [] },
];

// Senhas apenas de demonstração
const USUARIOS = [
  { id: 1, nome: 'Carla (Dona)', email: 'carla@doze.com', senha: 'doze123', perfil: 'admin', status: 'ativo' },
  { id: 2, nome: 'Renata', email: 'renata@doze.com', senha: 'doze123', perfil: 'gerente', status: 'ativo' },
  { id: 3, nome: 'Bruna', email: 'bruna@doze.com', senha: 'doze123', perfil: 'vendedora', status: 'ativo' },
  { id: 4, nome: 'Larissa Prado', email: 'larissa@doze.com', senha: 'doze123', perfil: 'vendedora', status: 'pendente' },
];

const PERFIS = {
  admin:     { nome: 'Administrador', telas: ['painel','caixa','caixas','vendas','clientes','produtos','estoque','movimentacoes','compras','fornecedores','financeiro','relatorios','usuarios','configuracoes'], verCusto: true, cancelar: true, editarPreco: true },
  gerente:   { nome: 'Gerente',       telas: ['painel','caixa','caixas','vendas','clientes','produtos','estoque','movimentacoes','compras','fornecedores','financeiro','relatorios'], verCusto: true, cancelar: true, editarPreco: false },
  vendedora: { nome: 'Vendedora',     telas: ['caixa','caixas','vendas','clientes','estoque'], verCusto: false, cancelar: false, editarPreco: false },
};

// Gera histórico de vendas dos últimos 60 dias
function gerarVendas() {
  const vendas = [];
  const pagamentos = ['Pix', 'Crédito', 'Débito', 'Dinheiro'];
  let seed = 42;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const hoje = new Date();
  let id = 1000;
  for (let d = 59; d >= 0; d--) {
    const dia = new Date(hoje); dia.setDate(hoje.getDate() - d);
    const n = 4 + Math.floor(rnd() * (dia.getDay() === 6 ? 14 : 9));
    for (let k = 0; k < n; k++) {
      const itens = [];
      const qtdItens = 1 + Math.floor(rnd() * 3);
      for (let j = 0; j < qtdItens; j++) {
        const p = PRODUTOS[Math.floor(Math.pow(rnd(), 1.6) * PRODUTOS.length)];
        itens.push({ id: p.id, nome: p.nome, preco: p.preco, custo: p.custo, qtd: 1 + (rnd() < 0.2 ? 1 : 0) });
      }
      const data = new Date(dia); data.setHours(9 + Math.floor(rnd() * 10), Math.floor(rnd() * 60));
      const total = itens.reduce((s, i) => s + i.preco * i.qtd, 0);
      const cliente = rnd() < 0.5 ? CLIENTES[Math.floor(rnd() * CLIENTES.length)].id : null;
      const pg = pagamentos[Math.floor(rnd() * 4)];
      vendas.push({ id: id++, data: data.toISOString(), itens, total, desconto: 0, pagamento: pg, pagamentos: [{ forma: pg, valor: total }], troco: 0, cliente, vendedor: USUARIOS[Math.floor(rnd() * 3)].nome, nfce: String(id).padStart(9, '0'), caixa: null });
    }
  }
  return vendas;
}

const CONTAS = [
  { id: 1, tipo: 'pagar', descricao: 'Aluguel da loja', valor: 3200, vencimento: '2026-11-25', pago: false },
  { id: 2, tipo: 'pagar', descricao: 'Fornecedor Vult - pedido #8812', valor: 1840, vencimento: '2026-11-20', pago: false },
  { id: 3, tipo: 'pagar', descricao: 'Energia elétrica', valor: 410, vencimento: '2026-11-15', pago: true },
  { id: 4, tipo: 'pagar', descricao: 'Emissor NFC-e (mensalidade)', valor: 89, vencimento: '2026-11-28', pago: false },
  { id: 5, tipo: 'pagar', descricao: 'Fornecedor Salon Line', valor: 960, vencimento: '2026-12-02', pago: false },
  { id: 6, tipo: 'receber', descricao: 'Repasse maquininha (crédito)', valor: 4380, vencimento: '2026-11-21', pago: false },
  { id: 7, tipo: 'receber', descricao: 'Crediário - Patrícia Alves', valor: 150, vencimento: '2026-11-30', pago: false },
];

const FORNECEDORES = [
  { id: 1, nome: 'Vult Distribuidora', cnpj: '12.345.678/0001-90', fone: '(11) 3456-7890', contato: 'Marcos', email: 'pedidos@vult.exemplo' },
  { id: 2, nome: 'Salon Line Comercial', cnpj: '23.456.789/0001-01', fone: '(11) 4002-8922', contato: 'Aline', email: 'vendas@salonline.exemplo' },
  { id: 3, nome: 'Atacado Beleza Limeira', cnpj: '34.567.890/0001-12', fone: '(19) 3441-2200', contato: 'Sérgio', email: 'contato@atacadobeleza.exemplo' },
];

// Configurações da loja (dados impressos no cupom e Pix)
const CONFIG = {
  nome: 'DOZE COSMÉTICOS LTDA', cnpj: '00.000.000/0001-00', endereco: 'Rua Exemplo, 123 - Centro', cidade: 'Limeira', uf: 'SP', fone: '(19) 99999-0000',
  chavePix: 'pix@doze.com', nomePix: 'DOZE COSMETICOS', cidadePix: 'LIMEIRA', largura: 80, rodape: 'Obrigada pela preferência! Trocas em até 7 dias com o cupom.',
};
