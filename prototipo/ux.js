// ===== Melhorias gerais de uso =====
// Busca geral (Ctrl+K), notificações, menu recolhível e no celular, máscaras e erros
// nos formulários, ordenação de tabelas, acessibilidade e instalação como aplicativo.

const pref = { ler(k, d) { try { return localStorage.getItem('dz.' + k) ?? d; } catch (e) { return d; } }, gravar(k, v) { try { localStorage.setItem('dz.' + k, v); } catch (e) {} } };

// ----- Menu: recolher (desktop) e gaveta (celular) -----
function alternarMenu() {
  const mini = !document.body.classList.contains('menu-mini');
  document.body.classList.toggle('menu-mini', mini); pref.gravar('menuMini', mini ? '1' : '0');
  const b = $('#recolher'); if (b) { b.setAttribute('aria-expanded', !mini); b.setAttribute('aria-label', mini ? 'Expandir menu' : 'Recolher menu'); b.title = mini ? 'Expandir menu' : 'Recolher menu'; }
}
if (pref.ler('menuMini', '0') === '1') { document.body.classList.remove('menu-mini'); alternarMenu(); }
function menuMobile(abrir) {
  document.body.classList.toggle('menu-aberto', !!abrir);
  const b = $('#abrirMenu'); if (b) b.setAttribute('aria-expanded', !!abrir);
  if (abrir) setTimeout(() => { const a = document.querySelector('#menu a.ativo') || document.querySelector('#menu a'); a && a.focus(); }, 50);
}
document.addEventListener('click', e => { if (e.target.id === 'veu') menuMobile(false); });

// ----- Densidade das tabelas -----
if (pref.ler('densidade', 'conforto') === 'compacta') document.body.classList.add('dens-compacta');
function htmlDensidade() {
  const c = document.body.classList.contains('dens-compacta');
  return `<div class="seg mini dens" role="group" aria-label="Densidade da lista"><button type="button" class="${c ? '' : 'sel'}" aria-pressed="${!c}" onclick="mudarDensidade('conforto')" title="Confortável">${ic('rows-3', 'sm')}<span class="sr">Confortável</span></button><button type="button" class="${c ? 'sel' : ''}" aria-pressed="${c}" onclick="mudarDensidade('compacta')" title="Compacta">${ic('rows-4', 'sm')}<span class="sr">Compacta</span></button></div>`;
}
function mudarDensidade(d) { document.body.classList.toggle('dens-compacta', d === 'compacta'); pref.gravar('densidade', d); document.querySelectorAll('.dens').forEach(el => el.outerHTML = htmlDensidade()); }

// ----- Notificações (sino) -----
function listaNotificacoes() {
  const n = [], hoje = hojeISO(), em7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const baixos = S.produtos.filter(p => p.estoque <= p.minimo);
  if (baixos.length && pode('estoque')) n.push({ icone: 'triangle-alert', tom: 'warn', t: `${baixos.length} produtos com estoque baixo`, s: `${baixos.filter(p => p.estoque <= 0).length} esgotados`, ir: "irEstoque(S.usuario.perfil === 'vendedora' ? 'consulta' : 'alertas')" });
  if (pode('financeiro')) {
    const venc = S.contas.filter(c => c.tipo === 'pagar' && !c.pago && c.vencimento < hoje), prox = S.contas.filter(c => c.tipo === 'pagar' && !c.pago && c.vencimento >= hoje && c.vencimento <= em7);
    if (venc.length) n.push({ icone: 'calendar-x', tom: 'bad', t: `${venc.length} conta${venc.length > 1 ? 's' : ''} vencida${venc.length > 1 ? 's' : ''}`, s: brl(venc.reduce((s, c) => s + c.valor, 0)), ir: "abaFin='contas';location.hash='financeiro'" });
    if (prox.length) n.push({ icone: 'calendar-clock', tom: '', t: `${prox.length} conta${prox.length > 1 ? 's' : ''} vencendo esta semana`, s: brl(prox.reduce((s, c) => s + c.valor, 0)), ir: "abaFin='contas';location.hash='financeiro'" });
  }
  const pend = USUARIOS.filter(u => u.status === 'pendente');
  if (pend.length && pode('usuarios')) n.push({ icone: 'user-check', tom: '', t: `${pend.length} pessoa${pend.length > 1 ? 's' : ''} esperando acesso`, s: pend.map(u => u.nome.split(' ')[0]).join(', '), ir: "location.hash='usuarios'" });
  const d = new Date(), aniv = S.clientes.filter(c => +c.nasc.slice(5, 7) === d.getMonth() + 1 && +c.nasc.slice(8) === d.getDate());
  if (aniv.length) n.push({ icone: 'cake', tom: 'terra', t: `Aniversário hoje: ${aniv.map(c => c.nome.split(' ')[0]).join(', ')}`, s: 'Mande um parabéns com cupom', ir: "location.hash='clientes'" });
  const venc3 = S.produtos.filter(p => mesesAte(p.validade) <= 1);
  if (venc3.length && pode('estoque') && S.usuario.perfil !== 'vendedora') n.push({ icone: 'hourglass', tom: 'bad', t: `${venc3.length} produto${venc3.length > 1 ? 's' : ''} vencendo este mês`, s: 'Hora de uma promoção', ir: "irEstoque('alertas')" });
  return n;
}
function htmlSino() {
  const n = listaNotificacoes().length;
  return `<div class="sino-wrap"><button class="icon-btn sino" id="sino" aria-haspopup="true" aria-expanded="false" aria-label="Notificações${n ? ': ' + n + ' novas' : ''}" title="Notificações" onclick="alternarSino(event)">${ic('bell')}${n ? `<span class="sino-n" aria-hidden="true">${n}</span>` : ''}</button></div>`;
}
function alternarSino(e) {
  e.stopPropagation();
  const aberto = $('#painelSino'); if (aberto) return fecharSino();
  const lista = listaNotificacoes(), wrap = $('#sino').parentNode;
  wrap.insertAdjacentHTML('beforeend', `<div class="sino-painel" id="painelSino" role="dialog" aria-label="Notificações"><div class="sino-topo"><b>Notificações</b><small class="muted">${lista.length ? lista.length + ' pendentes' : ''}</small></div>
    ${lista.length ? lista.map(x => `<button class="sino-it" onclick="fecharSino();${x.ir}"><span class="ico-chip ${x.tom}">${ic(x.icone, 'sm')}</span><span class="tx"><b>${x.t}</b><small>${x.s}</small></span>${ic('chevron-right', 'sm')}</button>`).join('') : `<div class="empty" style="padding:24px 10px"><div class="ring">${ic('bell-off', 'xl')}</div><b>Tudo em dia</b>Nenhuma notificação agora.</div>`}</div>`);
  $('#sino').setAttribute('aria-expanded', 'true');
  const p = $('#painelSino .sino-it'); p && p.focus();
}
function fecharSino() { const p = $('#painelSino'); if (p) { p.remove(); const s = $('#sino'); s && (s.setAttribute('aria-expanded', 'false'), s.focus()); } }
document.addEventListener('click', e => { if ($('#painelSino') && !e.target.closest('.sino-wrap')) fecharSino(); });

// ----- Internet -----
function atualizarOnline() { const c = $('#chipOffline'); if (c) c.classList.toggle('hidden', navigator.onLine); }
addEventListener('online', () => { atualizarOnline(); toast('Internet de volta'); });
addEventListener('offline', () => { atualizarOnline(); toast('Sem internet. As vendas continuam e a nota é enviada quando voltar (contingência).', true); });

// ----- Busca geral (Ctrl+K) -----
let BUSCA = null;
function acoesBusca() {
  const a = [
    ['scan-barcode', 'Nova venda', 'Abrir o caixa (PDV)', "location.hash='caixa'", 'caixa'],
    ['package-plus', 'Cadastrar produto', 'Novo produto no catálogo', "location.hash='produtos';setTimeout(()=>formProduto(),60)", 'produtos'],
    ['user-plus', 'Cadastrar cliente', 'Nova cliente', "location.hash='clientes';setTimeout(()=>formCliente(),60)", 'clientes'],
    ['shopping-cart', 'Registrar compra', 'Mercadoria chegou de fornecedor', "location.hash='compras';setTimeout(()=>novaCompra(),60)", 'compras'],
    ['clipboard-check', 'Contagem de estoque', 'Conferir a prateleira com o leitor', "irEstoque('contagem')", 'movimentacoes'],
    [S.caixa ? 'lock-keyhole' : 'lock-open', S.caixa ? 'Fechar caixa' : 'Abrir caixa', S.caixa ? 'Conferir a gaveta e fechar' : 'Informar o fundo de troco', "location.hash='caixas'", 'caixas'],
  ].filter(x => pode(x[4]));
  const telas = Object.entries(ROTAS).filter(([r]) => pode(r)).map(([r, [i, n]]) => [i, n, 'Ir para a tela', `location.hash='${r}'`]);
  return { a, telas };
}
function abrirBusca() {
  if (BUSCA) return;
  BUSCA = { sel: 0, itens: [], volta: document.activeElement };
  document.body.insertAdjacentHTML('beforeend', `<div class="cmdk" id="cmdk" role="dialog" aria-modal="true" aria-label="Busca geral"><div class="cmdk-box">
    <div class="cmdk-campo">${ic('search')}<input id="cmdkIn" placeholder="Produto, código de barras, cliente, venda (#1234) ou ação" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="cmdkLista" aria-autocomplete="list"><kbd>Esc</kbd></div>
    <div class="cmdk-lista" id="cmdkLista" role="listbox"></div>
    <div class="cmdk-rodape"><span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> fechar</span></div></div></div>`);
  const inp = $('#cmdkIn');
  inp.addEventListener('input', () => { BUSCA.sel = 0; desenharBusca(); });
  inp.addEventListener('keydown', e => {
    e.stopPropagation(); // não deixa o leitor de código de barras do caixa pegar estas teclas
    if (e.key === 'ArrowDown') { e.preventDefault(); BUSCA.sel = Math.min(BUSCA.itens.length - 1, BUSCA.sel + 1); marcarBusca(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); BUSCA.sel = Math.max(0, BUSCA.sel - 1); marcarBusca(); }
    else if (e.key === 'Enter') { e.preventDefault(); executarBusca(BUSCA.sel); }
    else if (e.key === 'Escape') { e.preventDefault(); fecharBusca(); }
  });
  $('#cmdk').addEventListener('mousedown', e => { if (e.target.id === 'cmdk') fecharBusca(); });
  desenharBusca(); inp.focus();
}
function fecharBusca() { const c = $('#cmdk'); if (c) c.remove(); const v = BUSCA && BUSCA.volta; BUSCA = null; if (v && v.focus) v.focus(); }
function desenharBusca() {
  const t = $('#cmdkIn').value.trim().toLowerCase(), norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(), tn = norm(t);
  const { a, telas } = acoesBusca(), grupos = [];
  const casa = (...c) => c.some(x => norm(x).includes(tn));
  if (!t) { grupos.push(['Ações rápidas', a.map(x => ({ i: x[0], t: x[1], s: x[2], run: x[3] }))]); }
  else {
    const prods = S.produtos.filter(p => p.ean === t || casa(p.nome, p.marca, p.variacao, p.sku, p.ean)).slice(0, 6);
    if (prods.length) grupos.push(['Produtos', prods.map(p => ({ thumb: p.categoria, t: p.nome + (p.variacao ? ' · ' + p.variacao : ''), s: `${p.marca} · ${brl(p.preco)} · ${p.estoque} em estoque`, run: location.hash === '#caixa' ? `bipar('${p.ean}')` : pode('produtos') ? `location.hash='produtos';setTimeout(()=>formProduto(${p.id}),60)` : `toast('${esc(p.nome).replace(/'/g, '')}: ${p.estoque} em estoque, ${brl(p.preco)}')`, dica: location.hash === '#caixa' ? 'Adicionar à venda' : '' }))]);
    if (pode('clientes')) { const cl = S.clientes.filter(c => casa(c.nome, c.cpf, c.fone)).slice(0, 4); if (cl.length) grupos.push(['Clientes', cl.map(c => ({ av: c.nome, t: c.nome, s: [c.cpf, c.fone].filter(Boolean).join(' · '), run: `location.hash='clientes';setTimeout(()=>verCliente(${c.id}),60)` }))]); }
    const num = t.replace(/^#/, '');
    if (pode('vendas') && /^\d{3,}$/.test(num)) { const vs = S.vendas.filter(v => String(v.id).startsWith(num) && (S.usuario.perfil !== 'vendedora' || v.vendedor === S.usuario.nome)).slice(-4).reverse(); if (vs.length) grupos.push(['Vendas', vs.map(v => ({ i: 'receipt', t: `Venda #${v.id}${v.cancelada ? ' (cancelada)' : ''}`, s: `${dataHora(v.data)} · ${brl(v.total)}`, run: `verVenda(${v.id})` }))]); }
    const ac = [...a.map(x => ({ i: x[0], t: x[1], s: x[2], run: x[3] })), ...telas.map(x => ({ i: x[0], t: x[1], s: x[2], run: x[3] }))].filter(x => casa(x.t, x.s)).slice(0, 5);
    if (ac.length) grupos.push(['Ações e telas', ac]);
  }
  BUSCA.itens = grupos.flatMap(g => g[1]);
  let k = 0;
  $('#cmdkLista').innerHTML = BUSCA.itens.length ? grupos.map(([nome, its]) => `<div class="cmdk-grupo" role="presentation">${nome}</div>${its.map(x => { const id = k++; return `<div class="cmdk-it" role="option" id="ck${id}" data-k="${id}" aria-selected="${id === BUSCA.sel}">${x.thumb ? thumb(x.thumb, true) : x.av ? `<span class="avatar sm">${iniciais(x.av)}</span>` : `<span class="ico-chip sm">${ic(x.i, 'sm')}</span>`}<span class="tx"><b>${esc(x.t)}</b><small>${esc(x.s)}</small></span>${x.dica ? `<small class="cmdk-dica">${x.dica}</small>` : ''}</div>`; }).join('')}`).join('')
    : `<div class="empty" style="padding:28px 10px"><b>Nada encontrado</b>Tente o nome, a marca ou o código de barras.</div>`;
  $('#cmdkLista').querySelectorAll('.cmdk-it').forEach(el => { el.addEventListener('mousemove', () => { if (BUSCA.sel !== +el.dataset.k) { BUSCA.sel = +el.dataset.k; marcarBusca(); } }); el.addEventListener('click', () => executarBusca(+el.dataset.k)); });
  marcarBusca();
}
function marcarBusca() {
  document.querySelectorAll('.cmdk-it').forEach(el => el.setAttribute('aria-selected', +el.dataset.k === BUSCA.sel));
  const s = $('#ck' + BUSCA.sel); if (s) { s.scrollIntoView({ block: 'nearest' }); $('#cmdkIn').setAttribute('aria-activedescendant', s.id); }
}
function executarBusca(k) { const x = BUSCA && BUSCA.itens[k]; if (!x) return; fecharBusca(); new Function(x.run)(); }
document.addEventListener('keydown', e => {
  if (!S.usuario) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); BUSCA ? fecharBusca() : abrirBusca(); }
  if (e.key === 'Escape' && $('#painelSino')) fecharSino();
  if (e.key === 'Escape' && document.body.classList.contains('menu-aberto')) menuMobile(false);
}, true);

// ----- Máscaras: CPF, CNPJ, telefone -----
const MASCARAS = {
  cpf: v => v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'),
  cnpj: v => v.replace(/\D/g, '').slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2'),
  fone: v => { const d = v.replace(/\D/g, '').slice(0, 11); return d.length <= 2 ? d.replace(/^(\d+)/, '($1') : d.length <= 6 ? d.replace(/^(\d{2})(\d+)/, '($1) $2') : d.length <= 10 ? d.replace(/^(\d{2})(\d{4})(\d+)/, '($1) $2-$3') : d.replace(/^(\d{2})(\d{5})(\d+)/, '($1) $2-$3'); },
};
const TIPO_MASCARA = { cpf: 'cpf', cnpj: 'cnpj', fone: 'fone' };
document.addEventListener('input', e => {
  const el = e.target; if (el.tagName !== 'INPUT') return;
  const m = el.dataset.mascara || TIPO_MASCARA[el.name];
  if (m && MASCARAS[m]) { const fim = el.selectionStart === el.value.length; el.value = MASCARAS[m](el.value); if (fim) el.setSelectionRange(el.value.length, el.value.length); }
  if (el.classList.contains('invalido')) limparErro(el);
});

// ----- Erros embaixo do campo -----
function erroCampo(form, nome, msg) {
  const el = typeof nome === 'string' ? form.querySelector(`[name="${nome}"]`) : nome; if (!el) return toast(msg, true);
  limparErro(el); el.classList.add('invalido'); el.setAttribute('aria-invalid', 'true');
  const id = 'err-' + (el.name || el.id || Math.random().toString(36).slice(2));
  const lbl = el.closest('.field') || el.parentNode;
  lbl.insertAdjacentHTML('beforeend', `<small class="erro-campo" id="${id}">${ic('circle-alert', 'sm')}${msg}</small>`);
  el.setAttribute('aria-describedby', id); el.focus(); beep(false);
  return false;
}
function limparErro(el) { el.classList.remove('invalido'); el.removeAttribute('aria-invalid'); const lbl = el.closest('.field') || el.parentNode; lbl.querySelectorAll('.erro-campo').forEach(x => x.remove()); }
// Regras simples de validação por formulário: [campo, teste, mensagem]
const REGRAS = {
  fp: [['ean', v => v.trim().length >= 8, 'Bipe ou digite o código de barras (8 dígitos ou mais)'], ['nome', v => v.trim(), 'Informe o nome do produto'], ['preco', v => +v > 0, 'Informe o preço de venda'],
    ['ean', (v, f) => !S.produtos.some(p => p.ean === v.trim() && p.id !== +f.dataset.id), 'Já existe um produto com esse código']],
  fc: [['nome', v => v.trim().length >= 3, 'Informe o nome completo'], ['cpf', v => !v || v.length === 14, 'CPF incompleto: são 11 números'], ['fone', v => !v || v.length >= 14, 'WhatsApp incompleto: DDD + número']],
  fcr: [['nome', v => v.trim().length >= 2, 'Informe o nome'], ['cpf', v => !v || v.length === 14, 'CPF incompleto: são 11 números'], ['fone', v => !v || v.length >= 14, 'WhatsApp incompleto: DDD + número']],
  ff: [['nome', v => v.trim(), 'Informe o nome do fornecedor'], ['cnpj', v => !v || v.length === 18, 'CNPJ incompleto: são 14 números']],
  fmv: [['valor', v => +v > 0, 'Informe um valor maior que zero']],
};
function validar(id) {
  const f = $('#' + id); if (!f || !REGRAS[id]) return true;
  for (const [nome, teste, msg] of REGRAS[id]) { const el = f.querySelector(`[name="${nome}"]`); if (el && !teste(el.value, f)) return erroCampo(f, el, msg); }
  return true;
}
// Liga a validação nas funções de salvar (sem mexer nelas)
[['salvarProduto', 'fp'], ['salvarCliente', 'fc'], ['salvarClienteRapido', 'fcr'], ['salvarFornecedor', 'ff'], ['salvarMovimento', 'fmv']].forEach(([fn, id]) => {
  const orig = window[fn]; if (!orig) return;
  window[fn] = function (...a) { if (id === 'fp') { const f = $('#fp'); if (f) f.dataset.id = a[0] || 0; } return validar(id) ? orig.apply(this, a) : undefined; };
});

// ----- Enter salva o formulário da janela -----
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.shiftKey) return;
  const el = e.target, f = el.closest && el.closest('#modalBox form');
  if (!f || el.tagName !== 'INPUT' || ['checkbox', 'radio'].includes(el.type) || f.getAttribute('onsubmit') !== 'return false') return;
  if (el.id === 'ncBusca') return;
  const prim = [...document.querySelectorAll('#modalBox .acoes .btn')].filter(b => !b.classList.contains('sec') && !b.disabled).pop();
  if (prim) { e.preventDefault(); prim.click(); }
});

// ----- Campos de dinheiro com "R$" na frente e duas casas ao sair -----
function melhorarMoeda(inp) {
  if (inp.dataset.moeda || inp.classList.contains('inp-preco') || inp.closest('.moeda')) return;
  inp.dataset.moeda = '1';
  const w = document.createElement('span'); w.className = 'moeda';
  if (inp.style.width) { w.style.width = inp.style.width; inp.style.width = '100%'; }
  inp.parentNode.insertBefore(w, inp); w.appendChild(inp); w.insertAdjacentHTML('afterbegin', '<span class="moeda-rs" aria-hidden="true">R$</span>');
  if (inp.placeholder === 'R$ 0,00') inp.placeholder = '0,00';
  inp.addEventListener('blur', () => { if (inp.value !== '' && !isNaN(+inp.value)) inp.value = (+inp.value).toFixed(2); });
}

// ----- Tabelas: ordenar pelo título e rótulos para o celular -----
const ORDEM = {};
const valorCelula = td => {
  const t = (td ? td.innerText : '').trim();
  let m = t.match(/^(\d{2})\/(\d{2})\/(\d{2,4})(?:,?\s*(\d{2}):(\d{2}))?/); if (m) { const a = m[3].length === 2 ? '20' + m[3] : m[3]; return +new Date(+a, +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)); }
  m = t.replace(/^a partir de\s*/, '').match(/^[−-]?\s*(R\$\s*)?[−-]?[\d.]+(,\d+)?/); if (m && /\d/.test(m[0])) { const n = +m[0].replace(/R\$|\s|\./g, '').replace(',', '.').replace('−', '-'); if (!isNaN(n)) return n; }
  m = t.match(/^#?(\d+)/); if (m && /^#?\d+(\s|$|\/)/.test(t)) return +m[1];
  return t.toLowerCase();
};
function melhorarTabela(tb) {
  if (tb.dataset.dz || tb.closest('.cupom') || tb.closest('#modalBox')) return;
  tb.dataset.dz = '1';
  const ths = [...tb.querySelectorAll('thead th')];
  tb.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, i) => { const h = ths[i] && ths[i].innerText.trim(); if (h) td.dataset.rotulo = h; }));
  if (tb.classList.contains('matrix')) return;
  const chave = location.hash + '|' + ths.map(t => t.innerText.trim()).join(',');
  ths.forEach((th, i) => {
    const nome = th.innerText.trim(); if (!nome) return;
    th.classList.add('ordenavel'); th.tabIndex = 0; th.setAttribute('role', 'columnheader');
    th.setAttribute('aria-sort', ORDEM[chave] && ORDEM[chave][0] === i ? (ORDEM[chave][1] > 0 ? 'ascending' : 'descending') : 'none');
    th.title = 'Ordenar por ' + nome.toLowerCase();
    const ir = () => { const o = ORDEM[chave]; ORDEM[chave] = [i, o && o[0] === i ? -o[1] : (th.classList.contains('num') ? -1 : 1)]; ordenar(tb, chave, ths); };
    th.addEventListener('click', ir); th.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ir(); } });
  });
  if (ORDEM[chave]) ordenar(tb, chave, ths);
}
function ordenar(tb, chave, ths) {
  const [i, dir] = ORDEM[chave], corpo = tb.tBodies[0]; if (!corpo) return;
  // linhas "filho" (variações) andam junto com a linha do grupo
  const blocos = []; [...corpo.rows].forEach(tr => tr.classList.contains('filho') && blocos.length ? blocos[blocos.length - 1].push(tr) : blocos.push([tr]));
  blocos.sort((a, b) => { const x = valorCelula(a[0].cells[i]), y = valorCelula(b[0].cells[i]); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR')) * dir; });
  blocos.forEach(b => b.forEach(tr => corpo.appendChild(tr)));
  ths.forEach((th, k) => { th.setAttribute('aria-sort', k === i ? (dir > 0 ? 'ascending' : 'descending') : 'none'); th.classList.toggle('asc', k === i && dir > 0); th.classList.toggle('desc', k === i && dir < 0); });
}

// ----- Acessibilidade: botões só com ícone ganham nome -----
function rotularBotoes(raiz) {
  raiz.querySelectorAll('button[title]:not([aria-label]), a[title]:not([aria-label])').forEach(b => { if (!b.innerText.trim()) b.setAttribute('aria-label', b.title); });
  raiz.querySelectorAll('.icon-btn.del:not([aria-label])').forEach(b => b.setAttribute('aria-label', 'Remover'));
}

// Aplica as melhorias sempre que a tela muda
function melhorarTudo() {
  document.querySelectorAll('input[type=number][step="0.01"]').forEach(melhorarMoeda);
  document.querySelectorAll('#tela table').forEach(melhorarTabela);
  rotularBotoes(document);
}
new MutationObserver(() => { clearTimeout(window._mt); window._mt = setTimeout(melhorarTudo, 0); }).observe(document.body, { childList: true, subtree: true });

// ----- Instalar como aplicativo (PWA) -----
let pedidoInstalar = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); pedidoInstalar = e; const a = $('#pwaArea'); if (a) a.innerHTML = htmlInstalar(); });
addEventListener('appinstalled', () => { pedidoInstalar = null; toast('Aplicativo instalado'); const a = $('#pwaArea'); if (a) a.innerHTML = htmlInstalar(); });
function htmlInstalar() {
  if (matchMedia('(display-mode: standalone)').matches) return `<span class="pill ok">${ic('circle-check', 'sm')}Você já está usando o aplicativo</span>`;
  if (pedidoInstalar) return `<button class="btn" onclick="instalarApp()">${ic('download', 'sm')}Instalar aplicativo</button>`;
  return `<p class="muted" style="margin:0;font-size:13px">No Chrome ou no Edge, clique no ícone de instalar ${ic('monitor-down', 'sm')} na barra de endereço, ou no menu ⋮ → <b>Instalar Doze Cosméticos</b>.</p>`;
}
async function instalarApp() { if (!pedidoInstalar) return; pedidoInstalar.prompt(); await pedidoInstalar.userChoice; pedidoInstalar = null; const a = $('#pwaArea'); if (a) a.innerHTML = htmlInstalar(); }
if ('serviceWorker' in navigator && location.protocol !== 'file:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
