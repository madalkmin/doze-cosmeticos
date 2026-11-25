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

// ----- Busca geral: campo no topo com resultados logo abaixo (Ctrl+K foca) -----
let BUSCA = { sel: 0, itens: [] };
function htmlBusca() {
  return `<div class="busca" id="busca">${ic('search', 'sm')}
    <input id="buscaIn" type="search" placeholder="Buscar produto, cliente, venda…" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-controls="buscaLista" aria-autocomplete="list" aria-label="Buscar produto, código de barras, cliente, venda ou ação">
    <kbd class="busca-kbd" aria-hidden="true">Ctrl K</kbd>
    <div class="busca-drop" id="buscaDrop" hidden><div class="busca-lista" id="buscaLista" role="listbox" aria-label="Resultados"></div>
      <div class="busca-rodape" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> fechar</span></div></div></div>`;
}
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
function abrirBusca() { const i = $('#buscaIn'); if (i) { i.focus(); i.select(); } }
function mostrarBusca(sim) {
  const d = $('#buscaDrop'), i = $('#buscaIn'); if (!d) return;
  d.hidden = !sim; i.setAttribute('aria-expanded', sim); $('#busca').classList.toggle('aberta', sim);
}
function fecharBusca(limpar) { const i = $('#buscaIn'); if (!i) return; mostrarBusca(false); if (limpar) i.value = ''; }
function desenharBusca() {
  const inp = $('#buscaIn'); if (!inp) return;
  const t = inp.value.trim().toLowerCase(), norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(), tn = norm(t);
  const { a, telas } = acoesBusca(), grupos = [];
  const casa = (...c) => c.some(x => norm(x).includes(tn));
  if (!t) grupos.push(['Ações rápidas', a.map(x => ({ i: x[0], t: x[1], s: x[2], run: x[3] }))]);
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
  BUSCA.sel = Math.min(BUSCA.sel, Math.max(0, BUSCA.itens.length - 1));
  let k = 0;
  $('#buscaLista').innerHTML = BUSCA.itens.length ? grupos.map(([nome, its]) => `<div class="cmdk-grupo" role="presentation">${nome}</div>${its.map(x => { const id = k++; return `<div class="cmdk-it" role="option" id="ck${id}" data-k="${id}" aria-selected="${id === BUSCA.sel}">${x.thumb ? thumb(x.thumb, true) : x.av ? `<span class="avatar sm">${iniciais(x.av)}</span>` : `<span class="ico-chip sm">${ic(x.i, 'sm')}</span>`}<span class="tx"><b>${esc(x.t)}</b><small>${esc(x.s)}</small></span>${x.dica ? `<small class="cmdk-dica">${x.dica}</small>` : ''}</div>`; }).join('')}`).join('')
    : `<div class="busca-vazio"><b>Nada encontrado para “${esc(inp.value.trim())}”</b>Tente o nome, a marca ou o código de barras.</div>`;
  mostrarBusca(true); marcarBusca();
}
function marcarBusca() {
  document.querySelectorAll('#buscaLista .cmdk-it').forEach(el => el.setAttribute('aria-selected', +el.dataset.k === BUSCA.sel));
  const s = $('#ck' + BUSCA.sel), i = $('#buscaIn'); if (s) { s.scrollIntoView({ block: 'nearest' }); i.setAttribute('aria-activedescendant', s.id); } else i && i.removeAttribute('aria-activedescendant');
}
function executarBusca(k) { const x = BUSCA.itens[k]; if (!x) return; fecharBusca(true); $('#buscaIn').blur(); new Function(x.run)(); }
// Eventos delegados: a barra do topo é redesenhada a cada troca de tela
document.addEventListener('focusin', e => { if (e.target.id === 'buscaIn') { BUSCA.sel = 0; desenharBusca(); } });
document.addEventListener('input', e => { if (e.target.id === 'buscaIn') { BUSCA.sel = 0; desenharBusca(); } });
document.addEventListener('keydown', e => {
  if (e.target.id !== 'buscaIn') return;
  e.stopPropagation(); // não deixa o leitor de código de barras do caixa pegar estas teclas
  if (e.key === 'ArrowDown') { e.preventDefault(); BUSCA.sel = Math.min(BUSCA.itens.length - 1, BUSCA.sel + 1); marcarBusca(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); BUSCA.sel = Math.max(0, BUSCA.sel - 1); marcarBusca(); }
  else if (e.key === 'Enter') { e.preventDefault(); executarBusca(BUSCA.sel); }
  else if (e.key === 'Escape') { e.preventDefault(); if (e.target.value) { e.target.value = ''; BUSCA.sel = 0; desenharBusca(); } else { fecharBusca(); e.target.blur(); } }
  else if (e.key === 'Tab') fecharBusca();
}, true); // fase de captura: chega antes dos atalhos do caixa
document.addEventListener('mousedown', e => {
  const it = e.target.closest && e.target.closest('#buscaLista .cmdk-it');
  if (it) { e.preventDefault(); executarBusca(+it.dataset.k); return; }
  if (!e.target.closest || !e.target.closest('#busca')) fecharBusca();
});
document.addEventListener('mousemove', e => { const it = e.target.closest && e.target.closest('#buscaLista .cmdk-it'); if (it && BUSCA.sel !== +it.dataset.k) { BUSCA.sel = +it.dataset.k; marcarBusca(); } });
document.addEventListener('keydown', e => {
  if (!S.usuario) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); abrirBusca(); }
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
  fp: [['ean', v => v.trim().length >= 8, 'Bipe ou digite o código de barras (8 dígitos ou mais)'], ['nome', v => v.trim(), 'Informe o nome do produto'], ['preco', v => num(v) > 0, 'Informe o preço de venda'],
    ['ean', (v, f) => !S.produtos.some(p => p.ean === v.trim() && p.id !== +f.dataset.id), 'Já existe um produto com esse código']],
  fc: [['nome', v => v.trim().length >= 3, 'Informe o nome completo'], ['cpf', v => !v || v.length === 14, 'CPF incompleto: são 11 números'], ['fone', v => !v || v.length >= 14, 'WhatsApp incompleto: DDD + número']],
  fcr: [['nome', v => v.trim().length >= 2, 'Informe o nome'], ['cpf', v => !v || v.length === 14, 'CPF incompleto: são 11 números'], ['fone', v => !v || v.length >= 14, 'WhatsApp incompleto: DDD + número']],
  ff: [['nome', v => v.trim(), 'Informe o nome do fornecedor'], ['cnpj', v => !v || v.length === 18, 'CNPJ incompleto: são 14 números']],
  fmv: [['valor', v => num(v) > 0, 'Informe um valor maior que zero']],
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
  if (e.key !== 'Enter' || e.shiftKey || e.defaultPrevented) return;
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

// ----- Tabelas: ordenar e filtrar por coluna, título alinhado ao conteúdo -----
// Vale para toda tabela das telas. A ordem e os filtros ficam guardados por tabela
// enquanto o sistema está aberto, então continuam valendo quando a tela é redesenhada.
const ORDEM = {}, FILTROS = {};
// Telas com "Carregar mais": ao filtrar, carrega tudo para o filtro valer para todas as linhas
const CARREGAR_TODOS = {
  '#vendas': () => { limiteV = 1e9; TELAS.vendas(); },
  '#produtos': () => { limiteP = 1e9; desenharProdutos(); },
  '#movimentacoes': () => { limiteM = 1e9; TELAS.movimentacoes(); },
};
const valorCelula = td => {
  const t = (td ? td.innerText : '').trim();
  let m = t.match(/^(\d{2})\/(\d{2})\/(\d{2,4})(?:,?\s*(\d{2}):(\d{2}))?/); if (m) { const a = m[3].length === 2 ? '20' + m[3] : m[3]; return +new Date(+a, +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)); }
  m = t.replace(/^a partir de\s*/, '').match(/^[−-]?\s*(R\$\s*)?[−+-]?[\d.]+(,\d+)?/); if (m && /\d/.test(m[0])) { const n = +m[0].replace(/R\$|\s|\.|\+/g, '').replace(',', '.').replace('−', '-'); if (!isNaN(n)) return n; }
  return t.toLowerCase();
};
// Texto que representa a célula no filtro (o nome em destaque, sem detalhes; data sem hora)
function textoFiltro(td) {
  if (!td) return '';
  const b = td.querySelector('.prod b') || td.querySelector('b');
  let t = ((b && b.innerText) || td.innerText || '').trim().split('\n')[0].trim();
  const m = t.match(/^(\d{2}\/\d{2}\/\d{2,4}),?\s+\d{2}:\d{2}/); if (m) t = m[1];
  return t === '—' ? '' : t;
}
const chaveOrdem = t => { const m = t.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/); if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + m[2] + m[1]; return t; };
const blocosTabela = tb => { const bl = []; [...(tb.tBodies[0] || { rows: [] }).rows].forEach(tr => { if (tr.classList.contains('vazio-filtro')) return; tr.classList.contains('filho') && bl.length ? bl[bl.length - 1].push(tr) : bl.push([tr]); }); return bl; };
const nomeColuna = th => (th.querySelector('.th-tx') || th).textContent.trim();
const chaveTabela = (tb, ths) => location.hash + '|' + [...document.querySelectorAll('#tela table')].indexOf(tb) + '|' + ths.map(nomeColuna).join(',');

function alinhamento(th, cel) {
  if (th.classList.contains('num') || (cel && cel.classList.contains('num'))) return 'right';
  const a = (th.style.textAlign || (cel && (cel.style.textAlign || getComputedStyle(cel).textAlign)) || 'left').replace('-webkit-', '');
  return a === 'end' || a === 'right' ? 'right' : a === 'center' ? 'center' : 'left';
}
function melhorarTabela(tb) {
  if (tb.dataset.dz || tb.closest('.cupom') || tb.closest('#modalBox')) return;
  tb.dataset.dz = '1';
  const ths = [...tb.querySelectorAll('thead th')];
  tb.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, i) => { const h = ths[i] && ths[i].textContent.trim(); if (h) td.dataset.rotulo = h; }));
  if (tb.classList.contains('matrix')) return;
  const chave = chaveTabela(tb, ths), primeira = blocosTabela(tb).map(b => b[0]).find(tr => tr.cells.length === ths.length);
  ths.forEach((th, i) => {
    const nome = th.textContent.trim();
    const al = alinhamento(th, primeira && primeira.cells[i]);
    th.style.textAlign = al; th.dataset.al = al;
    if (!nome || th.querySelector('.sr')) return;
    th.innerHTML = `<span class="th-in ${al}"><span class="th-tx">${esc(nome)}</span><span class="th-ord" aria-hidden="true"></span><button type="button" class="th-filtro" aria-haspopup="dialog" aria-label="Filtrar e ordenar por ${esc(nome.toLowerCase())}" title="Filtrar e ordenar">${ic('list-filter', 'sm')}</button></span>`;
    th.classList.add('ordenavel'); th.tabIndex = 0;
    th.title = 'Clique para ordenar por ' + nome.toLowerCase();
    const ordenarAqui = () => { const o = ORDEM[chave]; ORDEM[chave] = [i, o && o[0] === i ? -o[1] : (al === 'right' ? -1 : 1)]; ordenar(tb, chave); };
    th.addEventListener('click', e => { if (!e.target.closest('.th-filtro')) ordenarAqui(); });
    th.addEventListener('keydown', e => { if (e.target === th && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ordenarAqui(); } });
    th.querySelector('.th-filtro').addEventListener('click', e => { e.stopPropagation(); abrirFiltro(tb, i, chave); });
  });
  marcarCabecalho(tb, chave);
  if (ORDEM[chave]) ordenar(tb, chave);
  aplicarFiltros(tb, chave);
}
function ordenar(tb, chave) {
  const [i, dir] = ORDEM[chave], corpo = tb.tBodies[0]; if (!corpo) return;
  const blocos = blocosTabela(tb);
  blocos.sort((a, b) => { const x = valorCelula(a[0].cells[i]), y = valorCelula(b[0].cells[i]); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR', { numeric: true })) * dir; });
  blocos.forEach(b => b.forEach(tr => corpo.appendChild(tr)));
  const vz = corpo.querySelector('.vazio-filtro'); if (vz) corpo.appendChild(vz);
  marcarCabecalho(tb, chave);
}
function marcarCabecalho(tb, chave) {
  const o = ORDEM[chave], f = FILTROS[chave] || {};
  tb.querySelectorAll('thead th').forEach((th, k) => {
    if (!th.classList.contains('ordenavel')) return;
    const dir = o && o[0] === k ? o[1] : 0;
    th.setAttribute('aria-sort', dir > 0 ? 'ascending' : dir < 0 ? 'descending' : 'none');
    th.querySelector('.th-ord').innerHTML = dir ? ic(dir > 0 ? 'arrow-up' : 'arrow-down', 'sm') : '';
    const ativo = !!f[k]; th.classList.toggle('filtrado', ativo);
    const b = th.querySelector('.th-filtro'); b.classList.toggle('ativo', ativo); b.setAttribute('aria-pressed', ativo);
  });
}
function aplicarFiltros(tb, chave) {
  const f = FILTROS[chave] || {}, ativos = Object.entries(f).filter(([, s]) => s), ths = [...tb.querySelectorAll('thead th')];
  tb.querySelectorAll('tr.vazio-filtro').forEach(r => r.remove());
  const pai = tb.parentNode; pai.querySelectorAll(':scope > .filtro-status').forEach(x => x.remove());
  let vis = 0, tot = 0;
  blocosTabela(tb).forEach(b => { tot++; const ok = ativos.every(([i, s]) => s.has(textoFiltro(b[0].cells[i]))); b.forEach(tr => tr.hidden = !ok); if (ok) vis++; });
  marcarCabecalho(tb, chave);
  if (!ativos.length) return;
  if (!vis) tb.tBodies[0].insertAdjacentHTML('beforeend', `<tr class="vazio-filtro"><td colspan="${ths.length}"><div class="empty" style="padding:28px 10px"><b>Nenhuma linha com esses filtros</b>Mude a seleção nas colunas marcadas ou limpe os filtros.</div></td></tr>`);
  tb.insertAdjacentHTML('afterend', `<div class="filtro-status" role="status">${ic('list-filter', 'sm')}<span>Mostrando <b>${vis}</b> de ${tot} · filtrado por ${ativos.map(([i]) => `<b>${esc(nomeColuna(ths[i]).toLowerCase())}</b>`).join(', ')}</span><button type="button" class="btn ghost sm">${ic('x', 'sm')}Limpar filtros</button></div>`);
  tb.nextElementSibling.querySelector('button').onclick = () => { FILTROS[chave] = {}; aplicarFiltros(tb, chave); };
}

// Janela do funil: ordenar, buscar valores, marcar vários, aplicar
let FILTRO_ABERTO = null;
function abrirFiltro(tb, i, chave) {
  fecharFiltro();
  // tabela com "Carregar mais": carrega tudo antes, para o filtro ver todas as linhas
  const carregar = CARREGAR_TODOS[location.hash];
  if (carregar && tb.parentNode.querySelector('.mais')) {
    const idx = [...document.querySelectorAll('#tela table')].indexOf(tb);
    carregar();
    return setTimeout(() => { const nt = document.querySelectorAll('#tela table')[idx]; if (!nt) return; melhorarTabela(nt); abrirFiltro(nt, i, chaveTabela(nt, [...nt.querySelectorAll('thead th')])); }, 30);
  }
  const ths = [...tb.querySelectorAll('thead th')], th = ths[i], nome = nomeColuna(th), btn = th.querySelector('.th-filtro');
  const cont = new Map(); blocosTabela(tb).forEach(b => { const v = textoFiltro(b[0].cells[i]); cont.set(v, (cont.get(v) || 0) + 1); });
  const amostra = blocosTabela(tb).map(b => b[0].cells[i]).find(Boolean);
  const numerica = amostra && typeof valorCelula(amostra) === 'number';
  const valores = [...cont.keys()].sort((a, b) => numerica ? (valorCelula({ innerText: a }) - valorCelula({ innerText: b })) : chaveOrdem(a).localeCompare(chaveOrdem(b), 'pt-BR', { numeric: true }));
  const atual = (FILTROS[chave] || {})[i];
  const sel = new Set(atual ? [...atual].filter(v => cont.has(v)) : valores);
  const o = ORDEM[chave], dir = o && o[0] === i ? o[1] : 0;
  const pop = document.createElement('div');
  pop.className = 'filtro-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Filtrar ' + nome);
  pop.innerHTML = `<div class="fp-topo"><b>${esc(nome)}</b><small class="muted">${valores.length} valor${valores.length === 1 ? '' : 'es'}</small></div>
    <div class="fp-ord" role="group" aria-label="Ordenar"><button type="button" data-o="1" class="${dir > 0 ? 'sel' : ''}" aria-pressed="${dir > 0}">${ic(numerica ? 'arrow-up-1-0' : 'arrow-up-a-z', 'sm')}${numerica ? 'Menor primeiro' : 'A → Z'}</button><button type="button" data-o="-1" class="${dir < 0 ? 'sel' : ''}" aria-pressed="${dir < 0}">${ic(numerica ? 'arrow-down-1-0' : 'arrow-down-z-a', 'sm')}${numerica ? 'Maior primeiro' : 'Z → A'}</button></div>
    <div class="fp-busca">${ic('search', 'sm')}<input type="text" placeholder="Buscar valor" aria-label="Buscar valor em ${esc(nome.toLowerCase())}" autocomplete="off"></div>
    <label class="fp-op fp-todos"><input type="checkbox"><span>Selecionar todos</span><small></small></label>
    <div class="fp-lista" role="group" aria-label="Valores"></div>
    <div class="fp-rodape"><button type="button" class="btn ghost sm" data-acao="limpar">Limpar</button><span class="fp-aviso"></span><button type="button" class="btn sm" data-acao="aplicar">${ic('check', 'sm')}Aplicar</button></div>`;
  document.body.appendChild(pop);
  const lista = pop.querySelector('.fp-lista'), busca = pop.querySelector('.fp-busca input'), todos = pop.querySelector('.fp-todos input'), aplicarBtn = pop.querySelector('[data-acao=aplicar]');
  let visiveis = valores;
  const desenhar = () => {
    lista.innerHTML = visiveis.length ? visiveis.map((v, k) => `<label class="fp-op"><input type="checkbox" data-k="${valores.indexOf(v)}" ${sel.has(v) ? 'checked' : ''}><span>${v ? esc(v) : '<i class="muted">(vazio)</i>'}</span><small>${cont.get(v)}</small></label>`).join('') : `<div class="fp-vazio">Nenhum valor com “${esc(busca.value)}”</div>`;
    const marcados = visiveis.filter(v => sel.has(v)).length;
    todos.checked = visiveis.length > 0 && marcados === visiveis.length; todos.indeterminate = marcados > 0 && marcados < visiveis.length;
    pop.querySelector('.fp-todos span').textContent = busca.value ? 'Selecionar os encontrados' : 'Selecionar todos';
    pop.querySelector('.fp-todos small').textContent = visiveis.length;
    aplicarBtn.disabled = sel.size === 0; pop.querySelector('.fp-aviso').textContent = sel.size === 0 ? 'Marque ao menos um' : `${sel.size} de ${valores.length}`;
  };
  lista.addEventListener('change', e => { const v = valores[+e.target.dataset.k]; e.target.checked ? sel.add(v) : sel.delete(v); desenhar(); });
  todos.addEventListener('change', () => { visiveis.forEach(v => todos.checked ? sel.add(v) : sel.delete(v)); desenhar(); });
  busca.addEventListener('input', () => { const t = busca.value.trim().toLowerCase(); visiveis = valores.filter(v => v.toLowerCase().includes(t)); desenhar(); });
  const aplicar = () => {
    if (!sel.size) return;
    FILTROS[chave] = FILTROS[chave] || {};
    FILTROS[chave][i] = sel.size === valores.length ? null : new Set(sel);
    fecharFiltro(); aplicarFiltros(tb, chave); btn.focus();
  };
  aplicarBtn.onclick = aplicar;
  pop.querySelector('[data-acao=limpar]').onclick = () => { if (FILTROS[chave]) FILTROS[chave][i] = null; fecharFiltro(); aplicarFiltros(tb, chave); btn.focus(); };
  pop.querySelectorAll('.fp-ord button').forEach(b => b.onclick = () => { ORDEM[chave] = [i, +b.dataset.o]; ordenar(tb, chave); fecharFiltro(); btn.focus(); });
  pop.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); fecharFiltro(); btn.focus(); }
    if (e.key === 'Enter' && e.target === busca) { e.preventDefault(); if (busca.value) { sel.clear(); visiveis.forEach(v => sel.add(v)); } aplicar(); }
  });
  desenhar();
  // posição: logo abaixo do funil, sem sair da tela
  const r = btn.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
  let left = th.dataset.al === 'right' ? r.right - w : r.left - 10; left = Math.max(8, Math.min(left, innerWidth - w - 8));
  let top = r.bottom + 6; if (top + h > innerHeight - 8 && r.top > h + 12) top = r.top - h - 6;
  pop.style.left = left + 'px'; pop.style.top = top + 'px';
  btn.setAttribute('aria-expanded', 'true');
  FILTRO_ABERTO = { pop, btn };
  busca.focus();
}
function fecharFiltro() { if (!FILTRO_ABERTO) return; FILTRO_ABERTO.pop.remove(); FILTRO_ABERTO.btn.setAttribute('aria-expanded', 'false'); FILTRO_ABERTO = null; }
document.addEventListener('mousedown', e => { if (FILTRO_ABERTO && !FILTRO_ABERTO.pop.contains(e.target) && !FILTRO_ABERTO.btn.contains(e.target)) fecharFiltro(); });
addEventListener('resize', fecharFiltro);
document.addEventListener('scroll', e => { if (FILTRO_ABERTO && !FILTRO_ABERTO.pop.contains(e.target)) fecharFiltro(); }, true);
addEventListener('hashchange', fecharFiltro);

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

// ===== Máscara de moeda =====
// Campos com data-moeda: digita só números, os dois últimos viram centavos ("1990" → "R$ 19,90").
// Roda na captura, antes dos listeners das telas, que já leem o valor formatado com num().
document.addEventListener('input', e => {
  const el = e.target;
  if (!el.matches || !el.matches('input[data-moeda]')) return;
  const dig = el.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 11);
  el.value = dig ? brl(+dig / 100) : '';
}, true);
document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('input[data-moeda]')) setTimeout(() => e.target.select(), 0); });

// ===== Autocompletar o nome do produto =====
// Ao digitar, sugere produtos já cadastrados com esse nome; escolher abre o cadastro dele.
// Sem escolher nada, o texto digitado continua valendo e é salvo normalmente.
function autocompletarNome(inp, idAtual) {
  const caixa = document.createElement('div');
  caixa.className = 'ac-lista'; caixa.setAttribute('role', 'listbox'); caixa.hidden = true;
  inp.parentNode.classList.add('ac'); inp.parentNode.appendChild(caixa);
  inp.setAttribute('autocomplete', 'off'); inp.setAttribute('aria-autocomplete', 'list');
  let achados = [], ativo = -1;
  const normal = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const fechar = () => { caixa.hidden = true; ativo = -1; };
  const desenhar = () => {
    caixa.innerHTML = `<div class="ac-tit">Já cadastrados</div>` + achados.map((p, k) => `<div class="dz-opt ${k === ativo ? 'ativo' : ''}" data-k="${k}" role="option"><span class="ac-nome"><b>${esc(p.nome)}</b><small>${[p.variacao, p.marca].filter(Boolean).map(esc).join(' · ')}</small></span><small class="muted">${brl(+p.preco || 0)}</small></div>`).join('');
    caixa.hidden = !achados.length;
  };
  const escolher = p => { fechar(); formProduto(p.id); };
  inp.addEventListener('input', () => {
    const t = normal(inp.value.trim());
    achados = t.length < 2 ? [] : S.produtos.filter(p => p.id !== idAtual && normal(p.nome + ' ' + (p.variacao || '')).includes(t)).slice(0, 8);
    ativo = -1; desenhar();
  });
  inp.addEventListener('keydown', e => {
    if (caixa.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); ativo = Math.min(achados.length - 1, ativo + 1); desenhar(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); ativo = Math.max(-1, ativo - 1); desenhar(); }
    else if (e.key === 'Enter' && ativo >= 0) { e.preventDefault(); escolher(achados[ativo]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); }
  });
  caixa.addEventListener('mousedown', e => { const el = e.target.closest('.dz-opt'); if (el) { e.preventDefault(); escolher(achados[+el.dataset.k]); } });
  inp.addEventListener('blur', () => setTimeout(fechar, 100));
}
