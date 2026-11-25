// ===== Utilidades =====
const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
// Moeda: num() lê "R$ 1.234,56" (ou número), moeda() formata o valor inicial do campo
const num = v => typeof v === 'number' ? v : +String(v ?? '').replace(/[^\d,-]/g, '').replace(',', '.') || 0;
// Código de barras: sem espaços, para comparar e salvar sempre igual
const codBarras = v => String(v ?? '').replace(/\s+/g, '');
const eanEmUso = (cod, idAtual) => { const c = codBarras(cod); return !!c && S.produtos.find(p => codBarras(p.ean) === c && p.id !== idAtual); };
const moeda = v => v === '' || v == null ? '' : brl(+v);
const $ = s => document.querySelector(s);
const hojeISO = () => new Date().toISOString().slice(0, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iniciais = n => n.replace(/\(.*\)/, '').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();

// Ícones Lucide renderizados como SVG inline
const pascal = n => n.split('-').map(p => p[0].toUpperCase() + p.slice(1)).join('');
function ic(nome, cls = '') {
  let node = window.lucide && lucide.icons[pascal(nome)];
  if (!node) return '';
  if (node[0] === 'svg') node = node[2]; // formato ['svg', attrs, filhos]
  const filhos = node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
  return `<svg class="i ${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${filhos}</svg>`;
}

const CAT_ESTILO = {
  'Maquiagem':     { icon: 'paintbrush', bg: '#f4dfe0', fg: '#7d3150' },
  'Skincare':      { icon: 'droplets',   bg: '#e5efec', fg: '#3f6f62' },
  'Cabelos':       { icon: 'scissors',   bg: '#f3e8dc', fg: '#8a5a2b' },
  'Perfumaria':    { icon: 'spray-can',  bg: '#ece4f1', fg: '#6a4a85' },
  'Corpo & Banho': { icon: 'bath',       bg: '#e3edf3', fg: '#3c6680' },
  'Unhas':         { icon: 'hand',       bg: '#f8e6e0', fg: '#a85a4a' },
  'Acessórios':    { icon: 'gem',        bg: '#efece4', fg: '#6b6248' },
};
const thumb = (cat, sm) => { const e = CAT_ESTILO[cat] || CAT_ESTILO['Acessórios']; return `<span class="thumb ${sm ? 'sm' : ''}" style="background:${e.bg};color:${e.fg}">${ic(e.icon, sm ? 'sm' : '')}</span>`; };

// ===== Estado =====
const S = {
  produtos: PRODUTOS, clientes: CLIENTES, vendas: gerarVendas(), contas: CONTAS, fornecedores: FORNECEDORES, compras: [], config: CONFIG,
  movs: [], usuario: null, carrinho: [], desconto: 0, clienteVenda: null,
  caixas: [], caixa: null,
};
const vendasValidas = () => S.vendas.filter(v => !v.cancelada);
// Caixas de demonstração: 3 fechados nos dias anteriores e 1 aberto hoje
(function semearCaixas() {
  const mk = (diasAtras, h, op) => { const d = new Date(); d.setDate(d.getDate() - diasAtras); d.setHours(h, 0, 0, 0); return d.toISOString(); };
  [[3, 'Carla (Dona)', 0], [2, 'Renata', -5], [1, 'Bruna', 2.5]].forEach(([d, op, dif], k) => {
    const c = { id: 101 + k, operador: op, abertoEm: mk(d, 9), fechadoEm: mk(d, 19), fundo: 200, movimentos: [{ tipo: 'sangria', valor: 300, motivo: 'Depósito no banco', data: mk(d, 15), usuario: op }], status: 'fechado' };
    S.caixas.push(c);
    const ini = c.abertoEm.slice(0, 10);
    S.vendas.filter(v => v.data.slice(0, 10) === ini).forEach(v => v.caixa = c.id);
    c.esperado = esperadoDinheiro(c); c.contado = Math.round((c.esperado + dif) * 100) / 100; c.diferenca = Math.round((c.contado - c.esperado) * 100) / 100;
  });
  const hoje = { id: 104, operador: 'Carla (Dona)', abertoEm: new Date(Math.min(Date.now() - 20 * 6e4, +new Date(mk(0, 9)))).toISOString(), fundo: 200, movimentos: [], status: 'aberto' };
  S.caixas.push(hoje); S.caixa = hoje;
  S.vendas.filter(v => v.data.slice(0, 10) === hojeISO()).forEach(v => v.caixa = hoje.id);
})();
function esperadoDinheiro(c) {
  const vendas = S.vendas.filter(v => v.caixa === c.id && !v.cancelada);
  const din = vendas.reduce((s, v) => s + v.pagamentos.filter(p => p.forma === 'Dinheiro').reduce((a, p) => a + p.valor, 0) - (v.troco || 0), 0);
  const mov = c.movimentos.reduce((s, m) => s + (m.tipo === 'suprimento' ? m.valor : -m.valor), 0);
  return Math.round((c.fundo + din + mov) * 100) / 100;
}
const perfil = () => PERFIS[S.usuario.perfil];
const pode = t => perfil().telas.includes(t);

// Todas as telas (rota → ícone e nome). Algumas ficam como aba de outra tela.
const ROTAS = {
  painel: ['layout-dashboard', 'Painel'], caixa: ['scan-barcode', 'Caixa'], caixas: ['lock-keyhole', 'Abrir/fechar caixa'],
  vendas: ['receipt', 'Vendas'], clientes: ['users', 'Clientes'],
  produtos: ['package', 'Produtos'], estoque: ['boxes', 'Estoque'], movimentacoes: ['arrow-left-right', 'Movimentações'],
  compras: ['shopping-cart', 'Compras'], fornecedores: ['truck', 'Fornecedores'],
  financeiro: ['wallet', 'Financeiro'], relatorios: ['chart-pie', 'Relatórios'], usuarios: ['shield-check', 'Usuários'], configuracoes: ['settings', 'Configurações'],
};
// Telas que aparecem como aba dentro de outra (o menu marca a "mãe")
const ROTA_MAE = { caixas: 'caixa', movimentacoes: 'estoque', fornecedores: 'compras' };
const MENU = [
  ['§', 'Operação'], 'painel', 'caixa', 'vendas', 'clientes',
  ['§', 'Estoque'], 'produtos', 'estoque', 'compras',
  ['§', 'Gestão'], 'financeiro', 'relatorios', 'usuarios', 'configuracoes',
].map(m => Array.isArray(m) ? m : [m, ...ROTAS[m]]);
// Abas que ligam telas irmãs (ex.: Compras | Fornecedores)
function abasRota(lista, atual) {
  const it = lista.filter(([r]) => pode(r));
  return it.length > 1 ? `<nav class="seg" aria-label="Seções">${it.map(([r, i, n]) => `<a href="#${r}" class="${r === atual ? 'sel' : ''}" ${r === atual ? 'aria-current="page"' : ''}>${ic(i, 'sm')}${n}</a>`).join('')}</nav>` : '';
}
const PAGAMENTOS = [['Pix', 'qr-code'], ['Crédito', 'credit-card'], ['Débito', 'wallet-cards'], ['Dinheiro', 'banknote']];
// registra uma movimentação de estoque
function registrarMov(p, tipo, qtd, motivo = '') { S.movs.unshift({ data: new Date().toISOString(), produto: p.nome, produtoId: p.id, categoria: p.categoria, tipo, qtd, motivo, usuario: S.usuario.nome, saldo: p.estoque }); }

// Aviso no canto. Com `desfazer`, mostra o botão "Desfazer" por alguns segundos.
function toast(msg, erro, desfazer) {
  const t = document.createElement('div');
  t.className = 'toast' + (erro ? ' erro' : '');
  t.setAttribute('role', erro ? 'alert' : 'status');
  t.innerHTML = ic(erro ? 'circle-alert' : 'circle-check') + `<span>${esc(msg)}</span>`;
  if (desfazer) {
    const b = document.createElement('button');
    b.className = 'toast-acao'; b.type = 'button'; b.innerHTML = ic('undo-2', 'sm') + 'Desfazer';
    b.onclick = () => { desfazer(); remover(); };
    t.appendChild(b);
  }
  $('#toasts').appendChild(t);
  let fora = false;
  const remover = () => { if (fora) return; fora = true; t.classList.add('out'); setTimeout(() => t.remove(), 300); };
  setTimeout(remover, desfazer ? 6000 : 2600);
}
let audio;
function beep(ok = true) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = ok ? 1750 : 280; o.type = ok ? 'sine' : 'square';
    o.connect(g); g.connect(audio.destination); g.gain.value = .06;
    o.start(); o.stop(audio.currentTime + (ok ? .07 : .22));
  } catch (e) {}
}
function abrirModal(html, sm) { $('#modalBox').className = 'modal-box' + (sm ? ' sm' : ''); $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden'); }
function fecharModal() { $('#modal').classList.add('hidden'); focarBipe(); }
// Fecha só se o clique começou E terminou no fundo (selecionar texto e soltar fora não fecha)
let cliqueNoFundo = false;
$('#modal').addEventListener('mousedown', e => { cliqueNoFundo = e.target.id === 'modal'; });
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && cliqueNoFundo) fecharModal(); cliqueNoFundo = false; });

// Janela de confirmação própria (substitui confirm() do navegador)
let _acoes = [];
function dialogo({ icone = 'circle-help', tom = '', titulo, texto, botoes }) {
  _acoes = botoes.map(b => b.acao || (() => {}));
  abrirModal(`<div class="modal-head"><span class="ico-chip ${tom}">${ic(icone, 'lg')}</span><div><h2>${titulo}</h2><p>${texto}</p></div></div>
  <div class="acoes">${botoes.map((b, k) => `<button class="btn ${b.estilo || ''}" onclick="fecharModal();_acoes[${k}]()">${b.icone ? ic(b.icone, 'sm') : ''}${b.label}</button>`).join('')}</div>`, true);
}

function statusEstoque(p) {
  if (p.estoque <= 0) return '<span class="pill bad">Sem estoque</span>';
  if (p.estoque <= p.minimo) return '<span class="pill warn">Baixo</span>';
  return '<span class="pill ok">Disponível</span>';
}
function mesesAte(v) { if (!v) return 99; const [a, m] = v.split('-').map(Number), d = new Date(); return (a - d.getFullYear()) * 12 + (m - 1 - d.getMonth()); }
const fmtValidade = v => v ? v.split('-').reverse().join('/') : '—';
function head(titulo, sub, acoes = '') { return `<div class="head"><div><h1>${titulo}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${acoes}</div></div>`; }
function kpi(icone, tom, rotulo, valor, foot = '') { return `<div class="card kpi"><div class="top">${rotulo}<span class="ico-chip ${tom}">${ic(icone)}</span></div><div class="val">${valor}</div>${foot ? `<div class="foot">${foot}</div>` : ''}</div>`; }
const delta = pct => `<span class="delta ${pct >= 0 ? 'up' : 'down'}">${ic(pct >= 0 ? 'trending-up' : 'trending-down', 'sm')}${Math.abs(pct).toFixed(1)}%</span>`;

// ===== Login =====
function telaLogin() {
  $('#app').classList.add('hidden');
  const L = $('#login'); L.classList.remove('hidden');
  L.innerHTML = `
  <div class="art">
    <svg class="ghost-selo"><use href="#selo"/></svg>
    <small>Sistema de gestão</small>
    <svg class="big"><use href="#selo"/></svg>
    <p>Vendas, estoque e clientes da loja <em>num só lugar</em>.</p>
  </div>
  <div class="form">
    <h1>Bem-vinda de volta</h1>
    <p class="sub">Escolha quem vai usar o sistema agora.</p>
    <div class="users">${USUARIOS.map(u => `<button onclick="entrar(${u.id})"><span class="avatar">${iniciais(u.nome)}</span><span class="tx"><b>${u.nome}</b><small>${PERFIS[u.perfil].nome}</small></span>${ic('chevron-right')}</button>`).join('')}</div>
    <div class="note">${ic('info', 'sm')}<span>Demonstração: no sistema real cada pessoa entra com e-mail e senha próprios, e vê apenas o que o perfil dela permite.</span></div>
  </div>`;
}
function entrar(id) {
  S.usuario = USUARIOS.find(u => u.id === id);
  $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
  location.hash = S.usuario.perfil === 'vendedora' ? 'caixa' : 'painel';
  render();
  toast(`Olá, ${S.usuario.nome.split(' ')[0]}!`);
}
function sair() { S.carrinho = []; S.usuario = null; history.replaceState(null, '', location.pathname); telaLogin(); }

// ===== Roteamento =====
let graficos = [];
function render() {
  if (!S.usuario) return telaLogin();
  let rota = location.hash.slice(1) || (pode('painel') ? 'painel' : 'caixa');
  if (!pode(rota)) { rota = perfil().telas[0]; history.replaceState(null, '', '#' + rota); }
  const baixos = S.produtos.filter(p => p.estoque <= p.minimo).length;
  const pend = USUARIOS.filter(u => u.status === 'pendente').length;
  const marcada = ROTA_MAE[rota] || rota;
  const grupos = []; MENU.forEach(m => m[0] === '§' ? grupos.push({ t: m[1], itens: [] }) : grupos[grupos.length - 1].itens.push(m));
  const badge = r => r === 'estoque' && baixos ? `<span class="badge" aria-label="${baixos} com estoque baixo">${baixos}</span>` : r === 'usuarios' && pend ? `<span class="badge" aria-label="${pend} aguardando aprovação">${pend}</span>` : '';
  $('#menu').innerHTML = grupos.map(g => { const it = g.itens.filter(m => pode(m[0])); return it.length ? `<div class="nav-sec">${g.t}</div>` + it.map(m => `<a href="#${m[0]}" class="${m[0] === marcada ? 'ativo' : ''}" ${m[0] === marcada ? 'aria-current="page"' : ''} data-dica="${m[2]}">${ic(m[1])}<span class="rot">${m[2]}</span>${badge(m[0])}</a>`).join('') : ''; }).join('');
  $('#perfil').innerHTML = `<span class="avatar" aria-hidden="true">${iniciais(S.usuario.nome)}</span><div class="who"><b>${S.usuario.nome}</b><small>${perfil().nome}</small></div><button title="Trocar usuário" aria-label="Sair e trocar de usuário" onclick="sair()">${ic('log-out')}</button>`;
  $('#topbar').innerHTML = `<button class="icon-btn so-mobile" id="abrirMenu" aria-label="Abrir menu" onclick="menuMobile(true)">${ic('menu')}</button>
    ${htmlBusca()}
    <div class="sp"></div>
    <span class="chip offline hidden" id="chipOffline">${ic('wifi-off', 'sm')}Sem internet</span>
    ${htmlSino()}
    <a class="chip" href="#caixas">${ic(S.caixa ? 'lock-open' : 'lock-keyhole', 'sm')}<span class="status-dot ${S.caixa ? 'ok' : 'bad'}" aria-hidden="true"></span><span class="rot-chip">Caixa ${S.caixa ? '#' + S.caixa.id + ' aberto' : 'fechado'}</span></a>`;
  atualizarOnline();
  document.title = `${ROTAS[rota][1]} · Doze Cosméticos`;
  graficos.forEach(g => g.destroy()); graficos = [];
  menuMobile(false);
  TELAS[rota]();
  window.scrollTo(0, 0);
  if (rota === 'caixa') focarBipe();
}
window.addEventListener('hashchange', render);

// ===== Leitor de código de barras =====
// O leitor funciona como um teclado: digita o código muito rápido e termina com Enter.
let bufBipe = '', ultimaTecla = 0;
document.addEventListener('keydown', e => {
  if (!S.usuario) return;
  const agora = Date.now();
  if (agora - ultimaTecla > 60) bufBipe = '';
  ultimaTecla = agora;
  if (/^\d$/.test(e.key)) bufBipe += e.key;
  const rota = location.hash.slice(1);
  const modalAberto = !$('#modal').classList.contains('hidden');
  if (e.key === 'Enter' && bufBipe.length >= 8 && !['bipe', 'bipeEst'].includes(document.activeElement.id) && !modalAberto) {
    const cod = bufBipe; bufBipe = '';
    if (rota === 'caixa') { e.preventDefault(); bipar(cod); }
    else if (rota === 'estoque') { e.preventDefault(); biparEstoque(cod); }
  }
  if (e.key === 'Escape' && modalAberto) return fecharModal();
  if (rota === 'caixa' && !modalAberto) {
    if (e.key === 'F3') { e.preventDefault(); const b = $('#bipe'); b && (b.focus(), b.select()); }
    if (e.key === 'F2') { e.preventDefault(); finalizarVenda(); }
    if (e.key === 'F4') { e.preventDefault(); const b = document.querySelector('#cliVenda')?.parentNode.querySelector('.dz-trigger'); b ? b.click() : 0; }
    if (e.key === 'Escape' && S.carrinho.length) { e.preventDefault(); cancelarVenda(); }
  }
});
function focarBipe() { setTimeout(() => { const b = $('#bipe') || $('#bipeEst'); if (b && $('#modal').classList.contains('hidden')) b.focus(); }, 30); }

// ===== CAIXA =====
function bipar(cod) {
  cod = String(cod).trim(); if (!cod) return;
  let p = S.produtos.find(x => x.ean === cod);
  if (!p && !/^\d+$/.test(cod)) {
    const achados = S.produtos.filter(x => (x.nome + ' ' + x.marca + ' ' + x.variacao).toLowerCase().includes(cod.toLowerCase()));
    if (achados.length === 1) p = achados[0];
    else if (achados.length > 1) return escolherProduto(achados, cod);
  }
  if (!p) {
    beep(false);
    if (/^\d+$/.test(cod) && pode('produtos')) return dialogo({ icone: 'scan-barcode', tom: 'warn', titulo: 'Produto não cadastrado', texto: `O código <b class="code">${esc(cod)}</b> ainda não existe no sistema. Quer cadastrar agora? A venda continua de onde parou.`, botoes: [{ label: 'Agora não', estilo: 'sec' }, { label: 'Cadastrar produto', icone: 'plus', acao: () => formProduto(null, cod) }] });
    toast('Produto não encontrado: ' + cod, true);
    return focarBipe();
  }
  const item = S.carrinho.find(i => i.id === p.id);
  if ((item ? item.qtd : 0) + 1 > p.estoque) { beep(false); toast(`Sem estoque de "${p.nome}" (disponível: ${p.estoque})`, true); return focarBipe(); }
  if (item) item.qtd++; else S.carrinho.push({ id: p.id, nome: p.nome, preco: p.preco, custo: p.custo, qtd: 1, ean: p.ean, categoria: p.categoria, marca: p.marca, variacao: p.variacao });
  beep(true); S.ultimo = p.id; S.ultimoT = Date.now();
  TELAS.caixa();
}
function escolherProduto(lista, termo) {
  abrirModal(`<div class="modal-head"><span class="ico-chip">${ic('search', 'lg')}</span><div><h2>Qual produto?</h2><p>${lista.length} resultados para “${esc(termo)}”</p></div></div>
  <div class="list">${lista.slice(0, 10).map(p => `<a href="javascript:void 0" class="list-item" onclick="fecharModal();bipar('${p.ean}')">${thumb(p.categoria, true)}<span class="tx"><b>${esc(p.nome)}</b><small>${p.marca}${p.variacao ? ' · ' + p.variacao : ''} · ${p.estoque} em estoque</small></span><b>${brl(p.preco)}</b></a>`).join('')}</div>`);
}
function totais() {
  const sub = S.carrinho.reduce((s, i) => s + i.preco * i.qtd, 0);
  const desc = Math.min(sub, S.desconto);
  return { sub, desc, total: Math.round((sub - desc) * 100) / 100, itens: S.carrinho.reduce((s, i) => s + i.qtd, 0) };
}
// Limpa o carrinho na hora; "Desfazer" traz tudo de volta
function cancelarVenda() {
  const antes = { carrinho: S.carrinho, desconto: S.desconto, cliente: S.clienteVenda };
  S.carrinho = []; S.desconto = 0; S.clienteVenda = null; TELAS.caixa();
  toast('Venda cancelada. Nada saiu do estoque.', false, () => { S.carrinho = antes.carrinho; S.desconto = antes.desconto; S.clienteVenda = antes.cliente; if (location.hash === '#caixa') TELAS.caixa(); toast('Venda recuperada'); });
}

const TELAS = {};
// ===== PAINEL: ver painel.js =====

// ===== PRODUTOS =====
let filtroP = { busca: '', cat: '', marca: '', agrupar: true }, abertas = {}, limiteP = 50;
TELAS.produtos = () => {
  $('#tela').innerHTML = `
  ${head('Produtos', `${S.produtos.length} produtos em ${CATEGORIAS.length} categorias e ${MARCAS.length} marcas`, `<button class="btn sec" onclick="importarPlanilha()">${ic('upload', 'sm')}Importar planilha</button><button class="btn" onclick="formProduto()">${ic('plus', 'sm')}Novo produto</button>`)}
  <div class="card flush">
    <div class="toolbar">
      <div class="input-ico">${ic('search', 'sm')}<input id="fBusca" placeholder="Buscar por nome, código de barras ou marca" value="${esc(filtroP.busca)}"></div>
      <select class="campo" id="fCat"><option value="">Todas as categorias</option>${CATEGORIAS.map(c => `<option ${filtroP.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <select class="campo" id="fMarca"><option value="">Todas as marcas</option>${MARCAS.map(c => `<option ${filtroP.marca === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <label class="check"><input type="checkbox" id="fAgr" ${filtroP.agrupar ? 'checked' : ''}> Agrupar variações</label>
      ${htmlDensidade()}
    </div>
    <div class="tbl-wrap" id="tblProd"></div>
  </div>`;
  desenharProdutos();
  $('#fBusca').addEventListener('input', e => { filtroP.busca = e.target.value; desenharProdutos(); });
  $('#fCat').addEventListener('change', e => { filtroP.cat = e.target.value; desenharProdutos(); });
  $('#fMarca').addEventListener('change', e => { filtroP.marca = e.target.value; desenharProdutos(); });
  $('#fAgr').addEventListener('change', e => { filtroP.agrupar = e.target.checked; desenharProdutos(); });
};
function desenharProdutos() {
  const b = filtroP.busca.toLowerCase();
  const lista = S.produtos.filter(p => (!filtroP.cat || p.categoria === filtroP.cat) && (!filtroP.marca || p.marca === filtroP.marca) && (p.nome + p.ean + p.marca + (p.sku || '')).toLowerCase().includes(b));
  const vc = perfil().verCusto;
  const linhaP = (p, filho, ultimo) => `<tr class="${filho ? 'filho' : ''}${ultimo ? ' ultimo' : ''}"><td><div class="prod">${filho ? '<span class="ramo" aria-hidden="true">' + ic('corner-down-right', 'sm') + '</span>' : thumb(p.categoria)}<span><b>${esc(filho ? (p.variacao || p.nome) : p.nome)}</b><small>${filho ? '' : p.marca + (p.variacao ? ' · ' + p.variacao : '') + ' · '}<span class="code">${p.ean}</span> · ${p.sku || ''}</small></span></div></td><td>${filho ? '' : p.categoria}</td>
    ${vc ? `<td class="num muted">${brl(p.custo)}</td>` : ''}<td class="num"><b>${brl(p.preco)}</b></td>${vc ? `<td class="num">${((1 - p.custo / p.preco) * 100).toFixed(0)}%</td>` : ''}
    <td class="num">${p.estoque}</td><td>${statusEstoque(p)}</td><td><div class="row-actions"><button class="icon-btn" title="Ajustar estoque" onclick="ajustarEstoque(${p.id})">${ic('sliders-horizontal', 'sm')}</button><button class="icon-btn" title="Nova variação desta linha" onclick="formProduto(null, '', ${p.id})">${ic('copy-plus', 'sm')}</button><button class="icon-btn" title="Editar" onclick="formProduto(${p.id})">${ic('pencil', 'sm')}</button></div></td></tr>`;
  let corpo, total;
  if (filtroP.agrupar) {
    const grupos = {}; lista.forEach(p => (grupos[p.linha || p.nome] = grupos[p.linha || p.nome] || []).push(p));
    const todos = Object.entries(grupos); total = todos.length;
    corpo = todos.slice(0, limiteP).map(([nome, ps], gi) => {
      if (ps.length === 1) return linhaP(ps[0]);
      const est = ps.reduce((s, p) => s + p.estoque, 0), pr = [...new Set(ps.map(p => p.preco))];
      const baixo = ps.some(p => p.estoque <= p.minimo);
      return `<tr class="grupo${abertas[nome] ? ' aberta' : ''}" data-g="${esc(nome)}" tabindex="0" aria-expanded="${!!abertas[nome]}"><td><div class="prod">${thumb(ps[0].categoria)}<span><b>${esc(nome)} <span class="var-badge">${ic('layers', 'sm')}${ps.length} variações</span> ${ic(abertas[nome] ? 'chevron-up' : 'chevron-down', 'sm')}</b><small>${ps[0].marca} · ${ps.map(p => esc(p.variacao)).join(', ')}</small></span></div></td><td>${ps[0].categoria}</td>
        ${vc ? `<td class="num muted">${brl(ps[0].custo)}</td>` : ''}<td class="num"><b>${pr.length === 1 ? brl(pr[0]) : 'a partir de ' + brl(Math.min(...pr))}</b></td>${vc ? '<td></td>' : ''}<td class="num"><b>${est}</b></td><td>${baixo ? '<span class="pill warn">Variação baixa</span>' : '<span class="pill ok">Disponível</span>'}</td><td></td></tr>
        ${abertas[nome] ? ps.map((p, i) => linhaP(p, true, i === ps.length - 1)).join('') : ''}`;
    }).join('');
  } else { total = lista.length; corpo = lista.slice(0, limiteP).map(p => linhaP(p)).join(''); }
  $('#tblProd').innerHTML = lista.length ? `<table><thead><tr><th>Produto</th><th>Categoria</th>${vc ? '<th class="num">Custo</th>' : ''}<th class="num">Preço</th>${vc ? '<th class="num">Margem</th>' : ''}<th class="num">Estoque</th><th>Situação</th><th><span class="sr">Ações</span></th></tr></thead><tbody>${corpo}</tbody></table>${total > limiteP ? `<div class="mais"><button class="btn sec" onclick="limiteP+=50;desenharProdutos()">Carregar mais ${Math.min(50, total - limiteP)}</button><small class="muted">Mostrando ${limiteP} de ${total}</small></div>` : ''}`
    : `<div class="empty"><div class="ring">${ic('search-x', 'xl')}</div><b>Nada encontrado</b>Nenhum produto com esse nome, código ou filtro.<div class="empty-acoes"><button class="btn sec" onclick="filtroP={busca:'',cat:'',marca:'',agrupar:filtroP.agrupar};TELAS.produtos()">${ic('x', 'sm')}Limpar filtros</button>${pode('produtos') ? `<button class="btn" onclick="formProduto(null, /^[0-9]{8,}$/.test(filtroP.busca) ? filtroP.busca : '')">${ic('plus', 'sm')}Cadastrar produto</button>` : ''}</div></div>`;
  $('#tblProd').querySelectorAll('tr.grupo').forEach(tr => { const alterna = () => { const g = tr.dataset.g; abertas[g] = !abertas[g]; desenharProdutos(); }; tr.addEventListener('click', alterna); tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alterna(); } }); });
}
function importarPlanilha() {
  dialogo({ icone: 'file-spreadsheet', tom: 'ok', titulo: 'Importar planilha', texto: 'No sistema real você envia um arquivo Excel ou CSV com código, nome, marca, categoria, custo, preço e estoque, e centenas de produtos entram de uma vez. O sistema avisa linhas com erro antes de salvar.', botoes: [{ label: 'Entendi' }] });
}
function formProduto(id, eanNovo, baseId) {
  const base = baseId && S.produtos.find(x => x.id === baseId);
  const p = id ? S.produtos.find(x => x.id === id) : base ? { ...base, ean: '', variacao: '', estoque: 0, sku: '', nome: base.linha || base.nome } : { ean: eanNovo || '', nome: '', categoria: CATEGORIAS[0], marca: '', variacao: '', custo: '', preco: '', estoque: 0, minimo: 3, validade: '', linha: '', sku: '' };
  abrirModal(`<div class="modal-head">${thumb(p.categoria)}<div><h2>${id ? 'Editar produto' : base ? 'Nova variação' : 'Novo produto'}</h2><p>${id ? esc(p.nome) : base ? 'Novo tom/cor de ' + esc(base.linha || base.nome) + '. Bipe a embalagem para o código.' : 'Bipe o produto para preencher o código'}</p></div></div>
  <form id="fp" class="form-grid" onsubmit="return false">
    <label class="field full">Código de barras<div class="input-ico">${ic('scan-barcode', 'sm')}<input name="ean" value="${p.ean}" required></div></label>
    <label class="field full">Nome do produto<span><input name="nome" value="${esc(p.nome)}" required placeholder="Ex.: Batom Matte Vermelho"></span></label>
    <label class="field">Categoria<select class="campo" name="categoria">${CATEGORIAS.map(c => `<option ${p.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label class="field">Marca<span><input name="marca" value="${esc(p.marca)}" required placeholder="Ex.: Ruby Rose"></span></label>
    <label class="field">Variação (cor, tom, tamanho)<input name="variacao" value="${esc(p.variacao)}" placeholder="Ex.: Nude, Bege 03"></label>
    <label class="field">Linha (agrupa as variações)<span><input name="linha" value="${esc(p.linha || '')}" placeholder="Ex.: Batom Matte Ruby Rose"></span></label>
    <label class="field">SKU (código interno)<input name="sku" value="${esc(p.sku || '')}" placeholder="Gerado se vazio"></label>
    <label class="field">Validade<input name="validade" type="month" value="${p.validade}"></label>
    <div class="form-sec">Preço</div>
    <label class="field">Custo (R$)<input name="custo" type="text" inputmode="numeric" data-moeda value="${moeda(p.custo)}" placeholder="R$ 0,00" required></label>
    <label class="field">Venda (R$)<input name="preco" type="text" inputmode="numeric" data-moeda value="${moeda(p.preco)}" placeholder="R$ 0,00" required></label>
    <div class="form-sec">Estoque e fiscal</div>
    <label class="field">Estoque atual<input name="estoque" type="number" value="${p.estoque}" ${id ? 'disabled title="Ajuste pela tela de Estoque"' : ''}></label>
    <label class="field">Avisar quando chegar a<input name="minimo" type="number" value="${p.minimo}"></label>
    <label class="field full">NCM / CFOP (nota fiscal)<input name="fiscal" data-mascara="ncmcfop" inputmode="numeric" value="${esc(p.fiscal || '3304.10.00 / 5102')}" placeholder="0000.00.00 / 0000"></label>
  </form>
  <div class="acoes"><button class="btn sec" onclick="fecharModal()">Cancelar</button><button class="btn" onclick="salvarProduto(${id || 0})">${ic('check', 'sm')}Salvar produto</button></div>`);
  autocompletarNome($('#fp [name=nome]'), id || 0);
  avisarEanRepetido($('#fp [name=ean]'), id || 0);
  sugerirValores($('#fp [name=marca]'), () => [...MARCAS, ...S.produtos.map(x => x.marca)], 'Marcas cadastradas');
  sugerirValores($('#fp [name=linha]'), () => S.produtos.map(x => x.linha || x.nome), 'Linhas cadastradas');
  setTimeout(() => $('#fp [name=' + (base ? 'ean' : eanNovo || id ? 'nome' : 'ean') + ']').focus(), 60);
}
function salvarProduto(id) {
  const d = Object.fromEntries(new FormData($('#fp')));
  if (!d.ean || !d.nome || !num(d.preco)) return toast('Preencha código, nome e preço', true);
  d.ean = codBarras(d.ean);
  const dup = eanEmUso(d.ean, id);
  if (dup) return toast(`Código já usado em: ${dup.nome}${dup.variacao ? ' · ' + dup.variacao : ''}`, true);
  d.custo = num(d.custo); d.preco = num(d.preco); d.minimo = +d.minimo || 0;
  // marca digitada: usa a grafia já cadastrada se existir; se for nova, entra na lista de marcas
  d.marca = d.marca.trim(); d.linha = d.linha.trim();
  const mExist = MARCAS.find(m => m.toLowerCase() === d.marca.toLowerCase());
  if (mExist) d.marca = mExist; else if (d.marca) MARCAS.push(d.marca);
  if (!d.linha) d.linha = d.nome;
  if (id) Object.assign(S.produtos.find(p => p.id === id), d);
  else { d.estoque = +d.estoque || 0; d.id = Math.max(...S.produtos.map(p => p.id)) + 1; d.sku = d.sku || 'DZ-' + String(d.id).padStart(4, '0'); S.produtos.push(d); if (d.estoque) registrarMov(d, 'Entrada', d.estoque, 'Estoque inicial'); }
  fecharModal(); toast('Produto salvo'); render();
}

// ===== ESTOQUE =====
let modoEstoque = 'entrada', contagem = {};
// Abas do estoque: os modos da tela + a página de movimentações
function segEstoque(sel) {
  const abas = [['entrada', 'package-plus', 'Entrada de mercadoria'], ['contagem', 'clipboard-check', 'Contagem'], ['alertas', 'triangle-alert', 'Alertas']];
  return `<nav class="seg" aria-label="Seções do estoque">${abas.map(([k, i, n]) => `<button type="button" class="${sel === k ? 'sel' : ''}" ${sel === k ? 'aria-current="page"' : ''} onclick="irEstoque('${k}')">${ic(i, 'sm')}${n}</button>`).join('')}${pode('movimentacoes') ? `<a href="#movimentacoes" class="${sel === 'movs' ? 'sel' : ''}" ${sel === 'movs' ? 'aria-current="page"' : ''}>${ic('arrow-left-right', 'sm')}Movimentações</a>` : ''}</nav>`;
}
function irEstoque(modo) { modoEstoque = modo; contagem = {}; if (location.hash === '#estoque') TELAS.estoque(); else location.hash = 'estoque'; }
TELAS.estoque = () => {
  const baixos = S.produtos.filter(p => p.estoque <= p.minimo);
  const vencendo = S.produtos.filter(p => mesesAte(p.validade) <= 3);
  const podeMov = S.usuario.perfil !== 'vendedora';
  if (!podeMov) modoEstoque = 'consulta';
  else if (modoEstoque === 'consulta') modoEstoque = 'entrada';
  const un = S.produtos.reduce((s, p) => s + Math.max(0, p.estoque), 0);
  $('#tela').innerHTML = `
  ${head('Estoque', podeMov ? 'Entrada, contagem e alertas, tudo pelo leitor de código de barras' : 'Consulta de estoque', '')}
  <div class="grid kpis">
    ${perfil().verCusto ? kpi('coins', '', 'Valor em estoque (custo)', brl(S.produtos.reduce((s, p) => s + p.custo * Math.max(0, p.estoque), 0))) : ''}
    ${kpi('boxes', 'terra', 'Unidades em estoque', un.toLocaleString('pt-BR'), `${S.produtos.length} produtos`)}
    ${kpi('triangle-alert', 'warn', 'Estoque baixo', baixos.length, `${baixos.filter(p => p.estoque <= 0).length} zerados`)}
    ${kpi('hourglass', 'bad', 'Validade próxima', vencendo.length, 'em até 3 meses')}
  </div>
  ${podeMov ? segEstoque(modoEstoque) : ''}
  <div id="estArea"></div>`;
  const area = $('#estArea');
  if (modoEstoque === 'entrada' || modoEstoque === 'contagem') {
    const ent = modoEstoque === 'entrada';
    area.innerHTML = `<div class="card">
      <div class="card-head"><div><h3>${ic(ent ? 'package-plus' : 'clipboard-check', 'sm')}${ent ? 'Chegou mercadoria' : 'Contagem de prateleira'}</h3><small class="muted">${ent ? 'Cada bipe soma 1 unidade. Confirme no final.' : 'Bipe tudo o que está na prateleira. O sistema mostra as diferenças.'}</small></div></div>
      <div class="scan">${ic('scan-barcode', 'lg')}<input id="bipeEst" placeholder="Bipe ou digite o código e Enter" autocomplete="off"><span class="ready"><span class="dot"></span>Leitor pronto</span></div>
      <div class="quick">${S.produtos.slice(0, 6).map(p => `<button onclick="biparEstoque('${p.ean}')">${thumb(p.categoria, true)}<span><b>${esc(p.nome)}</b><small>${p.estoque} no sistema</small></span></button>`).join('')}</div>
      <div id="listaEst" style="margin-top:18px"></div></div>`;
    $('#bipeEst').addEventListener('keydown', e => { if (e.key === 'Enter') { biparEstoque(e.target.value); e.target.value = ''; } });
    $('#bipeEst').focus();
    desenharContagem();
  } else if (modoEstoque === 'alertas') {
    area.innerHTML = `<div class="grid cols-1-1">
      <div class="card flush"><div class="card-head" style="padding-bottom:14px"><h3>${ic('triangle-alert', 'sm')}Estoque baixo ou zerado</h3>${baixos.length && pode('compras') ? `<button class="btn sec" onclick="gerarPedidoCompra()">${ic('shopping-cart', 'sm')}Gerar pedido de compra</button>` : ''}</div>
        <table><thead><tr><th>Produto</th><th class="num">Atual / mín.</th><th></th></tr></thead><tbody>${baixos.map(p => `<tr><td><div class="prod" style="min-width:0">${thumb(p.categoria, true)}<span><b>${esc(p.nome)}</b><small>${p.marca}</small></span></div></td><td class="num">${p.estoque} / ${p.minimo}</td><td>${statusEstoque(p)}</td></tr>`).join('') || `<tr><td colspan="3" class="muted">Nenhum produto com estoque baixo. Tudo abastecido.</td></tr>`}</tbody></table></div>
      <div class="card flush"><div class="card-head" style="padding-bottom:14px"><h3>${ic('hourglass', 'sm')}Validade próxima</h3></div>
        <table><thead><tr><th>Produto</th><th>Vence em</th></tr></thead><tbody>${vencendo.map(p => `<tr><td><div class="prod" style="min-width:0">${thumb(p.categoria, true)}<span><b>${esc(p.nome)}</b><small>${p.estoque} unidades</small></span></div></td><td><span class="pill ${mesesAte(p.validade) <= 1 ? 'bad' : 'warn'}">${fmtValidade(p.validade)}</span></td></tr>`).join('') || `<tr><td colspan="2" class="muted">Nenhum produto vencendo.</td></tr>`}</tbody></table></div></div>`;
  } else if (modoEstoque === 'historico') {
    area.innerHTML = `<div class="card flush tbl-wrap">${S.movs.length ? `<table><thead><tr><th>Quando</th><th>Produto</th><th>Tipo</th><th class="num">Qtd</th><th>Por</th></tr></thead><tbody>
      ${S.movs.map(m => `<tr><td class="muted">${new Date(m.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td><td><div class="prod" style="min-width:0">${thumb(m.categoria, true)}<b>${esc(m.produto)}</b></div></td><td><span class="pill plain ${m.tipo === 'Venda' ? 'rose' : m.tipo === 'Entrada' ? 'ok' : 'warn'}">${m.tipo}</span></td><td class="num"><b style="color:${m.qtd < 0 ? 'var(--bad)' : 'var(--ok)'}">${m.qtd > 0 ? '+' : ''}${m.qtd}</b></td><td>${m.usuario}</td></tr>`).join('')}</tbody></table>`
      : `<div class="empty"><div class="ring">${ic('history', 'xl')}</div><b>Sem movimentações ainda</b>Faça uma venda ou uma entrada de mercadoria e ela aparece aqui.</div>`}</div>`;
  } else {
    area.innerHTML = `<div class="card flush tbl-wrap"><table><thead><tr><th>Produto</th><th class="num">Preço</th><th class="num">Estoque</th><th>Situação</th></tr></thead><tbody>${S.produtos.map(p => `<tr><td><div class="prod">${thumb(p.categoria, true)}<span><b>${esc(p.nome)}</b><small>${p.marca}${p.variacao ? ' · ' + p.variacao : ''}</small></span></div></td><td class="num">${brl(p.preco)}</td><td class="num">${p.estoque}</td><td>${statusEstoque(p)}</td></tr>`).join('')}</tbody></table></div>`;
  }
};
function biparEstoque(cod) {
  if (!['entrada', 'contagem'].includes(modoEstoque)) return;
  const p = S.produtos.find(x => x.ean === String(cod).trim());
  if (!p) { beep(false); return toast('Código não cadastrado: ' + cod, true); }
  beep(true);
  contagem[p.id] = (contagem[p.id] || 0) + 1; S.ultimoEst = p.id;
  desenharContagem();
}
function desenharContagem() {
  const el = $('#listaEst'); if (!el) return;
  const ids = Object.keys(contagem);
  if (!ids.length) { el.innerHTML = `<div class="empty" style="padding:30px"><div class="ring">${ic('scan-barcode', 'xl')}</div><b>Nada bipado ainda</b>Os produtos aparecem aqui conforme você bipa.</div>`; return; }
  const ent = modoEstoque === 'entrada';
  el.innerHTML = `<div class="card flush"><table><thead><tr><th>Produto</th><th class="num">No sistema</th><th class="num">${ent ? 'Chegando' : 'Contado'}</th><th class="num">${ent ? 'Fica com' : 'Diferença'}</th></tr></thead><tbody>
  ${ids.map(id => { const p = S.produtos.find(x => x.id == id), c = contagem[id], dif = c - p.estoque;
    return `<tr class="${p.id === S.ultimoEst ? 'flash' : ''}"><td><div class="prod" style="min-width:0">${thumb(p.categoria, true)}<b>${esc(p.nome)}</b></div></td><td class="num">${p.estoque}</td><td class="num"><b>${ent ? '+' : ''}${c}</b></td><td class="num">${ent ? `<b>${p.estoque + c}</b>` : `<span class="pill ${dif === 0 ? 'ok' : 'bad'}">${dif === 0 ? 'Confere' : (dif > 0 ? '+' : '') + dif}</span>`}</td></tr>`; }).join('')}</tbody></table></div>
  <div class="acoes"><button class="btn sec" onclick="recomecarContagem()">${ic('rotate-ccw', 'sm')}Recomeçar</button><button class="btn" onclick="confirmarEstoque()">${ic('check', 'sm')}${ent ? 'Confirmar entrada' : 'Ajustar estoque'}</button></div>`;
}
function confirmarEstoque() {
  const ent = modoEstoque === 'entrada';
  Object.entries(contagem).forEach(([id, c]) => {
    const p = S.produtos.find(x => x.id == id), antes = p.estoque;
    p.estoque = ent ? p.estoque + c : c;
    if (p.estoque !== antes) registrarMov(p, ent ? 'Entrada' : 'Ajuste', p.estoque - antes, ent ? 'Entrada por bipe' : 'Contagem de prateleira');
  });
  contagem = {}; toast(ent ? 'Entrada registrada no estoque' : 'Estoque ajustado'); render();
}

// ===== CLIENTES =====
TELAS.clientes = () => {
  const mes = new Date().getMonth() + 1;
  const dados = S.clientes.map(c => { const vs = vendasValidas().filter(v => v.cliente === c.id); return { ...c, qtd: vs.length, total: vs.reduce((s, v) => s + v.total, 0), ultima: vs.length ? vs[vs.length - 1].data : null }; }).sort((a, b) => b.total - a.total);
  const aniver = dados.filter(c => +c.nasc.slice(5, 7) === mes);
  $('#tela').innerHTML = `
  ${head('Clientes', `${S.clientes.length} clientes cadastradas`, `<button class="btn" onclick="formCliente()">${ic('user-plus', 'sm')}Nova cliente</button>`)}
  ${aniver.length ? `<div class="card" style="margin-bottom:16px;display:flex;align-items:center;gap:14px;background:linear-gradient(90deg,#fdf1ef,#fff)"><span class="ico-chip terra">${ic('cake')}</span><div style="flex:1"><b>${aniver.length} aniversariantes este mês</b><br><small class="muted">${aniver.map(c => c.nome.split(' ')[0] + ' (' + c.nasc.slice(8) + '/' + c.nasc.slice(5, 7) + ')').join(', ')}</small></div><button class="btn sec" onclick="toast('Mensagens de aniversário preparadas (simulação)')">${ic('gift', 'sm')}Enviar parabéns</button></div>` : ''}
  <div class="card flush tbl-wrap"><table><thead><tr><th>Cliente</th><th>WhatsApp</th><th>Aniversário</th><th class="num">Compras</th><th class="num">Total gasto</th><th>Última compra</th><th></th></tr></thead><tbody>
  ${dados.map((c, i) => `<tr><td><div class="prod" style="min-width:200px"><span class="avatar">${iniciais(c.nome)}</span><span><b>${esc(c.nome)}</b><small>${c.cpf || ''}</small></span>${i === 0 && c.total ? `<span class="pill rose plain">${ic('crown', 'sm')}Top</span>` : ''}</div></td><td>${c.fone || '—'}</td>
    <td>${c.nasc.slice(8)}/${c.nasc.slice(5, 7)}</td><td class="num">${c.qtd}</td><td class="num"><b>${brl(c.total)}</b></td><td class="muted">${c.ultima ? new Date(c.ultima).toLocaleDateString('pt-BR') : '—'}</td>
    <td><div class="row-actions"><button class="icon-btn" title="Histórico" onclick="verCliente(${c.id})">${ic('history', 'sm')}</button><button class="icon-btn" title="WhatsApp" onclick="toast('Abrindo WhatsApp de ${esc(c.nome.split(' ')[0])} (simulação)')">${ic('message-circle', 'sm')}</button></div></td></tr>`).join('')}</tbody></table></div>`;
};
function verCliente(id) {
  const c = S.clientes.find(x => x.id === id), todas = vendasValidas().filter(v => v.cliente === id), vs = todas.slice(-8).reverse();
  const total = todas.reduce((s, v) => s + v.total, 0);
  abrirModal(`<div class="modal-head"><span class="avatar lg">${iniciais(c.nome)}</span><div><h2>${esc(c.nome)}</h2><p>${c.cpf || ''} · ${c.fone || ''}</p></div></div>
  <div class="grid cols-1-1" style="margin-bottom:16px">${kpi('shopping-bag', '', 'Compras', todas.length)}${kpi('receipt', 'terra', 'Ticket médio', brl(todas.length ? total / todas.length : 0))}</div>
  <div class="list">${vs.map(v => `<div class="list-item"><span class="ico-chip">${ic('receipt', 'sm')}</span><span class="tx"><b>${v.itens.map(i => esc(i.nome)).join(', ')}</b><small>${new Date(v.data).toLocaleDateString('pt-BR')} · ${v.pagamento}</small></span><b class="num">${brl(v.total)}</b></div>`).join('') || '<p class="muted">Nenhuma compra ainda.</p>'}</div>
  <div class="acoes"><button class="btn" onclick="fecharModal()">Fechar</button></div>`);
}
function formCliente() {
  abrirModal(`<div class="modal-head"><span class="ico-chip">${ic('user-plus', 'lg')}</span><div><h2>Nova cliente</h2><p>Dados para nota fiscal e relacionamento</p></div></div>
  <form id="fc" class="form-grid" onsubmit="return false"><label class="field full">Nome completo<input name="nome" required></label><label class="field">CPF<input name="cpf" placeholder="000.000.000-00"></label><label class="field">WhatsApp<input name="fone" placeholder="(19) 90000-0000"></label><label class="field">Data de nascimento<input name="nasc" type="date"></label></form>
  <div class="acoes"><button class="btn sec" onclick="fecharModal()">Cancelar</button><button class="btn" onclick="salvarCliente()">${ic('check', 'sm')}Salvar</button></div>`);
  setTimeout(() => $('#fc [name=nome]').focus(), 60);
}
function salvarCliente() {
  const d = Object.fromEntries(new FormData($('#fc')));
  if (!d.nome) return toast('Informe o nome', true);
  d.id = Math.max(...S.clientes.map(c => c.id)) + 1; d.nasc = d.nasc || '2000-01-01'; S.clientes.push(d);
  fecharModal(); toast('Cliente cadastrada'); render();
}

// ===== FINANCEIRO =====
let abaFin = 'fluxo';
TELAS.financeiro = () => {
  const hoje = hojeISO();
  const vendasHoje = vendasValidas().filter(v => v.data.slice(0, 10) === hoje);
    const aPagar = S.contas.filter(c => c.tipo === 'pagar' && !c.pago), aReceber = S.contas.filter(c => c.tipo === 'receber' && !c.pago);
  const vencidas = aPagar.filter(c => c.vencimento < hoje).length;
  $('#tela').innerHTML = `
  ${head('Financeiro', 'Caixa do dia, contas e fluxo', `<button class="btn" onclick="toast('Nova conta (simulação)')">${ic('plus', 'sm')}Nova conta</button>`)}
  <div class="grid kpis">
    ${kpi('arrow-down-left', 'ok', 'Entradas hoje', brl(vendasHoje.reduce((s, v) => s + v.total, 0)), `${vendasHoje.length} vendas`)}
    ${kpi('arrow-up-right', 'bad', 'A pagar', brl(aPagar.reduce((s, c) => s + c.valor, 0)), vencidas ? `<span class="pill bad">${vencidas} vencida${vencidas > 1 ? 's' : ''}</span>` : 'Tudo em dia')}
    ${kpi('calendar-clock', 'terra', 'A receber', brl(aReceber.reduce((s, c) => s + c.valor, 0)), `${aReceber.length} lançamentos`)}
    ${kpi('banknote', '', 'Dinheiro na gaveta', S.caixa ? brl(esperadoDinheiro(S.caixa)) : '—', S.caixa ? `Caixa #${S.caixa.id} · fundo de ${brl(S.caixa.fundo)}` : 'Caixa fechado')}
  </div>
  <div class="seg">${[['fluxo', 'chart-line', 'Fluxo de caixa'], ['contas', 'file-text', 'Contas'], ['fechamento', 'lock', 'Caixa']].map(([k, i, n]) => `<button class="${abaFin === k ? 'sel' : ''}" onclick="abaFin='${k}';TELAS.financeiro()">${ic(i, 'sm')}${n}</button>`).join('')}</div>
  <div id="finArea"></div>`;
  const a = $('#finArea');
  if (abaFin === 'fluxo') {
    a.innerHTML = `<div class="card"><div class="card-head"><h3>${ic('chart-line', 'sm')}Entradas por semana</h3><small class="muted">últimas 8 semanas</small></div><div style="height:300px"><canvas id="gFluxo"></canvas></div></div>`;
    const sem = [...Array(8)].map((_, i) => { const fim = new Date(); fim.setDate(fim.getDate() - 7 * (7 - i)); const ini = new Date(fim); ini.setDate(ini.getDate() - 7); return [ini, fim]; });
    graficos.push(new Chart($('#gFluxo'), { type: 'line', data: { labels: sem.map(s => s[1].toLocaleDateString('pt-BR').slice(0, 5)), datasets: [{ data: sem.map(([i, f]) => vendasValidas().filter(v => new Date(v.data) > i && new Date(v.data) <= f).reduce((s, v) => s + v.total, 0)), borderColor: '#7d3150', backgroundColor: 'rgba(125,49,80,.08)', fill: true, tension: .35, pointBackgroundColor: '#fff', pointBorderWidth: 2, pointRadius: 4 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => brl(c.raw) } } }, scales: { x: { grid: { display: false } }, y: { border: { display: false }, grid: { color: '#f3e8e6' }, ticks: { callback: v => 'R$ ' + v } } } } }));
  } else if (abaFin === 'contas') {
    a.innerHTML = `<div class="card flush tbl-wrap"><table><thead><tr><th>Descrição</th><th>Tipo</th><th>Vencimento</th><th class="num">Valor</th><th>Situação</th><th></th></tr></thead><tbody>
    ${[...S.contas].sort((x, y) => x.vencimento.localeCompare(y.vencimento)).map(c => `<tr><td><div class="prod" style="min-width:0"><span class="ico-chip ${c.tipo === 'pagar' ? 'bad' : 'ok'}" style="width:34px;height:34px">${ic(c.tipo === 'pagar' ? 'arrow-up-right' : 'arrow-down-left', 'sm')}</span><b>${c.descricao}</b></div></td><td>${c.tipo === 'pagar' ? 'A pagar' : 'A receber'}</td><td>${c.vencimento.split('-').reverse().join('/')}</td><td class="num"><b>${brl(c.valor)}</b></td>
      <td>${c.pago ? '<span class="pill ok">Quitado</span>' : c.vencimento < hoje ? '<span class="pill bad">Vencido</span>' : '<span class="pill warn">Em aberto</span>'}</td>
      <td><div class="row-actions">${c.pago ? '' : `<button class="btn sec" onclick="darBaixa(${c.id})">${ic('check', 'sm')}Dar baixa</button>`}</div></td></tr>`).join('')}</tbody></table></div>`;
  } else {
    a.innerHTML = `<div class="card"><div class="card-head"><h3>${ic('lock', 'sm')}${S.caixa ? 'Caixa #' + S.caixa.id + ' aberto' : 'Caixa fechado'}</h3><a class="btn sec" href="#caixas">${ic('arrow-right', 'sm')}Abrir/fechar caixa</a></div>${S.caixa ? htmlResumoCaixa(S.caixa) : '<p class="muted">Abra o caixa na tela Abrir/fechar caixa.</p>'}</div>`;
  }
};

// ===== USUÁRIOS =====
TELAS.usuarios = () => {
  const nomes = ROTAS;
  const perfis = Object.values(PERFIS);
  $('#tela').innerHTML = `
  ${head('Usuários e permissões', 'Cada pessoa vê só o que o perfil dela permite', `<button class="btn" onclick="toast('Convite enviado por e-mail (simulação)')">${ic('user-plus', 'sm')}Convidar usuário</button>`)}
  <div class="users-grid">${USUARIOS.map(u => `<div class="card user-card"><span class="avatar lg">${iniciais(u.nome)}</span><div style="flex:1"><b>${u.nome}</b><br><span class="pill rose plain" style="margin-top:6px">${ic(u.perfil === 'admin' ? 'crown' : u.perfil === 'gerente' ? 'briefcase' : 'shopping-bag', 'sm')}${PERFIS[u.perfil].nome}</span></div>${u.id === S.usuario.id ? '<span class="pill ok">Você</span>' : ''}</div>`).join('')}</div>
  <div class="card flush tbl-wrap"><div class="card-head" style="padding-bottom:14px"><h3>${ic('shield-check', 'sm')}O que cada perfil acessa</h3></div>
  <table class="matrix"><thead><tr><th>Área</th>${perfis.map(p => `<th>${p.nome}</th>`).join('')}</tr></thead><tbody>
  ${Object.entries(nomes).map(([t, [i, n]]) => `<tr><td><div class="prod" style="min-width:0">${ic(i, 'sm')}${n}</div></td>${perfis.map(p => `<td>${p.telas.includes(t) ? `<span class="yes">${ic('circle-check')}</span>` : `<span class="no">${ic('minus')}</span>`}</td>`).join('')}</tr>`).join('')}
  ${[['eye', 'Ver custo e lucro', 'verCusto'], ['ban', 'Cancelar vendas', 'cancelar'], ['pencil', 'Mudar preço no caixa', 'editarPreco']].map(([i, n, k]) => `<tr><td><div class="prod" style="min-width:0">${ic(i, 'sm')}${n}</div></td>${perfis.map(p => `<td>${p[k] ? `<span class="yes">${ic('circle-check')}</span>` : `<span class="no">${ic('minus')}</span>`}</td>`).join('')}</tr>`).join('')}</tbody></table>
  <p class="muted" style="padding:0 20px 18px;font-size:12.5px;display:flex;gap:8px;align-items:center">${ic('info', 'sm')}Para a demonstração, use o botão de sair no menu e entre com outro usuário.</p></div>`;
};

render();

// ===== Select personalizado universal =====
// Substitui visualmente todo <select> do sistema. O select original continua
// escondido por baixo (formulários e eventos "change" seguem funcionando).
let ddAberto = null;
function melhorarSelect(sel) {
  if (sel.dataset.dz) return;
  sel.dataset.dz = '1';
  const wrap = document.createElement('div');
  wrap.className = 'dz-select';
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(sel);
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'dz-trigger';
  btn.setAttribute('aria-haspopup', 'listbox');
  wrap.appendChild(btn);
  const atualizar = () => { const o = sel.options[sel.selectedIndex]; btn.innerHTML = `<span class="${sel.value === '' ? 'ph' : ''}">${esc(o ? o.text : '')}</span>${ic('chevron-down', 'sm')}`; };
  atualizar();
  sel.addEventListener('change', atualizar);
  btn.addEventListener('click', e => { e.stopPropagation(); ddAberto && ddAberto.sel === sel ? fecharDropdown() : abrirDropdown(sel, btn, atualizar); });
  btn.addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); abrirDropdown(sel, btn, atualizar); } });
}
function abrirDropdown(sel, btn, atualizar) {
  fecharDropdown();
  const opts = [...sel.options];
  const busca = opts.length > 8;
  const dd = document.createElement('div');
  dd.className = 'dz-dropdown'; dd.setAttribute('role', 'listbox');
  dd.innerHTML = `${busca ? `<div class="dz-search">${ic('search', 'sm')}<input placeholder="Filtrar..." autocomplete="off"></div>` : ''}<div class="dz-list"></div>`;
  document.body.appendChild(dd);
  const lista = dd.querySelector('.dz-list');
  let ativo = Math.max(0, sel.selectedIndex), visiveis = opts;
  const desenhar = () => {
    lista.innerHTML = visiveis.map((o, k) => `<div class="dz-opt ${o.value === sel.value ? 'sel' : ''} ${k === ativo ? 'ativo' : ''}" data-k="${k}" role="option">${esc(o.text)}${o.value === sel.value ? ic('check', 'sm') : ''}</div>`).join('') || '<div class="dz-vazio">Nada encontrado</div>';
    const a = lista.querySelector('.ativo'); if (a) a.scrollIntoView({ block: 'nearest' });
  };
  const escolher = o => { if (!o) return; sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); atualizar(); fecharDropdown(); btn.focus(); };
  visiveis = opts; ativo = Math.max(0, opts.indexOf(sel.options[sel.selectedIndex])); desenhar();
  lista.addEventListener('mousedown', e => { const el = e.target.closest('.dz-opt'); if (el) { e.preventDefault(); escolher(visiveis[+el.dataset.k]); } });
  lista.addEventListener('mousemove', e => { const el = e.target.closest('.dz-opt'); if (el && +el.dataset.k !== ativo) { ativo = +el.dataset.k; lista.querySelectorAll('.dz-opt').forEach(x => x.classList.toggle('ativo', +x.dataset.k === ativo)); } });
  const teclas = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); ativo = Math.min(visiveis.length - 1, ativo + 1); desenhar(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); ativo = Math.max(0, ativo - 1); desenhar(); }
    else if (e.key === 'Enter') { e.preventDefault(); escolher(visiveis[ativo]); }
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); fecharDropdown(); btn.focus(); }
  };
  const inp = dd.querySelector('input');
  if (inp) {
    inp.addEventListener('input', () => { const t = inp.value.toLowerCase(); visiveis = opts.filter(o => o.text.toLowerCase().includes(t)); ativo = 0; desenhar(); });
    inp.addEventListener('keydown', teclas);
  } else { dd.tabIndex = -1; dd.addEventListener('keydown', teclas); }
  // posição: abaixo do botão, ou acima se não couber
  const r = btn.getBoundingClientRect();
  dd.style.minWidth = r.width + 'px'; dd.style.left = r.left + 'px';
  const alt = Math.min(320, dd.offsetHeight);
  if (r.bottom + alt + 8 > innerHeight && r.top > alt) dd.style.top = (r.top - alt - 6) + 'px'; else dd.style.top = (r.bottom + 6) + 'px';
  if (r.left + dd.offsetWidth > innerWidth - 8) dd.style.left = Math.max(8, innerWidth - dd.offsetWidth - 8) + 'px';
  btn.closest('.dz-select').classList.add('open');
  ddAberto = { sel, dd, btn };
  (inp || dd).focus();
}
function fecharDropdown() {
  if (!ddAberto) return;
  ddAberto.dd.remove(); ddAberto.btn.closest('.dz-select').classList.remove('open'); ddAberto = null;
}
document.addEventListener('mousedown', e => { if (ddAberto && !ddAberto.dd.contains(e.target) && !ddAberto.btn.contains(e.target)) fecharDropdown(); });
window.addEventListener('resize', fecharDropdown);
document.addEventListener('scroll', e => { if (ddAberto && !ddAberto.dd.contains(e.target)) fecharDropdown(); }, true);
new MutationObserver(() => document.querySelectorAll('select:not([data-dz])').forEach(melhorarSelect)).observe(document.body, { childList: true, subtree: true });
document.querySelectorAll('select').forEach(melhorarSelect);

// Ações com "Desfazer"
function recomecarContagem() {
  const antes = { ...contagem }; contagem = {}; desenharContagem();
  toast('Lista zerada', false, () => { contagem = antes; desenharContagem(); });
}
function darBaixa(id) {
  const c = S.contas.find(x => x.id === id); c.pago = true; render();
  toast(`Baixa registrada: ${c.descricao}`, false, () => { c.pago = false; render(); });
}
