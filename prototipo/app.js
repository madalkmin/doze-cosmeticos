// ===== Utilidades =====
const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
  produtos: PRODUTOS, clientes: CLIENTES, vendas: gerarVendas(), contas: CONTAS,
  movs: [], usuario: null, carrinho: [], pagamento: 'Pix', desconto: 0, recebido: '', clienteVenda: null,
  caixaAberto: true, fundoCaixa: 200,
};
const perfil = () => PERFIS[S.usuario.perfil];
const pode = t => perfil().telas.includes(t);

const MENU = [
  ['painel', 'layout-dashboard', 'Painel'], ['caixa', 'scan-barcode', 'Caixa'], ['produtos', 'package', 'Produtos'],
  ['estoque', 'boxes', 'Estoque'], ['clientes', 'users', 'Clientes'], ['financeiro', 'wallet', 'Financeiro'], ['usuarios', 'shield-check', 'Usuários'],
];
const PAGAMENTOS = [['Pix', 'qr-code'], ['Crédito', 'credit-card'], ['Débito', 'wallet-cards'], ['Dinheiro', 'banknote']];

function toast(msg, erro) {
  const t = document.createElement('div');
  t.className = 'toast' + (erro ? ' erro' : '');
  t.innerHTML = ic(erro ? 'circle-alert' : 'circle-check') + `<span>${esc(msg)}</span>`;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 2600);
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
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') fecharModal(); });

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
  location.hash = pode('painel') ? 'painel' : 'caixa';
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
  $('#menu').innerHTML = MENU.filter(m => pode(m[0])).map(m => `<a href="#${m[0]}" class="${m[0] === rota ? 'ativo' : ''}">${ic(m[1])}${m[2]}${m[0] === 'estoque' && baixos ? `<span class="badge">${baixos}</span>` : ''}</a>`).join('');
  $('#perfil').innerHTML = `<span class="avatar">${iniciais(S.usuario.nome)}</span><div class="who"><b>${S.usuario.nome}</b><small>${perfil().nome}</small></div><button title="Trocar usuário" onclick="sair()">${ic('log-out')}</button>`;
  const nome = MENU.find(m => m[0] === rota)[2];
  $('#topbar').innerHTML = `<div class="crumb">${ic('store', 'sm')} Doze Cosméticos ${ic('chevron-right', 'sm')} <b>${nome}</b></div><div class="sp"></div>
    <div class="chip">${ic('calendar', 'sm')}${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
    <div class="chip"><span class="dot"></span>Caixa ${S.caixaAberto ? 'aberto' : 'fechado'}</div>`;
  graficos.forEach(g => g.destroy()); graficos = [];
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
    if (e.key === 'F2') { e.preventDefault(); focarBipe(); }
    if (e.key === 'F4') { e.preventDefault(); finalizarVenda(); }
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
  beep(true); S.ultimo = p.id;
  TELAS.caixa();
}
function escolherProduto(lista, termo) {
  abrirModal(`<div class="modal-head"><span class="ico-chip">${ic('search', 'lg')}</span><div><h2>Qual produto?</h2><p>${lista.length} resultados para “${esc(termo)}”</p></div></div>
  <div class="list">${lista.slice(0, 10).map(p => `<a href="javascript:void 0" class="list-item" onclick="fecharModal();bipar('${p.ean}')">${thumb(p.categoria, true)}<span class="tx"><b>${esc(p.nome)}</b><small>${p.marca}${p.variacao ? ' · ' + p.variacao : ''} · ${p.estoque} em estoque</small></span><b>${brl(p.preco)}</b></a>`).join('')}</div>`);
}
function totais() {
  const sub = S.carrinho.reduce((s, i) => s + i.preco * i.qtd, 0);
  const desc = Math.min(sub, S.desconto);
  return { sub, desc, total: sub - desc, itens: S.carrinho.reduce((s, i) => s + i.qtd, 0) };
}
function cancelarVenda() {
  dialogo({ icone: 'trash-2', tom: 'bad', titulo: 'Cancelar esta venda?', texto: `Os ${totais().itens} itens serão removidos do carrinho. Nada é baixado do estoque.`, botoes: [{ label: 'Voltar', estilo: 'sec' }, { label: 'Cancelar venda', estilo: 'danger', acao: () => { S.carrinho = []; S.desconto = 0; S.recebido = ''; TELAS.caixa(); toast('Venda cancelada'); } }] });
}

const TELAS = {};
TELAS.caixa = () => {
  const t = totais();
  const rapidos = ['7891350034567', '7899045600112', '7896090611009', '7898944770029', '7891033102345', '7891350500011', '3337875597388', '7896006299985'].map(e => S.produtos.find(p => p.ean === e));
  const troco = S.pagamento === 'Dinheiro' && S.recebido !== '' ? (+S.recebido - t.total) : null;
  $('#tela').innerHTML = `
  ${head('Caixa', `Operadora: ${S.usuario.nome}`, S.carrinho.length ? `<button class="btn sec" onclick="cancelarVenda()">${ic('x', 'sm')}Cancelar venda</button>` : '')}
  <div class="caixa">
    <div>
      <div class="scan">${ic('scan-barcode', 'lg')}
        <input id="bipe" placeholder="Bipe o produto, ou digite nome ou código e Enter" autocomplete="off">
        <span class="ready"><span class="dot"></span>Leitor pronto</span></div>
      <div class="card flush">
        <div class="card-head" style="padding-bottom:14px"><h3>${ic('shopping-bag', 'sm')}Itens da venda</h3><span class="pill rose plain">${t.itens} ${t.itens === 1 ? 'item' : 'itens'}</span></div>
        ${S.carrinho.length ? `<div class="tbl-wrap"><table><thead><tr><th>Produto</th><th class="num">Unitário</th><th style="text-align:center">Qtd</th><th class="num">Total</th><th></th></tr></thead><tbody>
        ${S.carrinho.map((i, k) => `<tr class="cart-row ${i.id === S.ultimo ? 'flash' : ''}"><td><div class="prod">${thumb(i.categoria, true)}<span><b>${esc(i.nome)}</b><small>${i.marca}${i.variacao ? ' · ' + i.variacao : ''} · <span class="code">${i.ean}</span></small></span></div></td>
          <td class="num">${brl(i.preco)}</td>
          <td style="text-align:center"><span class="stepper"><button onclick="mudaQtd(${k},-1)" aria-label="Diminuir">${ic('minus', 'sm')}</button><span>${i.qtd}</span><button onclick="mudaQtd(${k},1)" aria-label="Aumentar">${ic('plus', 'sm')}</button></span></td>
          <td class="num"><b>${brl(i.preco * i.qtd)}</b></td><td><button class="icon-btn del" title="Remover" onclick="mudaQtd(${k},-999)">${ic('trash-2', 'sm')}</button></td></tr>`).join('')}
        </tbody></table></div>` : `<div class="empty"><div class="ring">${ic('scan-barcode', 'xl')}</div><b>Pronto para bipar</b>Passe o produto no leitor para começar a venda.</div>`}
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-head"><h3>${ic('zap', 'sm')}Acesso rápido</h3><small class="muted">Sem leitor? Clique para simular um bipe</small></div>
        <div class="quick">${rapidos.map(p => `<button onclick="bipar('${p.ean}')">${thumb(p.categoria, true)}<span><b>${esc(p.nome)}</b><small>${brl(p.preco)}</small></span></button>`).join('')}
          <button onclick="bipar('7890000000000')"><span class="thumb sm" style="background:var(--warn-2);color:var(--warn)">${ic('circle-help', 'sm')}</span><span><b>Código desconhecido</b><small>Testar cadastro</small></span></button></div>
      </div>
    </div>
    <div class="summary">
      <div class="card">
        <label class="field">Cliente
          <select class="campo" id="cliVenda"><option value="">Consumidor final</option>${S.clientes.map(c => `<option value="${c.id}" ${S.clienteVenda == c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
        <small class="muted" style="display:block;margin-top:6px">CPF na nota e histórico de compras</small>
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:14px">
        <div>
          <div class="sum-line"><span>Subtotal</span><span>${brl(t.sub)}</span></div>
          <div class="sum-line"><span>Desconto</span><input id="desc" type="number" min="0" step="0.01" placeholder="R$ 0,00" value="${S.desconto || ''}" style="width:120px;text-align:right;padding:7px 10px"></div>
          <div class="sum-total"><span>Total</span><b>${brl(t.total)}</b></div>
        </div>
        <div class="pay">${PAGAMENTOS.map(([p, i]) => `<button class="${S.pagamento === p ? 'sel' : ''}" onclick="S.pagamento='${p}';TELAS.caixa()">${ic(i)}${p}</button>`).join('')}</div>
        ${S.pagamento === 'Dinheiro' ? `<div class="troco"><label class="field">Valor recebido<input id="recebido" type="number" step="0.01" placeholder="0,00" value="${S.recebido}"></label><div><small class="muted">Troco</small><b id="trocoVal" style="color:${troco !== null && troco < 0 ? 'var(--bad)' : 'var(--ok)'}">${troco === null ? '—' : brl(troco)}</b></div></div>` : ''}
        <button class="btn xl" onclick="finalizarVenda()" ${S.carrinho.length ? '' : 'disabled'}>${ic('receipt')}Finalizar e emitir NFC-e</button>
        <div class="keys"><span><kbd>F2</kbd> buscar</span><span><kbd>F4</kbd> finalizar</span><span><kbd>Esc</kbd> cancelar</span></div>
      </div>
    </div>
  </div>`;
  const inp = $('#bipe');
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); bipar(inp.value); } });
  $('#desc').addEventListener('change', e => { S.desconto = Math.max(0, +e.target.value || 0); TELAS.caixa(); });
  $('#cliVenda').addEventListener('change', e => S.clienteVenda = e.target.value || null);
  const rec = $('#recebido');
  if (rec) rec.addEventListener('input', e => {
    S.recebido = e.target.value; const tr = +S.recebido - totais().total;
    $('#trocoVal').textContent = S.recebido === '' ? '—' : brl(tr); $('#trocoVal').style.color = tr < 0 ? 'var(--bad)' : 'var(--ok)';
  });
  focarBipe();
};
function mudaQtd(k, d) {
  const i = S.carrinho[k], p = S.produtos.find(x => x.id === i.id);
  if (d > 0 && i.qtd + 1 > p.estoque) return toast('Estoque insuficiente', true);
  i.qtd += d; if (i.qtd <= 0) S.carrinho.splice(k, 1);
  TELAS.caixa();
}
function finalizarVenda() {
  if (!S.carrinho.length) return;
  const t = totais();
  let troco = null;
  if (S.pagamento === 'Dinheiro') {
    if (S.recebido === '') { toast('Informe o valor recebido em dinheiro', true); return $('#recebido') && $('#recebido').focus(); }
    troco = +S.recebido - t.total;
    if (troco < 0) { toast('Valor recebido menor que o total', true); return $('#recebido').focus(); }
  }
  S.carrinho.forEach(i => {
    const p = S.produtos.find(x => x.id === i.id); p.estoque -= i.qtd;
    S.movs.unshift({ data: new Date().toISOString(), produto: p.nome, categoria: p.categoria, tipo: 'Venda', qtd: -i.qtd, usuario: S.usuario.nome });
  });
  const venda = { id: S.vendas.length + 1000, data: new Date().toISOString(), itens: S.carrinho.map(i => ({ ...i })), total: t.total, desconto: t.desc, pagamento: S.pagamento, cliente: S.clienteVenda ? +S.clienteVenda : null, vendedor: S.usuario.nome, nfce: String(Date.now()).slice(-9) };
  S.vendas.push(venda);
  S.carrinho = []; S.desconto = 0; S.clienteVenda = null; S.recebido = '';
  render();
  mostrarCupom(venda, troco);
}
function qrFake(seed) {
  let s = seed % 233280, h = '';
  for (let i = 0; i < 441; i++) {
    const x = i % 21, y = Math.floor(i / 21);
    const canto = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    let on;
    if (canto) { const cx = x > 13 ? x - 14 : x, cy = y > 13 ? y - 14 : y; on = cx === 0 || cx === 6 || cy === 0 || cy === 6 || (cx > 1 && cx < 5 && cy > 1 && cy < 5); }
    else { s = (s * 9301 + 49297) % 233280; on = s / 233280 > .5; }
    h += `<i style="background:${on ? '#222' : '#fff'}"></i>`;
  }
  return h;
}
function mostrarCupom(v, troco) {
  const cli = S.clientes.find(c => c.id === v.cliente);
  abrirModal(`<div class="modal-head"><span class="ico-chip ok">${ic('circle-check', 'lg')}</span><div><h2>Venda concluída</h2><p>${brl(v.total)} em ${v.pagamento}${troco ? ` · troco de <b>${brl(troco)}</b>` : ''}. Estoque atualizado.</p></div></div>
  <div class="cupom">
    <div class="c"><b>DOZE COSMÉTICOS LTDA</b><br>CNPJ 00.000.000/0001-00<br>Itapema · SC</div><hr>
    <div class="c">DANFE NFC-e · Documento Auxiliar da<br>Nota Fiscal de Consumidor Eletrônica</div><hr>
    ${v.itens.map(i => `<div>${esc(i.nome.slice(0, 30))}</div><div class="row"><span>${i.qtd} x ${brl(i.preco)}</span><span>${brl(i.qtd * i.preco)}</span></div>`).join('')}<hr>
    <div class="row"><span>Qtd. itens</span><span>${v.itens.reduce((s, i) => s + i.qtd, 0)}</span></div>
    ${v.desconto ? `<div class="row"><span>Desconto</span><span>-${brl(v.desconto)}</span></div>` : ''}
    <div class="row"><b>VALOR TOTAL</b><b>${brl(v.total)}</b></div>
    <div class="row"><span>${v.pagamento}</span><span>${brl(troco ? v.total + troco : v.total)}</span></div>
    ${troco ? `<div class="row"><span>Troco</span><span>${brl(troco)}</span></div>` : ''}<hr>
    <div class="c">${cli ? `CONSUMIDOR: ${esc(cli.nome).toUpperCase()}<br>CPF ${cli.cpf}` : 'CONSUMIDOR NÃO IDENTIFICADO'}<br>
    NFC-e nº ${v.nfce} · Série 001<br>${new Date(v.data).toLocaleString('pt-BR')}
    <div class="qr">${qrFake(+v.nfce)}</div>Consulte pela chave de acesso em<br>sat.sef.sc.gov.br/nfce/consulta</div>
  </div>
  <p class="muted" style="text-align:center;font-size:12px;margin:14px 0 0">${ic('info', 'sm')} Nota simulada. No sistema real ela é autorizada pela SEFAZ-SC.</p>
  <div class="acoes"><button class="btn sec" onclick="toast('Comprovante enviado por WhatsApp (simulação)')">${ic('message-circle', 'sm')}WhatsApp</button><button class="btn sec" onclick="window.print()">${ic('printer', 'sm')}Imprimir</button><button class="btn" onclick="fecharModal()">${ic('plus', 'sm')}Nova venda</button></div>`);
}

// ===== PAINEL =====
TELAS.painel = () => {
  const agora = new Date(), mes = agora.getMonth(), ano = agora.getFullYear();
  const doMes = (m, a) => S.vendas.filter(v => { const d = new Date(v.data); return d.getMonth() === m && d.getFullYear() === a; });
  const vm = doMes(mes, ano), pm = mes === 0 ? 11 : mes - 1;
  const va = doMes(pm, mes === 0 ? ano - 1 : ano).filter(v => new Date(v.data).getDate() <= agora.getDate());
  const soma = l => l.reduce((s, v) => s + v.total, 0);
  const fat = soma(vm), fatA = soma(va);
  const custo = vm.reduce((s, v) => s + v.itens.reduce((a, i) => a + i.custo * i.qtd, 0), 0);
  const hoje = S.vendas.filter(v => v.data.slice(0, 10) === hojeISO());
  const ontemD = new Date(); ontemD.setDate(ontemD.getDate() - 1);
  const ontem = S.vendas.filter(v => v.data.slice(0, 10) === ontemD.toISOString().slice(0, 10));
  const ticket = vm.length ? fat / vm.length : 0, ticketA = va.length ? fatA / va.length : 0;
  const rank = {}; vm.forEach(v => v.itens.forEach(i => { rank[i.id] = (rank[i.id] || 0) + i.qtd; }));
  const top = Object.entries(rank).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, q]) => [S.produtos.find(p => p.id == id), q]);
  const maxTop = top.length ? top[0][1] : 1;
  const baixos = S.produtos.filter(p => p.estoque <= p.minimo);
  const vendidos30 = new Set(S.vendas.filter(v => (agora - new Date(v.data)) < 30 * 864e5).flatMap(v => v.itens.map(i => i.id)));
  const parados = S.produtos.filter(p => !vendidos30.has(p.id) && p.estoque > 0);
  const vencendo = S.produtos.filter(p => mesesAte(p.validade) <= 3);
  const aniver = S.clientes.filter(c => +c.nasc.slice(5, 7) === mes + 1);
  const h = agora.getHours(), saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const pct = (a, b) => b ? (a / b - 1) * 100 : 0;
  const alerta = (href, icone, tom, titulo, sub) => `<a class="list-item" href="${href}"><span class="ico-chip ${tom}">${ic(icone)}</span><span class="tx"><b>${titulo}</b><small>${sub}</small></span>${ic('chevron-right', 'sm')}</a>`;
  $('#tela').innerHTML = `
  ${head(`${saud}, <em>${S.usuario.nome.split(' ')[0]}</em>`, 'Este é o resumo da loja hoje e no mês.', `<a class="btn" href="#caixa">${ic('scan-barcode', 'sm')}Abrir caixa</a>`)}
  <div class="grid kpis">
    ${kpi('shopping-bag', '', 'Vendas hoje', brl(soma(hoje)), `${delta(pct(soma(hoje), soma(ontem)))} ${hoje.length} vendas · vs ontem`)}
    ${kpi('trending-up', 'terra', 'Faturamento do mês', brl(fat), `${delta(pct(fat, fatA))} vs mesmo período`)}
    ${kpi('receipt', '', 'Ticket médio', brl(ticket), `${delta(pct(ticket, ticketA))} ${vm.length} vendas no mês`)}
    ${perfil().verCusto ? kpi('piggy-bank', 'ok', 'Lucro bruto do mês', brl(fat - custo), `Margem de ${fat ? ((1 - custo / fat) * 100).toFixed(0) : 0}%`) : ''}
  </div>
  <div class="grid cols-2-1">
    <div class="card"><div class="card-head"><h3>${ic('chart-column', 'sm')}Faturamento · últimos 30 dias</h3></div><div style="height:270px"><canvas id="gDias"></canvas></div></div>
    <div class="card"><div class="card-head"><h3>${ic('credit-card', 'sm')}Formas de pagamento</h3><small class="muted">mês atual</small></div><div style="height:270px"><canvas id="gPag"></canvas></div></div>
  </div>
  <div class="grid cols-2-1" style="margin-top:16px">
    <div class="card"><div class="card-head"><h3>${ic('award', 'sm')}Mais vendidos do mês</h3><a class="btn ghost" href="#produtos">Ver produtos ${ic('arrow-right', 'sm')}</a></div>
      <div class="list">${top.map(([p, q], i) => `<div class="list-item"><span class="rank ${i < 3 ? 'top' : ''}">${i + 1}</span>${thumb(p.categoria, true)}<span class="tx"><b>${esc(p.nome)}</b><div class="bar"><i style="width:${q / maxTop * 100}%"></i></div></span><b class="num">${q} un.</b></div>`).join('')}</div></div>
    <div class="card"><div class="card-head"><h3>${ic('bell', 'sm')}Precisa de atenção</h3></div>
      <div class="list">
        ${alerta('#estoque', 'triangle-alert', 'warn', `${baixos.length} produtos com estoque baixo`, 'Repor antes de acabar')}
        ${alerta('#estoque', 'hourglass', 'bad', `${vencendo.length} vencendo em até 3 meses`, 'Boa hora para promoção')}
        ${alerta('#produtos', 'snowflake', '', `${parados.length} sem venda há 30 dias`, 'Produtos parados')}
        ${alerta('#clientes', 'cake', 'terra', `${aniver.length} aniversariantes no mês`, 'Mande um cupom de presente')}
      </div></div>
  </div>`;
  Chart.defaults.font.family = 'Inter'; Chart.defaults.color = '#957f88';
  const dias = [...Array(30)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 29 + i); return d.toISOString().slice(0, 10); });
  const porDia = dias.map(d => soma(S.vendas.filter(v => v.data.slice(0, 10) === d)));
  graficos.push(new Chart($('#gDias'), { type: 'bar', data: { labels: dias.map(d => d.slice(8) + '/' + d.slice(5, 7)), datasets: [{ data: porDia, backgroundColor: dias.map((d, i) => i === 29 ? '#c97b6b' : '#7d3150'), borderRadius: 6, maxBarThickness: 18 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => brl(c.raw) } } }, scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } }, y: { border: { display: false }, grid: { color: '#f3e8e6' }, ticks: { callback: v => 'R$ ' + v } } } } }));
  graficos.push(new Chart($('#gPag'), { type: 'doughnut', data: { labels: PAGAMENTOS.map(p => p[0]), datasets: [{ data: PAGAMENTOS.map(([p]) => soma(vm.filter(v => v.pagamento === p))), backgroundColor: ['#7d3150', '#c97b6b', '#e8c4c4', '#3a2630'], borderWidth: 3, borderColor: '#fff' }] },
    options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14 } }, tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + brl(c.raw) } } } } }));
};

// ===== PRODUTOS =====
let filtroP = { busca: '', cat: '', marca: '' };
TELAS.produtos = () => {
  $('#tela').innerHTML = `
  ${head('Produtos', `${S.produtos.length} produtos em ${CATEGORIAS.length} categorias e ${MARCAS.length} marcas`, `<button class="btn sec" onclick="importarPlanilha()">${ic('upload', 'sm')}Importar planilha</button><button class="btn" onclick="formProduto()">${ic('plus', 'sm')}Novo produto</button>`)}
  <div class="card flush">
    <div class="toolbar">
      <div class="input-ico">${ic('search', 'sm')}<input id="fBusca" placeholder="Buscar por nome, código de barras ou marca" value="${esc(filtroP.busca)}"></div>
      <select class="campo" id="fCat"><option value="">Todas as categorias</option>${CATEGORIAS.map(c => `<option ${filtroP.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <select class="campo" id="fMarca"><option value="">Todas as marcas</option>${MARCAS.map(c => `<option ${filtroP.marca === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
    </div>
    <div class="tbl-wrap" id="tblProd"></div>
  </div>`;
  desenharProdutos();
  $('#fBusca').addEventListener('input', e => { filtroP.busca = e.target.value; desenharProdutos(); });
  $('#fCat').addEventListener('change', e => { filtroP.cat = e.target.value; desenharProdutos(); });
  $('#fMarca').addEventListener('change', e => { filtroP.marca = e.target.value; desenharProdutos(); });
};
function desenharProdutos() {
  const b = filtroP.busca.toLowerCase();
  const lista = S.produtos.filter(p => (!filtroP.cat || p.categoria === filtroP.cat) && (!filtroP.marca || p.marca === filtroP.marca) && (p.nome + p.ean + p.marca).toLowerCase().includes(b));
  const vc = perfil().verCusto;
  $('#tblProd').innerHTML = lista.length ? `<table><thead><tr><th>Produto</th><th>Categoria</th><th>Código</th>${vc ? '<th class="num">Custo</th>' : ''}<th class="num">Preço</th>${vc ? '<th class="num">Margem</th>' : ''}<th class="num">Estoque</th><th>Situação</th><th></th></tr></thead><tbody>
  ${lista.map(p => `<tr><td><div class="prod">${thumb(p.categoria)}<span><b>${esc(p.nome)}</b><small>${p.marca}${p.variacao ? ' · ' + p.variacao : ''}</small></span></div></td><td>${p.categoria}</td><td class="code">${p.ean}</td>
    ${vc ? `<td class="num muted">${brl(p.custo)}</td>` : ''}<td class="num"><b>${brl(p.preco)}</b></td>${vc ? `<td class="num">${((1 - p.custo / p.preco) * 100).toFixed(0)}%</td>` : ''}
    <td class="num">${p.estoque}</td><td>${statusEstoque(p)}</td><td><div class="row-actions"><button class="icon-btn" title="Editar" onclick="formProduto(${p.id})">${ic('pencil', 'sm')}</button></div></td></tr>`).join('')}
  </tbody></table>` : `<div class="empty"><div class="ring">${ic('search-x', 'xl')}</div><b>Nada encontrado</b>Tente outro nome ou limpe os filtros.</div>`;
}
function importarPlanilha() {
  dialogo({ icone: 'file-spreadsheet', tom: 'ok', titulo: 'Importar planilha', texto: 'No sistema real você envia um arquivo Excel ou CSV com código, nome, marca, categoria, custo, preço e estoque, e centenas de produtos entram de uma vez. O sistema avisa linhas com erro antes de salvar.', botoes: [{ label: 'Entendi' }] });
}
function formProduto(id, eanNovo) {
  const p = id ? S.produtos.find(x => x.id === id) : { ean: eanNovo || '', nome: '', categoria: CATEGORIAS[0], marca: MARCAS[0], variacao: '', custo: '', preco: '', estoque: 0, minimo: 3, validade: '' };
  abrirModal(`<div class="modal-head">${thumb(p.categoria)}<div><h2>${id ? 'Editar produto' : 'Novo produto'}</h2><p>${id ? esc(p.nome) : 'Bipe o produto para preencher o código'}</p></div></div>
  <form id="fp" class="form-grid" onsubmit="return false">
    <label class="field full">Código de barras<div class="input-ico">${ic('scan-barcode', 'sm')}<input name="ean" value="${p.ean}" required></div></label>
    <label class="field full">Nome do produto<input name="nome" value="${esc(p.nome)}" required placeholder="Ex.: Batom Matte Vermelho"></label>
    <label class="field">Categoria<select class="campo" name="categoria">${CATEGORIAS.map(c => `<option ${p.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label class="field">Marca<select class="campo" name="marca">${MARCAS.map(c => `<option ${p.marca === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label class="field">Variação (cor, tom, tamanho)<input name="variacao" value="${esc(p.variacao)}"></label>
    <label class="field">Validade<input name="validade" type="month" value="${p.validade}"></label>
    <div class="form-sec">Preço</div>
    <label class="field">Custo (R$)<input name="custo" type="number" step="0.01" value="${p.custo}" required></label>
    <label class="field">Venda (R$)<input name="preco" type="number" step="0.01" value="${p.preco}" required></label>
    <div class="form-sec">Estoque e fiscal</div>
    <label class="field">Estoque atual<input name="estoque" type="number" value="${p.estoque}" ${id ? 'disabled title="Ajuste pela tela de Estoque"' : ''}></label>
    <label class="field">Avisar quando chegar a<input name="minimo" type="number" value="${p.minimo}"></label>
    <label class="field full">NCM / CFOP (nota fiscal)<input value="3304.10.00 / 5102"></label>
  </form>
  <div class="acoes"><button class="btn sec" onclick="fecharModal()">Cancelar</button><button class="btn" onclick="salvarProduto(${id || 0})">${ic('check', 'sm')}Salvar produto</button></div>`);
  setTimeout(() => $('#fp [name=' + (eanNovo || id ? 'nome' : 'ean') + ']').focus(), 60);
}
function salvarProduto(id) {
  const d = Object.fromEntries(new FormData($('#fp')));
  if (!d.ean || !d.nome || !d.preco) return toast('Preencha código, nome e preço', true);
  if (S.produtos.some(p => p.ean === d.ean && p.id !== id)) return toast('Já existe produto com esse código', true);
  ['custo', 'preco', 'minimo'].forEach(k => d[k] = +d[k] || 0);
  if (id) Object.assign(S.produtos.find(p => p.id === id), d);
  else { d.estoque = +d.estoque || 0; d.id = Math.max(...S.produtos.map(p => p.id)) + 1; S.produtos.push(d); }
  fecharModal(); toast('Produto salvo'); render();
}

// ===== ESTOQUE =====
let modoEstoque = 'entrada', contagem = {};
TELAS.estoque = () => {
  const baixos = S.produtos.filter(p => p.estoque <= p.minimo);
  const vencendo = S.produtos.filter(p => mesesAte(p.validade) <= 3);
  const podeMov = S.usuario.perfil !== 'vendedora';
  if (!podeMov) modoEstoque = 'consulta';
  else if (modoEstoque === 'consulta') modoEstoque = 'entrada';
  const un = S.produtos.reduce((s, p) => s + Math.max(0, p.estoque), 0);
  const abas = [['entrada', 'package-plus', 'Entrada de mercadoria'], ['contagem', 'clipboard-check', 'Contagem'], ['alertas', 'triangle-alert', 'Alertas'], ['historico', 'history', 'Movimentações']];
  $('#tela').innerHTML = `
  ${head('Estoque', podeMov ? 'Entrada, contagem e alertas, tudo pelo leitor de código de barras' : 'Consulta de estoque')}
  <div class="grid kpis">
    ${perfil().verCusto ? kpi('coins', '', 'Valor em estoque (custo)', brl(S.produtos.reduce((s, p) => s + p.custo * Math.max(0, p.estoque), 0))) : ''}
    ${kpi('boxes', 'terra', 'Unidades em estoque', un.toLocaleString('pt-BR'), `${S.produtos.length} produtos`)}
    ${kpi('triangle-alert', 'warn', 'Estoque baixo', baixos.length, `${baixos.filter(p => p.estoque <= 0).length} zerados`)}
    ${kpi('hourglass', 'bad', 'Validade próxima', vencendo.length, 'em até 3 meses')}
  </div>
  ${podeMov ? `<div class="seg">${abas.map(([k, i, n]) => `<button class="${modoEstoque === k ? 'sel' : ''}" onclick="modoEstoque='${k}';contagem={};TELAS.estoque()">${ic(i, 'sm')}${n}</button>`).join('')}</div>` : ''}
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
      <div class="card flush"><div class="card-head" style="padding-bottom:14px"><h3>${ic('triangle-alert', 'sm')}Estoque baixo ou zerado</h3><button class="btn sec" onclick="toast('Lista de compras gerada (simulação)')">${ic('list-checks', 'sm')}Lista de compra</button></div>
        <table><thead><tr><th>Produto</th><th class="num">Atual / mín.</th><th></th></tr></thead><tbody>${baixos.map(p => `<tr><td><div class="prod" style="min-width:0">${thumb(p.categoria, true)}<span><b>${esc(p.nome)}</b><small>${p.marca}</small></span></div></td><td class="num">${p.estoque} / ${p.minimo}</td><td>${statusEstoque(p)}</td></tr>`).join('')}</tbody></table></div>
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
  <div class="acoes"><button class="btn sec" onclick="contagem={};desenharContagem()">${ic('rotate-ccw', 'sm')}Recomeçar</button><button class="btn" onclick="confirmarEstoque()">${ic('check', 'sm')}${ent ? 'Confirmar entrada' : 'Ajustar estoque'}</button></div>`;
}
function confirmarEstoque() {
  const ent = modoEstoque === 'entrada';
  Object.entries(contagem).forEach(([id, c]) => {
    const p = S.produtos.find(x => x.id == id), antes = p.estoque;
    p.estoque = ent ? p.estoque + c : c;
    if (p.estoque !== antes) S.movs.unshift({ data: new Date().toISOString(), produto: p.nome, categoria: p.categoria, tipo: ent ? 'Entrada' : 'Ajuste', qtd: p.estoque - antes, usuario: S.usuario.nome });
  });
  contagem = {}; toast(ent ? 'Entrada registrada no estoque' : 'Estoque ajustado'); render();
}

// ===== CLIENTES =====
TELAS.clientes = () => {
  const mes = new Date().getMonth() + 1;
  const dados = S.clientes.map(c => { const vs = S.vendas.filter(v => v.cliente === c.id); return { ...c, qtd: vs.length, total: vs.reduce((s, v) => s + v.total, 0), ultima: vs.length ? vs[vs.length - 1].data : null }; }).sort((a, b) => b.total - a.total);
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
  const c = S.clientes.find(x => x.id === id), todas = S.vendas.filter(v => v.cliente === id), vs = todas.slice(-8).reverse();
  const total = todas.reduce((s, v) => s + v.total, 0);
  abrirModal(`<div class="modal-head"><span class="avatar lg">${iniciais(c.nome)}</span><div><h2>${esc(c.nome)}</h2><p>${c.cpf || ''} · ${c.fone || ''}</p></div></div>
  <div class="grid cols-1-1" style="margin-bottom:16px">${kpi('shopping-bag', '', 'Compras', todas.length)}${kpi('receipt', 'terra', 'Ticket médio', brl(todas.length ? total / todas.length : 0))}</div>
  <div class="list">${vs.map(v => `<div class="list-item"><span class="ico-chip">${ic('receipt', 'sm')}</span><span class="tx"><b>${v.itens.map(i => esc(i.nome)).join(', ')}</b><small>${new Date(v.data).toLocaleDateString('pt-BR')} · ${v.pagamento}</small></span><b class="num">${brl(v.total)}</b></div>`).join('') || '<p class="muted">Nenhuma compra ainda.</p>'}</div>
  <div class="acoes"><button class="btn" onclick="fecharModal()">Fechar</button></div>`);
}
function formCliente() {
  abrirModal(`<div class="modal-head"><span class="ico-chip">${ic('user-plus', 'lg')}</span><div><h2>Nova cliente</h2><p>Dados para nota fiscal e relacionamento</p></div></div>
  <form id="fc" class="form-grid" onsubmit="return false"><label class="field full">Nome completo<input name="nome" required></label><label class="field">CPF<input name="cpf" placeholder="000.000.000-00"></label><label class="field">WhatsApp<input name="fone" placeholder="(47) 90000-0000"></label><label class="field">Data de nascimento<input name="nasc" type="date"></label></form>
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
  const vendasHoje = S.vendas.filter(v => v.data.slice(0, 10) === hoje);
  const porPag = p => vendasHoje.filter(v => v.pagamento === p).reduce((s, v) => s + v.total, 0);
  const aPagar = S.contas.filter(c => c.tipo === 'pagar' && !c.pago), aReceber = S.contas.filter(c => c.tipo === 'receber' && !c.pago);
  const vencidas = aPagar.filter(c => c.vencimento < hoje).length;
  $('#tela').innerHTML = `
  ${head('Financeiro', 'Caixa do dia, contas e fluxo', `<button class="btn" onclick="toast('Nova conta (simulação)')">${ic('plus', 'sm')}Nova conta</button>`)}
  <div class="grid kpis">
    ${kpi('arrow-down-left', 'ok', 'Entradas hoje', brl(vendasHoje.reduce((s, v) => s + v.total, 0)), `${vendasHoje.length} vendas`)}
    ${kpi('arrow-up-right', 'bad', 'A pagar', brl(aPagar.reduce((s, c) => s + c.valor, 0)), vencidas ? `<span class="pill bad">${vencidas} vencida${vencidas > 1 ? 's' : ''}</span>` : 'Tudo em dia')}
    ${kpi('calendar-clock', 'terra', 'A receber', brl(aReceber.reduce((s, c) => s + c.valor, 0)), `${aReceber.length} lançamentos`)}
    ${kpi('banknote', '', 'Dinheiro na gaveta', brl(S.fundoCaixa + porPag('Dinheiro')), `Fundo de ${brl(S.fundoCaixa)} + vendas`)}
  </div>
  <div class="seg">${[['fluxo', 'chart-line', 'Fluxo de caixa'], ['contas', 'file-text', 'Contas'], ['fechamento', 'lock', 'Fechamento do caixa']].map(([k, i, n]) => `<button class="${abaFin === k ? 'sel' : ''}" onclick="abaFin='${k}';TELAS.financeiro()">${ic(i, 'sm')}${n}</button>`).join('')}</div>
  <div id="finArea"></div>`;
  const a = $('#finArea');
  if (abaFin === 'fluxo') {
    a.innerHTML = `<div class="card"><div class="card-head"><h3>${ic('chart-line', 'sm')}Entradas por semana</h3><small class="muted">últimas 8 semanas</small></div><div style="height:300px"><canvas id="gFluxo"></canvas></div></div>`;
    const sem = [...Array(8)].map((_, i) => { const fim = new Date(); fim.setDate(fim.getDate() - 7 * (7 - i)); const ini = new Date(fim); ini.setDate(ini.getDate() - 7); return [ini, fim]; });
    graficos.push(new Chart($('#gFluxo'), { type: 'line', data: { labels: sem.map(s => s[1].toLocaleDateString('pt-BR').slice(0, 5)), datasets: [{ data: sem.map(([i, f]) => S.vendas.filter(v => new Date(v.data) > i && new Date(v.data) <= f).reduce((s, v) => s + v.total, 0)), borderColor: '#7d3150', backgroundColor: 'rgba(125,49,80,.08)', fill: true, tension: .35, pointBackgroundColor: '#fff', pointBorderWidth: 2, pointRadius: 4 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => brl(c.raw) } } }, scales: { x: { grid: { display: false } }, y: { border: { display: false }, grid: { color: '#f3e8e6' }, ticks: { callback: v => 'R$ ' + v } } } } }));
  } else if (abaFin === 'contas') {
    a.innerHTML = `<div class="card flush tbl-wrap"><table><thead><tr><th>Descrição</th><th>Tipo</th><th>Vencimento</th><th class="num">Valor</th><th>Situação</th><th></th></tr></thead><tbody>
    ${[...S.contas].sort((x, y) => x.vencimento.localeCompare(y.vencimento)).map(c => `<tr><td><div class="prod" style="min-width:0"><span class="ico-chip ${c.tipo === 'pagar' ? 'bad' : 'ok'}" style="width:34px;height:34px">${ic(c.tipo === 'pagar' ? 'arrow-up-right' : 'arrow-down-left', 'sm')}</span><b>${c.descricao}</b></div></td><td>${c.tipo === 'pagar' ? 'A pagar' : 'A receber'}</td><td>${c.vencimento.split('-').reverse().join('/')}</td><td class="num"><b>${brl(c.valor)}</b></td>
      <td>${c.pago ? '<span class="pill ok">Quitado</span>' : c.vencimento < hoje ? '<span class="pill bad">Vencido</span>' : '<span class="pill warn">Em aberto</span>'}</td>
      <td><div class="row-actions">${c.pago ? '' : `<button class="btn sec" onclick="S.contas.find(x=>x.id===${c.id}).pago=true;toast('Baixa registrada');TELAS.financeiro()">${ic('check', 'sm')}Dar baixa</button>`}</div></td></tr>`).join('')}</tbody></table></div>`;
  } else {
    const total = vendasHoje.reduce((s, v) => s + v.total, 0);
    a.innerHTML = `<div class="grid cols-1-1"><div class="card"><div class="card-head"><h3>${ic('lock', 'sm')}Fechamento de hoje</h3><span class="pill ${S.caixaAberto ? 'ok' : 'bad'}">${S.caixaAberto ? 'Aberto' : 'Fechado'}</span></div>
      <div class="list">${[['Fundo de troco', 'coins', S.fundoCaixa], ...PAGAMENTOS.map(([p, i]) => [p, i, porPag(p)])].map(([n, i, v]) => `<div class="list-item"><span class="ico-chip" style="width:34px;height:34px">${ic(i, 'sm')}</span><span class="tx"><b>${n}</b></span><b class="num">${brl(v)}</b></div>`).join('')}</div>
      <div class="sum-total"><span>Total vendido</span><b style="font-size:26px">${brl(total)}</b></div></div>
      <div class="card"><div class="card-head"><h3>${ic('hand-coins', 'sm')}Conferência da gaveta</h3></div>
      <label class="field">Dinheiro contado na gaveta<input id="contado" type="number" step="0.01" placeholder="0,00"></label>
      <p class="muted" style="font-size:12.5px">Esperado: <b>${brl(S.fundoCaixa + porPag('Dinheiro'))}</b></p>
      <div id="difCaixa" style="margin:10px 0 18px"></div>
      <button class="btn ${S.caixaAberto ? '' : 'sec'}" style="width:100%" onclick="S.caixaAberto=!S.caixaAberto;toast(S.caixaAberto?'Caixa aberto':'Caixa fechado');render()">${ic(S.caixaAberto ? 'lock' : 'lock-open', 'sm')}${S.caixaAberto ? 'Fechar caixa' : 'Abrir caixa'}</button></div></div>`;
    $('#contado').addEventListener('input', e => { const d = (+e.target.value) - (S.fundoCaixa + porPag('Dinheiro')); $('#difCaixa').innerHTML = e.target.value === '' ? '' : `<span class="pill ${Math.abs(d) < .01 ? 'ok' : 'bad'}">${Math.abs(d) < .01 ? 'Caixa confere' : (d > 0 ? 'Sobra de ' : 'Falta de ') + brl(Math.abs(d))}</span>`; });
  }
};

// ===== USUÁRIOS =====
TELAS.usuarios = () => {
  const nomes = { painel: ['layout-dashboard', 'Painel e métricas'], caixa: ['scan-barcode', 'Caixa / vendas'], produtos: ['package', 'Cadastro de produtos'], estoque: ['boxes', 'Estoque'], clientes: ['users', 'Clientes'], financeiro: ['wallet', 'Financeiro'], usuarios: ['shield-check', 'Usuários e permissões'] };
  const perfis = Object.values(PERFIS);
  $('#tela').innerHTML = `
  ${head('Usuários e permissões', 'Cada pessoa vê só o que o perfil dela permite', `<button class="btn" onclick="toast('Convite enviado por e-mail (simulação)')">${ic('user-plus', 'sm')}Convidar usuário</button>`)}
  <div class="users-grid">${USUARIOS.map(u => `<div class="card user-card"><span class="avatar lg">${iniciais(u.nome)}</span><div style="flex:1"><b>${u.nome}</b><br><span class="pill rose plain" style="margin-top:6px">${ic(u.perfil === 'admin' ? 'crown' : u.perfil === 'gerente' ? 'briefcase' : 'shopping-bag', 'sm')}${PERFIS[u.perfil].nome}</span></div>${u.id === S.usuario.id ? '<span class="pill ok">Você</span>' : ''}</div>`).join('')}</div>
  <div class="card flush tbl-wrap"><div class="card-head" style="padding-bottom:14px"><h3>${ic('shield-check', 'sm')}O que cada perfil acessa</h3></div>
  <table class="matrix"><thead><tr><th>Área</th>${perfis.map(p => `<th>${p.nome}</th>`).join('')}</tr></thead><tbody>
  ${Object.entries(nomes).map(([t, [i, n]]) => `<tr><td><div class="prod" style="min-width:0">${ic(i, 'sm')}${n}</div></td>${perfis.map(p => `<td>${p.telas.includes(t) ? `<span class="yes">${ic('circle-check')}</span>` : `<span class="no">${ic('minus')}</span>`}</td>`).join('')}</tr>`).join('')}
  <tr><td><div class="prod" style="min-width:0">${ic('eye', 'sm')}Ver custo e lucro</div></td>${perfis.map(p => `<td>${p.verCusto ? `<span class="yes">${ic('circle-check')}</span>` : `<span class="no">${ic('minus')}</span>`}</td>`).join('')}</tr></tbody></table>
  <p class="muted" style="padding:0 20px 18px;font-size:12.5px;display:flex;gap:8px;align-items:center">${ic('info', 'sm')}Para a demonstração, use o botão de sair no menu e entre com outro usuário.</p></div>`;
};

render();
