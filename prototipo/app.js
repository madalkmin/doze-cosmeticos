// ===== Estado =====
const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const $ = s => document.querySelector(s);
const hojeISO = () => new Date().toISOString().slice(0, 10);

const S = {
  produtos: PRODUTOS, clientes: CLIENTES, vendas: gerarVendas(), contas: CONTAS,
  movs: [], usuario: USUARIOS[0], carrinho: [], pagamento: 'Pix', desconto: 0, clienteVenda: null,
  caixaAberto: true, fundoCaixa: 200,
};
const perfil = () => PERFIS[S.usuario.perfil];
const pode = t => perfil().telas.includes(t);

const MENU = [
  ['painel', '📊', 'Painel'], ['caixa', '🛒', 'Caixa (PDV)'], ['produtos', '💄', 'Produtos'],
  ['estoque', '📦', 'Estoque'], ['clientes', '👩', 'Clientes'], ['financeiro', '💰', 'Financeiro'], ['usuarios', '🔐', 'Usuários'],
];

function toast(msg, erro) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast on' + (erro ? ' erro' : '');
  clearTimeout(t._h); t._h = setTimeout(() => t.className = 'toast', 2200);
}
function beep(ok = true) {
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain();
    o.frequency.value = ok ? 1800 : 300; o.connect(g); g.connect(a.destination); g.gain.value = .08;
    o.start(); o.stop(a.currentTime + (ok ? .08 : .25));
  } catch (e) {}
}
function abrirModal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden'); }
function fecharModal() { $('#modal').classList.add('hidden'); focarBipe(); }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') fecharModal(); });

function statusEstoque(p) {
  if (p.estoque <= 0) return '<span class="tag bad">Sem estoque</span>';
  if (p.estoque <= p.minimo) return '<span class="tag warn">Baixo</span>';
  return '<span class="tag ok">OK</span>';
}
function mesesAte(v) { if (!v) return 99; const [a, m] = v.split('-').map(Number), d = new Date(); return (a - d.getFullYear()) * 12 + (m - 1 - d.getMonth()); }

// ===== Roteamento =====
function render() {
  let rota = location.hash.slice(1) || (pode('painel') ? 'painel' : 'caixa');
  if (!pode(rota)) { rota = perfil().telas[0]; history.replaceState(null, '', '#' + rota); }
  $('#menu').innerHTML = MENU.filter(m => pode(m[0])).map(m => `<a href="#${m[0]}" class="${m[0] === rota ? 'ativo' : ''}">${m[1]} ${m[2]}</a>`).join('');
  destruirGraficos();
  TELAS[rota]();
  if (rota === 'caixa') focarBipe();
}
window.addEventListener('hashchange', render);

$('#usuario').innerHTML = USUARIOS.map(u => `<option value="${u.id}">${u.nome}</option>`).join('');
$('#usuario').addEventListener('change', e => {
  S.usuario = USUARIOS.find(u => u.id == e.target.value);
  $('#perfilNome').textContent = 'Perfil: ' + perfil().nome;
  toast('Entrou como ' + S.usuario.nome + ' (' + perfil().nome + ')');
  render();
});
$('#perfilNome').textContent = 'Perfil: ' + perfil().nome;

let graficos = [];
function destruirGraficos() { graficos.forEach(g => g.destroy()); graficos = []; }

// ===== Leitor de código de barras =====
// O leitor "digita" muito rápido e termina com Enter. Detectamos isso globalmente,
// assim o bipe funciona mesmo se o foco estiver em outro lugar da tela de caixa.
let bufBipe = '', ultimaTecla = 0;
document.addEventListener('keydown', e => {
  const agora = Date.now();
  if (agora - ultimaTecla > 60) bufBipe = '';
  ultimaTecla = agora;
  if (/^\d$/.test(e.key)) bufBipe += e.key;
  if (e.key === 'Enter' && bufBipe.length >= 8 && document.activeElement.id !== 'bipe') {
    const cod = bufBipe; bufBipe = '';
    const rota = location.hash.slice(1);
    if (rota === 'caixa' || rota === '') { e.preventDefault(); bipar(cod); }
    else if (rota === 'estoque' && window.biparEstoque) { e.preventDefault(); window.biparEstoque(cod); }
  }
  if (location.hash === '#caixa' && $('#modal').classList.contains('hidden')) {
    if (e.key === 'F2') { e.preventDefault(); focarBipe(); }
    if (e.key === 'F4') { e.preventDefault(); finalizarVenda(); }
    if (e.key === 'Escape') { e.preventDefault(); if (S.carrinho.length && confirm('Cancelar a venda atual?')) { S.carrinho = []; TELAS.caixa(); } }
  }
});
function focarBipe() { setTimeout(() => $('#bipe') && $('#bipe').focus(), 30); }

// ===== CAIXA =====
function bipar(cod) {
  cod = String(cod).trim(); if (!cod) return;
  let p = S.produtos.find(x => x.ean === cod);
  if (!p && !/^\d+$/.test(cod)) {
    const achados = S.produtos.filter(x => (x.nome + ' ' + x.marca).toLowerCase().includes(cod.toLowerCase()));
    if (achados.length === 1) p = achados[0];
    else if (achados.length > 1) return escolherProduto(achados);
  }
  if (!p) {
    beep(false);
    if (/^\d+$/.test(cod) && pode('produtos')) {
      if (confirm(`Código ${cod} não cadastrado.\nDeseja cadastrar agora?`)) return formProduto(null, cod);
    } else toast('Produto não encontrado: ' + cod, true);
    return focarBipe();
  }
  const noCarrinho = S.carrinho.find(i => i.id === p.id);
  const qtdAtual = noCarrinho ? noCarrinho.qtd : 0;
  if (qtdAtual + 1 > p.estoque) { beep(false); toast(`Sem estoque suficiente de "${p.nome}" (disponível: ${p.estoque})`, true); return focarBipe(); }
  if (noCarrinho) noCarrinho.qtd++; else S.carrinho.push({ id: p.id, nome: p.nome, preco: p.preco, custo: p.custo, qtd: 1, ean: p.ean });
  beep(true);
  S.ultimo = p.id;
  TELAS.caixa();
}
function escolherProduto(lista) {
  abrirModal(`<h2>Escolha o produto</h2><table>${lista.slice(0, 12).map(p => `<tr><td>${p.nome}<br><small class="sub">${p.marca} ${p.variacao}</small></td><td class="num">${brl(p.preco)}</td><td><button class="btn" onclick="fecharModal();bipar('${p.ean}')">Adicionar</button></td></tr>`).join('')}</table>`);
}
function totais() {
  const sub = S.carrinho.reduce((s, i) => s + i.preco * i.qtd, 0);
  const desc = Math.min(sub, S.desconto);
  return { sub, desc, total: sub - desc, itens: S.carrinho.reduce((s, i) => s + i.qtd, 0) };
}

const TELAS = {};
TELAS.caixa = () => {
  const t = totais();
  const sugestoes = S.produtos.filter(p => p.estoque > 0).slice(0, 8);
  $('#tela').innerHTML = `
  <div class="topo"><div><h1>Caixa</h1><p class="sub">Operador: ${S.usuario.nome} · ${new Date().toLocaleDateString('pt-BR')}</p></div>
  <span class="tag ${S.caixaAberto ? 'ok' : 'bad'}">${S.caixaAberto ? 'Caixa aberto' : 'Caixa fechado'}</span></div>
  <div class="caixa">
    <div>
      <div class="bipe"><span class="ic">▮▯▮</span>
        <input id="bipe" placeholder="Bipe o produto ou digite o nome / código e Enter" autocomplete="off">
        <span class="status-leitor">● Leitor pronto</span></div>
      <div class="card">
        ${S.carrinho.length ? `<div class="tabela-wrap"><table class="carrinho"><tr><th>Produto</th><th class="num">Unit.</th><th>Qtd</th><th class="num">Total</th><th></th></tr>
        ${S.carrinho.map((i, k) => `<tr class="${i.id === S.ultimo ? 'flash' : ''}"><td>${i.nome}<br><small class="sub">${i.ean}</small></td><td class="num">${brl(i.preco)}</td>
          <td><span class="qtd"><button onclick="mudaQtd(${k},-1)">−</button>${i.qtd}<button onclick="mudaQtd(${k},1)">+</button></span></td>
          <td class="num"><b>${brl(i.preco * i.qtd)}</b></td><td><button class="btn sec" onclick="mudaQtd(${k},-999)">✕</button></td></tr>`).join('')}
        </table></div>` : `<div class="vazio"><div style="font-size:40px">▮▯▮▯▮</div>Nenhum item. Bipe um produto para começar.</div>`}
      </div>
      <div class="card" style="margin-top:12px"><small class="sub">Sem leitor? Clique para simular um bipe:</small>
        <div class="sugestoes">${sugestoes.map(p => `<button onclick="bipar('${p.ean}')">${p.nome.split(' ').slice(0, 3).join(' ')}</button>`).join('')}
        <button onclick="bipar('7890000000000')">❓ Código desconhecido</button></div></div>
    </div>
    <div class="card total-box">
      <label class="sub">Cliente (opcional, para CPF na nota e histórico)</label>
      <select class="campo" id="cliVenda"><option value="">Consumidor final</option>${S.clientes.map(c => `<option value="${c.id}" ${S.clienteVenda == c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}</select>
      <div style="height:14px"></div>
      <div class="linha"><span>Itens</span><span>${t.itens}</span></div>
      <div class="linha"><span>Subtotal</span><span>${brl(t.sub)}</span></div>
      <div class="linha"><span>Desconto (R$)</span><input id="desc" type="number" min="0" step="0.01" value="${S.desconto || ''}" style="width:100px;text-align:right"></div>
      <div class="linha" style="border-top:1px solid var(--line);margin-top:8px;padding-top:12px"><span>Total</span><span class="grande">${brl(t.total)}</span></div>
      <div class="pagamentos">${['Pix', 'Crédito', 'Débito', 'Dinheiro'].map(p => `<button class="${S.pagamento === p ? 'sel' : ''}" onclick="S.pagamento='${p}';TELAS.caixa()">${p}</button>`).join('')}</div>
      <button class="btn grande" onclick="finalizarVenda()" ${S.carrinho.length ? '' : 'disabled'}>Finalizar venda e emitir NFC-e</button>
      <div class="atalhos"><kbd>F2</kbd> busca &nbsp; <kbd>F4</kbd> finalizar &nbsp; <kbd>Esc</kbd> cancelar</div>
    </div>
  </div>`;
  const inp = $('#bipe');
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); bipar(inp.value); } });
  $('#desc').addEventListener('change', e => { S.desconto = Math.max(0, +e.target.value || 0); TELAS.caixa(); });
  $('#cliVenda').addEventListener('change', e => S.clienteVenda = e.target.value || null);
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
  let troco = '';
  if (S.pagamento === 'Dinheiro') {
    const rec = parseFloat(String(prompt('Valor recebido em dinheiro:', t.total.toFixed(2))).replace(',', '.'));
    if (isNaN(rec)) return focarBipe();
    if (rec < t.total) { toast('Valor menor que o total', true); return focarBipe(); }
    troco = rec - t.total;
  }
  // Baixa no estoque
  S.carrinho.forEach(i => {
    const p = S.produtos.find(x => x.id === i.id); p.estoque -= i.qtd;
    S.movs.unshift({ data: new Date().toISOString(), produto: p.nome, tipo: 'Venda', qtd: -i.qtd, usuario: S.usuario.nome });
  });
  const venda = { id: S.vendas.length + 1000, data: new Date().toISOString(), itens: S.carrinho.map(i => ({ ...i })), total: t.total, desconto: t.desc, pagamento: S.pagamento, cliente: S.clienteVenda ? +S.clienteVenda : null, vendedor: S.usuario.nome, nfce: String(Date.now()).slice(-9) };
  S.vendas.push(venda);
  S.carrinho = []; S.desconto = 0; S.clienteVenda = null;
  TELAS.caixa();
  mostrarCupom(venda, troco);
}
function qrFake(seed) {
  let s = seed, h = '';
  for (let i = 0; i < 441; i++) {
    const x = i % 21, y = Math.floor(i / 21);
    const canto = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    let on;
    if (canto) { const cx = x > 13 ? x - 14 : x, cy = y > 13 ? y - 14 : y; on = cx === 0 || cx === 6 || cy === 0 || cy === 6 || (cx > 1 && cx < 5 && cy > 1 && cy < 5); }
    else { s = (s * 9301 + 49297) % 233280; on = s / 233280 > .5; }
    h += `<i style="background:${on ? '#000' : '#fff'}"></i>`;
  }
  return h;
}
function mostrarCupom(v, troco) {
  const cli = S.clientes.find(c => c.id === v.cliente);
  abrirModal(`<h2 style="margin-top:0">✅ Venda concluída</h2>
  <p class="sub">Estoque atualizado. NFC-e simulada (no sistema real é autorizada pela SEFAZ via emissor).</p>
  <div class="cupom">
    <div class="c"><b>DOZE COSMÉTICOS LTDA</b><br>CNPJ 00.000.000/0001-00<br>Itapema - SC</div><hr>
    <div class="c">DANFE NFC-e - Documento Auxiliar<br>da Nota Fiscal de Consumidor Eletrônica</div><hr>
    ${v.itens.map(i => `${i.nome.slice(0, 28)}<br>&nbsp;${i.qtd} x ${brl(i.preco)} = ${brl(i.qtd * i.preco)}<br>`).join('')}<hr>
    Qtd. itens: ${v.itens.reduce((s, i) => s + i.qtd, 0)}<br>
    ${v.desconto ? `Desconto: ${brl(v.desconto)}<br>` : ''}<b>TOTAL: ${brl(v.total)}</b><br>
    Pagamento: ${v.pagamento}${troco !== '' ? `<br>Troco: ${brl(troco)}` : ''}<hr>
    <div class="c">Consumidor: ${cli ? cli.nome + '<br>CPF ' + cli.cpf : 'não identificado'}<br>
    NFC-e nº ${v.nfce} Série 001<br>${new Date(v.data).toLocaleString('pt-BR')}<br>
    <div class="qr">${qrFake(+v.nfce)}</div>Consulte pela chave de acesso em<br>sat.sef.sc.gov.br/nfce/consulta</div>
  </div>
  <div class="acoes"><button class="btn sec" onclick="toast('Enviado por WhatsApp (simulação)')">📱 Enviar WhatsApp</button><button class="btn sec" onclick="window.print()">🖨 Imprimir</button><button class="btn" onclick="fecharModal()">Nova venda</button></div>`);
}

// ===== PAINEL =====
TELAS.painel = () => {
  const agora = new Date(), mes = agora.getMonth(), ano = agora.getFullYear();
  const doMes = (m, a) => S.vendas.filter(v => { const d = new Date(v.data); return d.getMonth() === m && d.getFullYear() === a; });
  const vm = doMes(mes, ano), pm = mes === 0 ? 11 : mes - 1;
  // compara com o mesmo período do mês anterior (dia 1 até o dia de hoje)
  const va = doMes(pm, mes === 0 ? ano - 1 : ano).filter(v => new Date(v.data).getDate() <= agora.getDate());
  const fat = vm.reduce((s, v) => s + v.total, 0), fatA = va.reduce((s, v) => s + v.total, 0);
  const custo = vm.reduce((s, v) => s + v.itens.reduce((a, i) => a + i.custo * i.qtd, 0), 0);
  const hoje = S.vendas.filter(v => v.data.slice(0, 10) === hojeISO());
  const fatHoje = hoje.reduce((s, v) => s + v.total, 0);
  const ticket = vm.length ? fat / vm.length : 0;
  const varPct = fatA ? ((fat / fatA - 1) * 100) : 0;
  // mais vendidos
  const rank = {}; vm.forEach(v => v.itens.forEach(i => { rank[i.nome] = (rank[i.nome] || 0) + i.qtd; }));
  const top = Object.entries(rank).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const baixos = S.produtos.filter(p => p.estoque <= p.minimo);
  const vendidos30 = new Set(S.vendas.filter(v => (agora - new Date(v.data)) < 30 * 864e5).flatMap(v => v.itens.map(i => i.id)));
  const parados = S.produtos.filter(p => !vendidos30.has(p.id) && p.estoque > 0);
  const aniver = S.clientes.filter(c => +c.nasc.slice(5, 7) === mes + 1);
  $('#tela').innerHTML = `
  <h1>Painel</h1><p class="sub">${agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
  <div class="grid kpis">
    <div class="card kpi"><small>Vendas hoje</small><b>${brl(fatHoje)}</b><span>${hoje.length} vendas</span></div>
    <div class="card kpi"><small>Faturamento do mês</small><b>${brl(fat)}</b><span class="${varPct >= 0 ? 'up' : 'down'}">${varPct >= 0 ? '▲' : '▼'} ${Math.abs(varPct).toFixed(1)}% vs mesmo período do mês anterior</span></div>
    <div class="card kpi"><small>Ticket médio</small><b>${brl(ticket)}</b><span>${vm.length} vendas no mês</span></div>
    ${perfil().verCusto ? `<div class="card kpi"><small>Lucro bruto do mês</small><b>${brl(fat - custo)}</b><span>Margem ${fat ? ((1 - custo / fat) * 100).toFixed(0) : 0}%</span></div>` : ''}
  </div>
  <div class="grid dois">
    <div class="card"><b>Faturamento dos últimos 30 dias</b><div style="height:260px"><canvas id="gDias"></canvas></div></div>
    <div class="card"><b>Por forma de pagamento</b><div style="height:260px"><canvas id="gPag"></canvas></div></div>
  </div>
  <div class="grid dois" style="margin-top:16px">
    <div class="card"><b>Mais vendidos do mês</b><table>${top.map(([n, q], i) => `<tr><td>${i + 1}. ${n}</td><td class="num">${q} un.</td></tr>`).join('')}</table></div>
    <div class="card"><b>Alertas</b>
      <p>⚠️ <a href="#estoque">${baixos.length} produtos com estoque baixo</a></p>
      <p>💤 ${parados.length} produtos sem venda há 30 dias</p>
      <p>⏳ ${S.produtos.filter(p => mesesAte(p.validade) <= 3).length} produtos vencendo em até 3 meses</p>
      <p>🎂 ${aniver.length} clientes fazem aniversário este mês</p>
    </div>
  </div>`;
  const dias = [...Array(30)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 29 + i); return d.toISOString().slice(0, 10); });
  const porDia = dias.map(d => S.vendas.filter(v => v.data.slice(0, 10) === d).reduce((s, v) => s + v.total, 0));
  graficos.push(new Chart($('#gDias'), { type: 'bar', data: { labels: dias.map(d => d.slice(8) + '/' + d.slice(5, 7)), datasets: [{ data: porDia, backgroundColor: '#7d3150', borderRadius: 4 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => 'R$ ' + v } } } } }));
  const pags = ['Pix', 'Crédito', 'Débito', 'Dinheiro'];
  graficos.push(new Chart($('#gPag'), { type: 'doughnut', data: { labels: pags, datasets: [{ data: pags.map(p => vm.filter(v => v.pagamento === p).reduce((s, v) => s + v.total, 0)), backgroundColor: ['#7d3150', '#c97b6b', '#e8c4c4', '#3a2630'] }] }, options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } }));
};

// ===== PRODUTOS =====
let filtroP = { busca: '', cat: '', marca: '' };
TELAS.produtos = () => {
  const lista = S.produtos.filter(p => (!filtroP.cat || p.categoria === filtroP.cat) && (!filtroP.marca || p.marca === filtroP.marca) && (p.nome + p.ean + p.marca).toLowerCase().includes(filtroP.busca.toLowerCase()));
  const vc = perfil().verCusto;
  $('#tela').innerHTML = `
  <div class="topo"><div><h1>Produtos</h1><p class="sub">${S.produtos.length} produtos cadastrados</p></div>
  <div style="display:flex;gap:8px"><button class="btn sec" onclick="toast('No sistema real: importar planilha Excel/CSV com centenas de produtos de uma vez')">⬆ Importar planilha</button><button class="btn" onclick="formProduto()">+ Novo produto</button></div></div>
  <div class="filtros">
    <input id="fBusca" placeholder="Buscar nome, código ou marca" value="${filtroP.busca}">
    <select class="campo" id="fCat"><option value="">Todas as categorias</option>${CATEGORIAS.map(c => `<option ${filtroP.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
    <select class="campo" id="fMarca"><option value="">Todas as marcas</option>${MARCAS.map(c => `<option ${filtroP.marca === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
  </div>
  <div class="card tabela-wrap"><table><tr><th>Código</th><th>Produto</th><th>Categoria</th><th>Marca</th>${vc ? '<th class="num">Custo</th>' : ''}<th class="num">Preço</th>${vc ? '<th class="num">Margem</th>' : ''}<th class="num">Estoque</th><th></th></tr>
  ${lista.map(p => `<tr><td><small>${p.ean}</small></td><td>${p.nome}${p.variacao ? `<br><small class="sub">${p.variacao}</small>` : ''}</td><td>${p.categoria}</td><td>${p.marca}</td>
    ${vc ? `<td class="num">${brl(p.custo)}</td>` : ''}<td class="num">${brl(p.preco)}</td>${vc ? `<td class="num">${((1 - p.custo / p.preco) * 100).toFixed(0)}%</td>` : ''}
    <td class="num">${p.estoque} ${statusEstoque(p)}</td><td><button class="btn sec" onclick="formProduto(${p.id})">Editar</button></td></tr>`).join('')}
  </table></div>`;
  $('#fBusca').addEventListener('input', e => { filtroP.busca = e.target.value; const pos = e.target.selectionStart; TELAS.produtos(); const n = $('#fBusca'); n.focus(); n.setSelectionRange(pos, pos); });
  $('#fCat').addEventListener('change', e => { filtroP.cat = e.target.value; TELAS.produtos(); });
  $('#fMarca').addEventListener('change', e => { filtroP.marca = e.target.value; TELAS.produtos(); });
};
function formProduto(id, eanNovo) {
  const p = id ? S.produtos.find(x => x.id === id) : { ean: eanNovo || '', nome: '', categoria: CATEGORIAS[0], marca: MARCAS[0], variacao: '', custo: '', preco: '', estoque: 0, minimo: 3, validade: '' };
  abrirModal(`<h2 style="margin-top:0">${id ? 'Editar' : 'Novo'} produto</h2>
  <form id="fp" class="form-grid">
    <label class="full">Código de barras (bipe aqui) <input name="ean" value="${p.ean}" required></label>
    <label class="full">Nome <input name="nome" value="${p.nome}" required></label>
    <label>Categoria <select class="campo" name="categoria">${CATEGORIAS.map(c => `<option ${p.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label>Marca <select class="campo" name="marca">${MARCAS.map(c => `<option ${p.marca === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label>Variação (cor/tom/tamanho) <input name="variacao" value="${p.variacao}"></label>
    <label>Validade <input name="validade" type="month" value="${p.validade}"></label>
    <label>Preço de custo <input name="custo" type="number" step="0.01" value="${p.custo}" required></label>
    <label>Preço de venda <input name="preco" type="number" step="0.01" value="${p.preco}" required></label>
    <label>Estoque atual <input name="estoque" type="number" value="${p.estoque}" ${id ? 'disabled title="Use Estoque > Entrada/Ajuste"' : ''}></label>
    <label>Estoque mínimo (alerta) <input name="minimo" type="number" value="${p.minimo}"></label>
    <label class="full">Dados fiscais (NCM / CFOP) <input placeholder="3304.10.00 / 5102" value="3304.10.00 / 5102"></label>
  </form>
  <div class="acoes"><button class="btn sec" onclick="fecharModal()">Cancelar</button><button class="btn" onclick="salvarProduto(${id || 0})">Salvar</button></div>`);
  setTimeout(() => $('#fp [name=' + (eanNovo ? 'nome' : 'ean') + ']').focus(), 50);
}
function salvarProduto(id) {
  const f = new FormData($('#fp')), d = Object.fromEntries(f);
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
  $('#tela').innerHTML = `
  <h1>Estoque</h1><p class="sub">Valor em estoque ${perfil().verCusto ? '(custo): <b>' + brl(S.produtos.reduce((s, p) => s + p.custo * Math.max(0, p.estoque), 0)) + '</b>' : ''} · ${S.produtos.reduce((s, p) => s + Math.max(0, p.estoque), 0)} unidades</p>
  ${podeMov ? `<div class="tabs">
    <button class="${modoEstoque === 'entrada' ? 'sel' : ''}" onclick="modoEstoque='entrada';TELAS.estoque()">📥 Entrada de mercadoria</button>
    <button class="${modoEstoque === 'contagem' ? 'sel' : ''}" onclick="modoEstoque='contagem';TELAS.estoque()">🔍 Contagem (inventário)</button>
    <button class="${modoEstoque === 'alertas' ? 'sel' : ''}" onclick="modoEstoque='alertas';TELAS.estoque()">⚠️ Alertas</button>
    <button class="${modoEstoque === 'historico' ? 'sel' : ''}" onclick="modoEstoque='historico';TELAS.estoque()">🕓 Movimentações</button></div>` : '<p class="bloqueado">Perfil Vendedora: apenas consulta de estoque.</p>'}
  <div id="estArea"></div>`;
  const area = $('#estArea');
  if (!podeMov) modoEstoque = 'consulta';
  if (modoEstoque === 'entrada' || modoEstoque === 'contagem') {
    const ent = modoEstoque === 'entrada';
    area.innerHTML = `<div class="card"><p>${ent ? 'Bipe cada produto que chegou: o estoque <b>soma</b> 1 a cada bipe.' : 'Bipe tudo que está na prateleira. No fim, o sistema mostra as diferenças.'}</p>
      <div class="bipe"><span class="ic">▮▯▮</span><input id="bipeEst" placeholder="Bipe ou digite o código e Enter"></div>
      <div class="sugestoes">${S.produtos.slice(0, 6).map(p => `<button onclick="biparEstoque('${p.ean}')">${p.nome.split(' ').slice(0, 3).join(' ')}</button>`).join('')}</div>
      <div id="listaEst" style="margin-top:14px"></div></div>`;
    $('#bipeEst').addEventListener('keydown', e => { if (e.key === 'Enter') { biparEstoque(e.target.value); e.target.value = ''; } });
    $('#bipeEst').focus();
    desenharContagem();
  } else if (modoEstoque === 'alertas') {
    area.innerHTML = `<div class="grid dois"><div class="card"><b>Estoque baixo / zerado</b><table>${baixos.map(p => `<tr><td>${p.nome}</td><td class="num">${p.estoque} / mín. ${p.minimo}</td><td>${statusEstoque(p)}</td></tr>`).join('')}</table>
      <button class="btn" style="margin-top:12px" onclick="toast('Lista de compras gerada (simulação)')">Gerar lista de compra</button></div>
      <div class="card"><b>Validade próxima (≤ 3 meses)</b><table>${vencendo.map(p => `<tr><td>${p.nome}</td><td><span class="tag ${mesesAte(p.validade) <= 1 ? 'bad' : 'warn'}">${p.validade}</span></td></tr>`).join('') || '<tr><td class="sub">Nenhum</td></tr>'}</table></div></div>`;
  } else if (modoEstoque === 'historico') {
    area.innerHTML = `<div class="card tabela-wrap"><table><tr><th>Data</th><th>Produto</th><th>Tipo</th><th class="num">Qtd</th><th>Usuário</th></tr>
      ${S.movs.map(m => `<tr><td>${new Date(m.data).toLocaleString('pt-BR')}</td><td>${m.produto}</td><td>${m.tipo}</td><td class="num ${m.qtd < 0 ? 'down' : 'up'}">${m.qtd > 0 ? '+' : ''}${m.qtd}</td><td>${m.usuario}</td></tr>`).join('') || '<tr><td colspan=5 class="vazio">Nenhuma movimentação nesta sessão. Faça uma venda ou entrada.</td></tr>'}</table></div>`;
  } else {
    area.innerHTML = `<div class="card tabela-wrap"><table><tr><th>Produto</th><th>Marca</th><th class="num">Preço</th><th class="num">Estoque</th></tr>${S.produtos.map(p => `<tr><td>${p.nome}</td><td>${p.marca}</td><td class="num">${brl(p.preco)}</td><td class="num">${p.estoque} ${statusEstoque(p)}</td></tr>`).join('')}</table></div>`;
  }
};
window.biparEstoque = cod => {
  const p = S.produtos.find(x => x.ean === String(cod).trim());
  if (!p) { beep(false); return toast('Código não cadastrado: ' + cod, true); }
  beep(true);
  contagem[p.id] = (contagem[p.id] || 0) + 1;
  desenharContagem();
};
function desenharContagem() {
  const el = $('#listaEst'); if (!el) return;
  const ids = Object.keys(contagem);
  if (!ids.length) { el.innerHTML = '<div class="vazio">Nada bipado ainda.</div>'; return; }
  const ent = modoEstoque === 'entrada';
  el.innerHTML = `<table><tr><th>Produto</th><th class="num">Sistema</th><th class="num">${ent ? 'Chegando' : 'Contado'}</th><th class="num">${ent ? 'Novo estoque' : 'Diferença'}</th></tr>
  ${ids.map(id => { const p = S.produtos.find(x => x.id == id), c = contagem[id], dif = c - p.estoque;
    return `<tr><td>${p.nome}</td><td class="num">${p.estoque}</td><td class="num"><b>${c}</b></td><td class="num">${ent ? p.estoque + c : `<span class="tag ${dif === 0 ? 'ok' : 'bad'}">${dif > 0 ? '+' : ''}${dif}</span>`}</td></tr>`; }).join('')}</table>
  <div class="acoes"><button class="btn sec" onclick="contagem={};desenharContagem()">Limpar</button><button class="btn" onclick="confirmarEstoque()">${ent ? 'Confirmar entrada' : 'Ajustar estoque'}</button></div>`;
}
function confirmarEstoque() {
  const ent = modoEstoque === 'entrada';
  Object.entries(contagem).forEach(([id, c]) => {
    const p = S.produtos.find(x => x.id == id), antes = p.estoque;
    p.estoque = ent ? p.estoque + c : c;
    S.movs.unshift({ data: new Date().toISOString(), produto: p.nome, tipo: ent ? 'Entrada' : 'Ajuste inventário', qtd: p.estoque - antes, usuario: S.usuario.nome });
  });
  contagem = {}; toast(ent ? 'Entrada registrada' : 'Estoque ajustado'); TELAS.estoque();
}

// ===== CLIENTES =====
TELAS.clientes = () => {
  const mes = new Date().getMonth() + 1;
  const dados = S.clientes.map(c => { const vs = S.vendas.filter(v => v.cliente === c.id); return { ...c, qtd: vs.length, total: vs.reduce((s, v) => s + v.total, 0), ultima: vs.length ? vs[vs.length - 1].data : null }; }).sort((a, b) => b.total - a.total);
  $('#tela').innerHTML = `
  <div class="topo"><div><h1>Clientes</h1><p class="sub">${S.clientes.length} clientes</p></div><button class="btn" onclick="formCliente()">+ Nova cliente</button></div>
  <div class="card tabela-wrap"><table><tr><th>Nome</th><th>Telefone</th><th>Aniversário</th><th class="num">Compras</th><th class="num">Total gasto</th><th>Última compra</th><th></th></tr>
  ${dados.map(c => `<tr><td>${c.nome}</td><td>${c.fone}</td><td>${c.nasc.slice(8)}/${c.nasc.slice(5, 7)} ${+c.nasc.slice(5, 7) === mes ? '<span class="tag rose">🎂 este mês</span>' : ''}</td>
    <td class="num">${c.qtd}</td><td class="num">${brl(c.total)}</td><td>${c.ultima ? new Date(c.ultima).toLocaleDateString('pt-BR') : '-'}</td>
    <td><button class="btn sec" onclick="verCliente(${c.id})">Histórico</button> <button class="btn sec" onclick="toast('Abrindo WhatsApp de ${c.nome.split(' ')[0]} (simulação)')">💬</button></td></tr>`).join('')}</table></div>`;
};
function verCliente(id) {
  const c = S.clientes.find(x => x.id === id), vs = S.vendas.filter(v => v.cliente === id).slice(-10).reverse();
  abrirModal(`<h2 style="margin-top:0">${c.nome}</h2><p class="sub">${c.cpf} · ${c.fone}</p>
  <table><tr><th>Data</th><th>Itens</th><th class="num">Total</th></tr>${vs.map(v => `<tr><td>${new Date(v.data).toLocaleDateString('pt-BR')}</td><td>${v.itens.map(i => i.nome).join(', ')}</td><td class="num">${brl(v.total)}</td></tr>`).join('')}</table>
  <div class="acoes"><button class="btn" onclick="fecharModal()">Fechar</button></div>`);
}
function formCliente() {
  abrirModal(`<h2 style="margin-top:0">Nova cliente</h2><form id="fc" class="form-grid">
  <label class="full">Nome <input name="nome" required></label><label>CPF <input name="cpf"></label><label>WhatsApp <input name="fone"></label><label>Nascimento <input name="nasc" type="date"></label></form>
  <div class="acoes"><button class="btn sec" onclick="fecharModal()">Cancelar</button><button class="btn" onclick="salvarCliente()">Salvar</button></div>`);
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
  $('#tela').innerHTML = `<h1>Financeiro</h1><p class="sub">Controle de caixa e contas</p>
  <div class="grid kpis">
    <div class="card kpi"><small>Entradas hoje</small><b class="up">${brl(vendasHoje.reduce((s, v) => s + v.total, 0))}</b></div>
    <div class="card kpi"><small>A pagar (aberto)</small><b class="down">${brl(aPagar.reduce((s, c) => s + c.valor, 0))}</b><span>${aPagar.filter(c => c.vencimento < hoje).length} vencidas</span></div>
    <div class="card kpi"><small>A receber</small><b>${brl(aReceber.reduce((s, c) => s + c.valor, 0))}</b></div>
    <div class="card kpi"><small>Dinheiro na gaveta</small><b>${brl(S.fundoCaixa + porPag('Dinheiro'))}</b><span>Fundo ${brl(S.fundoCaixa)} + vendas</span></div>
  </div>
  <div class="tabs">${[['fluxo', 'Fluxo de caixa'], ['contas', 'Contas a pagar/receber'], ['fechamento', 'Fechamento do caixa']].map(([k, n]) => `<button class="${abaFin === k ? 'sel' : ''}" onclick="abaFin='${k}';TELAS.financeiro()">${n}</button>`).join('')}</div>
  <div id="finArea"></div>`;
  const a = $('#finArea');
  if (abaFin === 'fluxo') {
    a.innerHTML = `<div class="card"><b>Entradas por semana (últimas 8)</b><canvas id="gFluxo" height="90"></canvas></div>`;
    const sem = [...Array(8)].map((_, i) => { const fim = new Date(); fim.setDate(fim.getDate() - 7 * (7 - i)); const ini = new Date(fim); ini.setDate(ini.getDate() - 7); return [ini, fim]; });
    graficos.push(new Chart($('#gFluxo'), { type: 'line', data: { labels: sem.map(s => s[1].toLocaleDateString('pt-BR').slice(0, 5)), datasets: [{ label: 'Entradas', data: sem.map(([i, f]) => S.vendas.filter(v => new Date(v.data) > i && new Date(v.data) <= f).reduce((s, v) => s + v.total, 0)), borderColor: '#7d3150', backgroundColor: '#f4dfe0', fill: true, tension: .3 }] }, options: { plugins: { legend: { display: false } } } }));
  } else if (abaFin === 'contas') {
    a.innerHTML = `<div class="card tabela-wrap"><table><tr><th>Tipo</th><th>Descrição</th><th>Vencimento</th><th class="num">Valor</th><th>Status</th><th></th></tr>
    ${S.contas.sort((x, y) => x.vencimento.localeCompare(y.vencimento)).map(c => `<tr><td><span class="tag ${c.tipo === 'pagar' ? 'bad' : 'ok'}">${c.tipo === 'pagar' ? 'Pagar' : 'Receber'}</span></td><td>${c.descricao}</td><td>${c.vencimento.split('-').reverse().join('/')}</td><td class="num">${brl(c.valor)}</td>
      <td>${c.pago ? '<span class="tag ok">Quitado</span>' : c.vencimento < hoje ? '<span class="tag bad">Vencido</span>' : '<span class="tag warn">Aberto</span>'}</td>
      <td>${c.pago ? '' : `<button class="btn sec" onclick="S.contas.find(x=>x.id===${c.id}).pago=true;TELAS.financeiro()">Dar baixa</button>`}</td></tr>`).join('')}</table></div>`;
  } else {
    a.innerHTML = `<div class="card" style="max-width:480px"><b>Fechamento de hoje</b><table>
      <tr><td>Fundo de troco</td><td class="num">${brl(S.fundoCaixa)}</td></tr>
      ${['Dinheiro', 'Pix', 'Crédito', 'Débito'].map(p => `<tr><td>${p}</td><td class="num">${brl(porPag(p))}</td></tr>`).join('')}
      <tr><td><b>Total vendido</b></td><td class="num"><b>${brl(vendasHoje.reduce((s, v) => s + v.total, 0))}</b></td></tr></table>
      <label class="sub" style="display:block;margin-top:12px">Dinheiro contado na gaveta</label><input id="contado" type="number" step="0.01" placeholder="0,00">
      <div id="difCaixa" style="margin:8px 0"></div>
      <button class="btn" onclick="S.caixaAberto=!S.caixaAberto;toast(S.caixaAberto?'Caixa aberto':'Caixa fechado');TELAS.financeiro()">${S.caixaAberto ? 'Fechar caixa' : 'Abrir caixa'}</button></div>`;
    $('#contado').addEventListener('input', e => { const d = (+e.target.value) - (S.fundoCaixa + porPag('Dinheiro')); $('#difCaixa').innerHTML = `Diferença: <span class="tag ${Math.abs(d) < .01 ? 'ok' : 'bad'}">${brl(d)}</span>`; });
  }
};

// ===== USUÁRIOS =====
TELAS.usuarios = () => {
  const nomes = { painel: 'Painel', caixa: 'Caixa', produtos: 'Produtos', estoque: 'Estoque', clientes: 'Clientes', financeiro: 'Financeiro', usuarios: 'Usuários' };
  $('#tela').innerHTML = `<div class="topo"><div><h1>Usuários e permissões</h1><p class="sub">Cada pessoa vê só o que o perfil permite</p></div><button class="btn" onclick="toast('Convite enviado (simulação)')">+ Novo usuário</button></div>
  <div class="card" style="margin-bottom:16px"><table><tr><th>Nome</th><th>Perfil</th></tr>${USUARIOS.map(u => `<tr><td>${u.nome}</td><td><span class="tag rose">${PERFIS[u.perfil].nome}</span></td></tr>`).join('')}</table></div>
  <div class="card tabela-wrap"><b>O que cada perfil acessa</b><table><tr><th>Área</th>${Object.values(PERFIS).map(p => `<th>${p.nome}</th>`).join('')}</tr>
  ${Object.keys(nomes).map(t => `<tr><td>${nomes[t]}</td>${Object.values(PERFIS).map(p => `<td>${p.telas.includes(t) ? '✅' : '—'}</td>`).join('')}</tr>`).join('')}
  <tr><td>Ver preço de custo e lucro</td>${Object.values(PERFIS).map(p => `<td>${p.verCusto ? '✅' : '—'}</td>`).join('')}</tr></table>
  <p class="sub" style="margin-top:12px">Dica para a demo: troque o usuário no canto inferior esquerdo e veja o menu mudar.</p></div>`;
};

render();
