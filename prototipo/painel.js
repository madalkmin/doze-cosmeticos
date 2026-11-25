// ===== PAINEL =====
// Tela de comando do dia: o que está acontecendo agora, se o mês vai bater a meta
// e o que precisa de ação. A análise detalhada fica em Relatórios.

const pad2 = n => String(n).padStart(2, '0');
// Dia no fuso local (evita que vendas da noite caiam no dia seguinte)
const chaveDia = d => { const x = new Date(d); return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`; };
const somaTotal = l => l.reduce((s, v) => s + v.total, 0);
const custoVenda = v => v.itens.reduce((a, i) => a + (i.custo || 0) * i.qtd, 0);
const DIAS_SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_SEM_LONGO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const brl0 = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

let painelDias = 30, painelRank = 'qtd';

// ----- Metas -----
function vendasDoMes(ano, mes, filtro = () => true) {
  return vendasValidas().filter(v => { const d = new Date(v.data); return d.getFullYear() === ano && d.getMonth() === mes && filtro(v); });
}
function metaDoMes() {
  if (num(S.config.metaMes)) return num(S.config.metaMes);
  // Sem meta definida: média dos 3 meses anteriores + 10%, arredondada para o milhar
  const a = new Date(); let soma = 0, n = 0;
  for (let k = 1; k <= 3; k++) { const m = new Date(a.getFullYear(), a.getMonth() - k, 1); const t = somaTotal(vendasDoMes(m.getFullYear(), m.getMonth())); if (t) { soma += t; n++; } }
  return n ? Math.ceil(soma / n * 1.1 / 1000) * 1000 : 20000;
}
function metaDaVendedora() {
  if (num(S.config.metaVendedora)) return num(S.config.metaVendedora);
  return Math.ceil(metaDoMes() / 3 / 500) * 500;
}
// Ritmo do mês: quanto do mês já passou (conta o dia de hoje pelo horário comercial, 9h às 19h)
function ritmoMes(agora = new Date()) {
  const diasMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate();
  const frHoje = Math.min(1, Math.max(0, (agora.getHours() + agora.getMinutes() / 60 - 9) / 10));
  const decorridos = agora.getDate() - 1 + frHoje;
  return { diasMes, decorridos, restantes: diasMes - agora.getDate() + 1 };
}
function calcMeta(meta, vendasMes, vendasHoje) {
  const r = ritmoMes(), fat = somaTotal(vendasMes), fatHoje = somaTotal(vendasHoje);
  const proj = r.decorridos >= 0.5 ? fat / r.decorridos * r.diasMes : null;
  const falta = Math.max(0, meta - fat);
  const metaHoje = Math.max(0, meta - (fat - fatHoje)) / r.restantes;
  return { meta, fat, fatHoje, proj, falta, porDia: falta / r.restantes, metaHoje, esperado: Math.min(1, r.decorridos / r.diasMes), pct: meta ? fat / meta : 0, ...r };
}

// ----- Pequenos componentes -----
function spark(vals) {
  const w = 120, h = 34, max = Math.max(...vals, 1), min = Math.min(...vals, 0);
  const pts = vals.map((v, i) => [i * (w / Math.max(1, vals.length - 1)), h - 4 - ((v - min) / (max - min || 1)) * (h - 8)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d} L${w} ${h} L0 ${h}Z" fill="currentColor" opacity=".09"/><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3" fill="currentColor"/></svg>`;
}
// Número que conta até o valor ao abrir a tela
const contar = (v, fmt = 'brl') => `<span class="contar" data-v="${v}" data-fmt="${fmt}">${fmtNum(v, fmt)}</span>`;
function fmtNum(v, fmt) { return fmt === 'brl' ? brl(v) : fmt === 'brl0' ? brl0(v) : fmt === 'dec' ? v.toFixed(1).replace('.', ',') : Math.round(v).toLocaleString('pt-BR'); }
function animarNumeros(raiz = document) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  raiz.querySelectorAll('.contar').forEach(el => {
    const alvo = +el.dataset.v, fmt = el.dataset.fmt, t0 = performance.now(), dur = 700;
    const passo = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmtNum(alvo * e, fmt); if (k < 1) requestAnimationFrame(passo); else el.textContent = fmtNum(alvo, fmt); };
    requestAnimationFrame(passo);
  });
}
function anel(pct, esperado, rot) {
  const r = 54, c = 2 * Math.PI * r, p = Math.min(1, pct);
  const ang = esperado * 2 * Math.PI - Math.PI / 2, tx = 70 + Math.cos(ang) * r, ty = 70 + Math.sin(ang) * r;
  return `<svg class="anel" viewBox="0 0 140 140" role="img" aria-label="${rot}">
    <circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--line-2)" stroke-width="12"/>
    <circle cx="70" cy="70" r="${r}" fill="none" stroke="url(#gAnel)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 70 70)" class="anel-arco"/>
    <circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="4.5" fill="#fff" stroke="var(--ink-2)" stroke-width="2"><title>Onde deveria estar hoje</title></circle>
    <defs><linearGradient id="gAnel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--terra)"/><stop offset="1" stop-color="var(--amora)"/></linearGradient></defs>
    <text x="70" y="68" text-anchor="middle" class="anel-pct">${Math.round(pct * 100)}%</text><text x="70" y="88" text-anchor="middle" class="anel-rot">da meta</text></svg>`;
}
const barra = (pct, cls = '') => `<div class="bar ${cls}" role="presentation"><i style="width:${Math.min(100, Math.max(0, pct * 100)).toFixed(1)}%"></i></div>`;
function haQuanto(d) {
  const m = Math.round((Date.now() - new Date(d)) / 6e4);
  if (m < 1) return 'agora mesmo'; if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `há ${h} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}`;
  return new Date(d).toLocaleDateString('pt-BR');
}

// ----- Faixa "Agora na loja" -----
function htmlAgora(m, minhas) {
  const ult = [...(minhas || vendasValidas())].sort((a, b) => b.data.localeCompare(a.data))[0];
  const c = S.caixa, gaveta = S.usuario.perfil !== 'vendedora';
  const bloco = (icone, tom, rot, valor, sub, extra = '') => `<div class="agora-it">${`<span class="ico-chip ${tom}">${ic(icone)}</span>`}<div><small>${rot}</small><b>${valor}</b><span class="muted">${sub}</span>${extra}</div></div>`;
  return `<section class="card agora" aria-label="Agora na loja">
    ${c ? bloco('lock-open', 'ok', 'Caixa', `#${c.id} aberto`, `${esc(c.operador.split(' ')[0])} · desde ${new Date(c.abertoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`)
      : bloco('lock-keyhole', 'bad', 'Caixa', 'Fechado', `<button class="link-btn" onclick="location.hash='caixas'">Abrir caixa</button>`)}
    ${gaveta ? bloco('banknote', '', 'Dinheiro na gaveta', c ? brl(esperadoDinheiro(c)) : '—', c ? `fundo de ${brl(c.fundo)}` : 'caixa fechado') : ''}
    ${ult ? `<button class="agora-it agora-btn" onclick="verVenda(${ult.id})" aria-label="Ver última venda"><span class="ico-chip terra">${ic('receipt')}</span><div><small>${minhas ? 'Sua última venda' : 'Última venda'}</small><b>${brl(ult.total)}</b><span class="muted">${haQuanto(ult.data)}${minhas ? '' : ' · ' + esc(ult.vendedor.split(' ')[0])}</span></div></button>` : bloco('receipt', 'terra', 'Última venda', '—', 'nenhuma ainda')}
    ${bloco('target', '', minhas ? 'Sua meta de hoje' : 'Meta de hoje', `${brl0(m.fatHoje)} <small class="muted">de ${brl0(m.metaHoje)}</small>`, m.fatHoje >= m.metaHoje ? '<span class="ok-tx">Meta do dia batida</span>' : `faltam ${brl0(m.metaHoje - m.fatHoje)}`, barra(m.metaHoje ? m.fatHoje / m.metaHoje : 0, 'fina'))}
  </section>`;
}

// ----- Meta do mês -----
function htmlMeta(m, titulo, ondeMudar) {
  const noRitmo = m.proj != null && m.proj >= m.meta;
  const msg = m.fat >= m.meta ? `<span class="pill ok">${ic('party-popper', 'sm')}Meta batida</span>`
    : m.proj == null ? `<span class="pill plain">A projeção aparece com as primeiras vendas</span>`
    : noRitmo ? `<span class="pill ok">No ritmo para bater a meta</span>` : `<span class="pill warn">Abaixo do ritmo</span>`;
  return `<div class="card meta-card">
    <div class="card-head"><h3>${ic('target', 'sm')}${titulo}</h3>${ondeMudar ? `<a class="btn ghost sm" href="#configuracoes" title="Mudar a meta em Configurações">${ic('pencil', 'sm')}<span class="sr">Mudar meta</span></a>` : ''}</div>
    <div class="meta-corpo">
      ${anel(m.pct, m.esperado, `${Math.round(m.pct * 100)}% da meta de ${brl0(m.meta)}`)}
      <div class="meta-tx">
        <div><small class="muted">Vendido</small><b class="meta-val">${contar(m.fat, 'brl0')}</b><small class="muted">de ${brl0(m.meta)}</small></div>
        ${msg}
      </div>
    </div>
    <dl class="meta-linhas">
      <div><dt>Projeção do mês</dt><dd>${m.proj == null ? '—' : brl0(m.proj)}</dd></div>
      <div><dt>${m.falta ? `Para bater: por dia (${m.restantes} dias)` : 'Acima da meta'}</dt><dd>${m.falta ? brl0(m.porDia) : brl0(m.fat - m.meta)}</dd></div>
    </dl>
  </div>`;
}

// ----- KPI com minigráfico -----
function kpiSpark({ icone, tom = '', rotulo, valor, fmt = 'brl', foot = '', serie, href, onclick = '' }) {
  const tag = href ? 'a' : 'div';
  return `<${tag} class="card kpi ${href ? 'link' : ''}" ${href ? `href="${href}" onclick="${onclick}"` : ''}>
    <div class="top">${rotulo}<span class="ico-chip ${tom}">${ic(icone)}</span></div>
    <div class="kpi-meio"><div class="val">${contar(valor, fmt)}</div><span class="spark-wrap ${tom}" title="Últimos 7 dias">${spark(serie)}</span></div>
    ${foot ? `<div class="foot">${foot}</div>` : ''}</${tag}>`;
}

// ----- Atenção: grupos que abrem com a lista e uma ação -----
function htmlAtencao(baixos, vencendo, parados, aniver, contas, pend) {
  const hoje = new Date(), diaHoje = hoje.getDate();
  const grupos = [];
  if (contas.length) grupos.push({ icone: 'calendar-clock', tom: 'bad', titulo: `${contas.length} conta${contas.length > 1 ? 's' : ''} a pagar`, sub: `${contas.filter(c => c.vencimento < hojeISO()).length} vencida(s) · ${brl(contas.reduce((s, c) => s + c.valor, 0))} até daqui a 7 dias`,
    itens: contas.map(c => `<li><span class="tx"><b>${esc(c.descricao)}</b><small>${c.vencimento < hojeISO() ? '<span class="bad-tx">venceu</span>' : 'vence'} ${c.vencimento.split('-').reverse().slice(0, 2).join('/')} · ${brl(c.valor)}</small></span><button class="btn sec sm" onclick="darBaixa(${c.id})">${ic('check', 'sm')}Dar baixa</button></li>`),
    acao: `<button class="btn ghost sm" onclick="abaFin='contas';location.hash='financeiro'">Ver todas as contas ${ic('arrow-right', 'sm')}</button>` });
  if (baixos.length) grupos.push({ icone: 'triangle-alert', tom: 'warn', titulo: `${baixos.length} produto${baixos.length > 1 ? 's' : ''} com estoque baixo`, sub: `${baixos.filter(p => p.estoque <= 0).length} esgotado(s) · repor antes de acabar`,
    itens: baixos.map(p => `<li>${thumb(p.categoria, true)}<span class="tx"><b>${esc(p.nome)}</b><small>${p.estoque <= 0 ? '<span class="bad-tx">esgotado</span>' : p.estoque + ' em estoque'} · mínimo ${p.minimo}</small></span></li>`),
    acao: pode('compras') ? `<button class="btn sm" onclick="gerarPedidoCompra()">${ic('shopping-cart', 'sm')}Gerar pedido de compra</button>` : `<button class="btn ghost sm" onclick="irEstoque('alertas')">Ver estoque ${ic('arrow-right', 'sm')}</button>` });
  if (vencendo.length) grupos.push({ icone: 'hourglass', tom: 'bad', titulo: `${vencendo.length} vencendo em até 3 meses`, sub: 'Boa hora para uma promoção',
    itens: vencendo.map(p => `<li>${thumb(p.categoria, true)}<span class="tx"><b>${esc(p.nome)}</b><small>vence ${fmtValidade(p.validade)} · ${p.estoque} un.</small></span></li>`),
    acao: pode('estoque') && S.usuario.perfil !== 'vendedora' ? `<button class="btn ghost sm" onclick="irEstoque('alertas')">Ver alertas de estoque ${ic('arrow-right', 'sm')}</button>` : '' });
  if (parados.length) { const vc = perfil().verCusto, parado = parados.reduce((s, p) => s + p.custo * p.estoque, 0);
    grupos.push({ icone: 'snowflake', tom: '', titulo: `${parados.length} sem venda há 30 dias`, sub: vc ? `${brl(parado)} parados em estoque (custo)` : 'Produtos parados',
      itens: parados.map(p => `<li>${thumb(p.categoria, true)}<span class="tx"><b>${esc(p.nome)}</b><small>${p.estoque} em estoque${vc ? ' · ' + brl(p.custo * p.estoque) : ''}</small></span></li>`),
      acao: pode('produtos') ? `<a class="btn ghost sm" href="#produtos">Ver produtos ${ic('arrow-right', 'sm')}</a>` : '' }); }
  if (aniver.length) grupos.push({ icone: 'cake', tom: 'terra', titulo: `${aniver.length} aniversariante${aniver.length > 1 ? 's' : ''} no mês`, sub: (() => { const h = aniver.filter(c => +c.nasc.slice(8) === diaHoje).length; return h ? `<b>${h} hoje!</b> Mande um parabéns com cupom` : 'Mande um parabéns com cupom'; })(),
    itens: aniver.map(c => { const d = +c.nasc.slice(8); return `<li><span class="avatar sm" aria-hidden="true">${iniciais(c.nome)}</span><span class="tx"><b>${esc(c.nome)}</b><small>${d === diaHoje ? '<span class="ok-tx">hoje</span>' : `dia ${pad2(d)}`}${d < diaHoje ? ' · já passou' : ''}</small></span><button class="btn sec sm" onclick="parabens(${c.id})">${ic('message-circle', 'sm')}WhatsApp</button></li>`; }), acao: '' });
  if (pend.length) grupos.push({ icone: 'user-check', tom: '', titulo: `${pend.length} pessoa${pend.length > 1 ? 's' : ''} esperando acesso`, sub: 'Cadastro feito na tela de login',
    itens: pend.map(u => `<li><span class="avatar sm" aria-hidden="true">${iniciais(u.nome)}</span><span class="tx"><b>${esc(u.nome)}</b><small>${esc(u.email)}</small></span><button class="btn sm" onclick="mudarStatus(${u.id},'ativo')">${ic('check', 'sm')}Liberar</button></li>`), acao: '' });
  if (!grupos.length) return `<div class="empty" style="padding:32px 10px"><div class="ring">${ic('circle-check', 'xl')}</div><b>Tudo em dia</b>Nenhum alerta agora.</div>`;
  return `<div class="atencao">${grupos.map((g, k) => `<details class="at-grupo" ${k === 0 ? 'open' : ''}>
    <summary><span class="ico-chip ${g.tom}">${ic(g.icone)}</span><span class="tx"><b>${g.titulo}</b><small>${g.sub}</small></span>${ic('chevron-down', 'sm at-seta')}</summary>
    <ul class="at-lista">${g.itens.slice(0, 6).join('')}</ul>${g.itens.length > 6 ? `<small class="muted at-mais">e mais ${g.itens.length - 6}</small>` : ''}
    ${g.acao ? `<div class="at-acao">${g.acao}</div>` : ''}</details>`).join('')}</div>`;
}
function parabens(id) { const c = S.clientes.find(x => x.id === id); toast(`Mensagem de parabéns para ${c.nome.split(' ')[0]} aberta no WhatsApp (simulação)`); }

// Monta uma compra com os produtos em falta e abre para conferir
function gerarPedidoCompra() {
  const baixos = S.produtos.filter(p => p.estoque <= p.minimo);
  if (!baixos.length) return toast('Nenhum produto com estoque baixo');
  NC = { fornecedor: '', nota: '', itens: baixos.map(p => ({ id: p.id, qtd: Math.max(1, p.minimo * 2 - p.estoque), custo: p.custo })), atualizarCusto: true, lancarConta: true, venc: '' };
  if (location.hash !== '#compras') location.hash = 'compras';
  setTimeout(() => { desenharCompra(); toast(`Pedido montado com ${baixos.length} produtos. Confira as quantidades.`); }, 60);
}

// Vendas de um dia (clique no gráfico)
function abrirDia(chave) {
  const vs = vendasValidas().filter(v => chaveDia(v.data) === chave).sort((a, b) => a.data.localeCompare(b.data));
  const d = new Date(chave + 'T12:00');
  const nome = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const pv = pode('vendas');
  abrirModal(`<div class="modal-head"><span class="ico-chip">${ic('calendar-days', 'lg')}</span><div><h2>${nome[0].toUpperCase() + nome.slice(1)}</h2><p>${vs.length} venda${vs.length === 1 ? '' : 's'} · ${brl(somaTotal(vs))}${vs.length ? ` · ticket médio ${brl(somaTotal(vs) / vs.length)}` : ''}</p></div></div>
  ${vs.length ? `<div class="list">${vs.map(v => `<${pv ? 'button' : 'div'} class="list-item ${pv ? 'clicavel' : ''}" ${pv ? `onclick="verVenda(${v.id})"` : ''}><span class="hora">${new Date(v.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span><span class="tx"><b>${v.itens.map(i => esc(i.nome)).join(', ')}</b><small>${esc(S.clientes.find(c => c.id === v.cliente)?.nome || 'Consumidor final')} · ${v.pagamentos.map(p => p.forma).join(' + ')} · ${esc(v.vendedor.split(' ')[0])}</small></span><b class="num">${brl(v.total)}</b></${pv ? 'button' : 'div'}>`).join('')}</div>`
    : `<div class="empty" style="padding:28px">Nenhuma venda neste dia.</div>`}
  <div class="acoes"><button class="btn" onclick="fecharModal()">Fechar</button></div>`);
}

// ----- Gráfico principal -----
function desenharGraficoPainel() {
  const el = $('#gDias'); if (!el) return;
  graficos = graficos.filter(g => { if (g.canvas === el) { g.destroy(); return false; } return true; });
  const n = painelDias, porDia = {};
  vendasValidas().forEach(v => { const k = chaveDia(v.data); porDia[k] = (porDia[k] || 0) + v.total; });
  const dias = [...Array(n)].map((_, i) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - (n - 1) + i); return d; });
  const atual = dias.map(d => porDia[chaveDia(d)] || 0);
  const anterior = dias.map(d => { const x = new Date(d); x.setDate(x.getDate() - n); return porDia[chaveDia(x)] || 0; });
  const ta = atual.reduce((a, b) => a + b, 0), tp = anterior.reduce((a, b) => a + b, 0);
  $('#gResumo').innerHTML = `<b>${brl(ta)}</b> nos últimos ${n} dias ${tp ? delta((ta / tp - 1) * 100) + ' <span class="muted">vs ' + n + ' dias antes</span>' : ''}`;
  const fimDeSemana = { id: 'fds', beforeDatasetsDraw(ch) {
    const { ctx, chartArea: a, scales: { x } } = ch, w = (a.right - a.left) / n;
    ctx.save(); ctx.fillStyle = 'rgba(232,196,196,.22)';
    dias.forEach((d, i) => { if (d.getDay() === 0 || d.getDay() === 6) ctx.fillRect(x.getPixelForValue(i) - w / 2, a.top, w, a.bottom - a.top); });
    ctx.restore();
  } };
  const g = new Chart(el, {
    data: { labels: dias.map(d => pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1)), datasets: [
      { type: 'bar', label: 'Este período', data: atual, backgroundColor: dias.map((d, i) => i === n - 1 ? '#c97b6b' : '#7d3150'), borderRadius: n > 60 ? 3 : 6, maxBarThickness: 22, order: 2 },
      { type: 'line', label: 'Período anterior', data: anterior, borderColor: '#b29aa3', borderWidth: 1.6, borderDash: [5, 4], pointRadius: 0, pointHoverRadius: 3, tension: .35, order: 1 },
    ] },
    options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      onClick: (e, els) => { if (els.length) abrirDia(chaveDia(dias[els[0].index])); },
      onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
      plugins: { legend: { display: false }, tooltip: { callbacks: { title: c => { const d = dias[c[0].dataIndex]; return DIAS_SEM_LONGO[d.getDay()] + ', ' + c[0].label; }, label: c => ' ' + c.dataset.label + ': ' + brl(c.raw), footer: () => 'Clique para ver as vendas do dia' } } },
      scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: n > 30 ? 9 : 10 } }, y: { border: { display: false }, grid: { color: '#f3e8e6' }, ticks: { callback: v => 'R$ ' + v.toLocaleString('pt-BR') } } } },
    plugins: [fimDeSemana],
  });
  graficos.push(g);
}
function mudarPeriodoPainel(n) {
  painelDias = n;
  document.querySelectorAll('#segDias button').forEach(b => { const s = +b.dataset.n === n; b.classList.toggle('sel', s); b.setAttribute('aria-pressed', s); });
  desenharGraficoPainel();
}

// ----- Ranking com abas -----
function htmlRanking(vm) {
  const vc = perfil().verCusto;
  if (!vc && painelRank === 'lucro') painelRank = 'qtd';
  const rank = {}; vm.forEach(v => v.itens.forEach(i => { const r = rank[i.id] = rank[i.id] || { q: 0, f: 0, l: 0 }; r.q += i.qtd; r.f += i.qtd * i.preco; r.l += i.qtd * (i.preco - (i.custo || 0)); }));
  const chave = { qtd: 'q', fat: 'f', lucro: 'l' }[painelRank];
  const top = Object.entries(rank).sort((a, b) => b[1][chave] - a[1][chave]).slice(0, 8).map(([id, r]) => [S.produtos.find(p => p.id == id), r]).filter(x => x[0]);
  const max = top.length ? top[0][1][chave] : 1;
  const v30 = {}; const lim = Date.now() - 30 * 864e5;
  vendasValidas().forEach(v => { if (new Date(v.data) >= lim) v.itens.forEach(i => v30[i.id] = (v30[i.id] || 0) + i.qtd); });
  const cobertura = p => { if (p.estoque <= 0) return '<span class="pill bad">Esgotado</span>'; const ritmo = (v30[p.id] || 0) / 30; const d = ritmo ? Math.round(p.estoque / ritmo) : 999; return d <= 7 ? `<span class="pill warn">acaba em ~${Math.max(1, d)} dia${d > 1 ? 's' : ''}</span>` : `<small class="muted">${p.estoque} em estoque</small>`; };
  const abas = [['qtd', 'Unidades'], ['fat', 'Faturamento'], ...(vc ? [['lucro', 'Lucro']] : [])];
  const valor = r => painelRank === 'qtd' ? `${r.q} un.` : brl(painelRank === 'fat' ? r.f : r.l);
  return `<div class="card-head"><h3>${ic('award', 'sm')}Mais vendidos do mês</h3>
    <div class="seg mini" role="group" aria-label="Ordenar por">${abas.map(([k, n]) => `<button type="button" class="${painelRank === k ? 'sel' : ''}" aria-pressed="${painelRank === k}" onclick="painelRank='${k}';$('#cardRank').innerHTML=htmlRanking(window._vmPainel)">${n}</button>`).join('')}</div></div>
    ${top.length ? `<div class="list">${top.map(([p, r], i) => `<div class="list-item"><span class="rank ${i < 3 ? 'top' : ''}">${i + 1}</span>${thumb(p.categoria, true)}<span class="tx"><b>${esc(p.nome)}</b>${barra(r[chave] / max)}</span><span class="rank-dir"><b class="num">${valor(r)}</b>${cobertura(p)}</span></div>`).join('')}</div>`
    : `<div class="empty" style="padding:32px 10px"><div class="ring">${ic('award', 'xl')}</div><b>Ainda sem vendas este mês</b>O ranking aparece com as primeiras vendas.</div>`}`;
}

// ----- Categorias, pagamentos, horários, vendedoras -----
function htmlCategorias(vm) {
  const vc = perfil().verCusto, cat = {};
  vm.forEach(v => v.itens.forEach(i => { const p = S.produtos.find(x => x.id === i.id); const c = p ? p.categoria : 'Outros'; const r = cat[c] = cat[c] || { f: 0, l: 0 }; r.f += i.qtd * i.preco; r.l += i.qtd * (i.preco - (i.custo || 0)); }));
  const lista = Object.entries(cat).sort((a, b) => b[1].f - a[1].f), tot = lista.reduce((s, [, r]) => s + r.f, 0), max = lista.length ? lista[0][1].f : 1;
  return `<div class="card-head"><h3>${ic('tags', 'sm')}Vendas por categoria</h3><small class="muted">mês atual</small></div>
  ${lista.length ? `<div class="cats">${lista.map(([c, r]) => `<div class="cat-linha">${thumb(c, true)}<div class="tx"><div class="cat-top"><b>${c}</b><span class="num">${brl0(r.f)} <small class="muted">${tot ? Math.round(r.f / tot * 100) : 0}%</small></span></div>${barra(r.f / max)}${vc ? `<small class="muted">margem de ${r.f ? Math.round(r.l / r.f * 100) : 0}%</small>` : ''}</div></div>`).join('')}</div>`
    : `<div class="empty" style="padding:28px 10px">Sem vendas no mês ainda.</div>`}`;
}
function htmlPagamentos(vm) {
  const tot = somaTotal(vm), formas = PAGAMENTOS.map(([p, i]) => [p, i, vm.reduce((s, v) => s + v.pagamentos.filter(x => x.forma === p).reduce((a, x) => a + x.valor, 0), 0)]).sort((a, b) => b[2] - a[2]);
  return `<div class="card-head"><h3>${ic('credit-card', 'sm')}Formas de pagamento</h3><small class="muted">mês atual</small></div>
  <div class="cats">${formas.map(([p, i, v]) => `<div class="cat-linha"><span class="ico-chip sm">${ic(i, 'sm')}</span><div class="tx"><div class="cat-top"><b>${p}</b><span class="num">${brl0(v)} <small class="muted">${tot ? Math.round(v / tot * 100) : 0}%</small></span></div>${barra(tot ? v / tot : 0)}</div></div>`).join('')}</div>`;
}
function htmlHorarios() {
  const H0 = 9, H1 = 19, semanas = 8, lim = Date.now() - semanas * 7 * 864e5;
  const ordem = [1, 2, 3, 4, 5, 6, 0], m = {};
  vendasValidas().forEach(v => { const d = new Date(v.data); if (d < lim) return; const h = d.getHours(); if (h < H0 || h >= H1) return; const k = d.getDay() + '-' + h; m[k] = (m[k] || 0) + v.total; });
  const val = (dw, h) => (m[dw + '-' + h] || 0) / semanas;
  let max = 0, top = null; ordem.forEach(dw => { for (let h = H0; h < H1; h++) { const x = val(dw, h); if (x > max) { max = x; top = [dw, h]; } } });
  const porDia = ordem.map(dw => [dw, [...Array(H1 - H0)].reduce((s, _, k) => s + val(dw, H0 + k), 0)]).sort((a, b) => b[1] - a[1]);
  const horas = [...Array(H1 - H0)].map((_, k) => H0 + k);
  const resumo = top ? `Pico: ${DIAS_SEM_LONGO[top[0]]} das ${top[1]}h às ${top[1] + 1}h. Dia mais forte: ${DIAS_SEM_LONGO[porDia[0][0]]}. Mais calmo: ${DIAS_SEM_LONGO[porDia[porDia.length - 1][0]]}.` : 'Sem vendas nas últimas semanas.';
  return `<div class="card-head"><h3>${ic('clock', 'sm')}Quando a loja mais vende</h3><small class="muted">média das últimas ${semanas} semanas</small></div>
  <div class="tbl-wrap"><div class="heat" role="img" aria-label="${resumo}" style="--cols:${horas.length}">
    <span></span>${horas.map(h => `<span class="heat-h">${h}h</span>`).join('')}
    ${ordem.map(dw => `<span class="heat-d">${DIAS_SEM[dw]}</span>${horas.map(h => { const x = val(dw, h), a = max ? x / max : 0; return `<span class="heat-c" style="--a:${a.toFixed(2)}" title="${DIAS_SEM_LONGO[dw]}, ${h}h às ${h + 1}h: média de ${brl0(x)}"></span>`; }).join('')}`).join('')}
  </div></div>
  <div class="heat-rodape"><p>${resumo}</p><span class="heat-leg" aria-hidden="true">menos<i style="--a:.08"></i><i style="--a:.35"></i><i style="--a:.65"></i><i style="--a:1"></i>mais</span></div>`;
}
function htmlVendedoras(vm) {
  const meta = metaDaVendedora(), por = {};
  vm.forEach(v => { const r = por[v.vendedor] = por[v.vendedor] || { n: 0, f: 0, it: 0 }; r.n++; r.f += v.total; r.it += v.itens.reduce((s, i) => s + i.qtd, 0); });
  const lista = Object.entries(por).sort((a, b) => b[1].f - a[1].f);
  return `<div class="card-head" style="padding:18px 20px 14px"><h3>${ic('users', 'sm')}Desempenho por vendedora</h3><small class="muted">mês atual · meta de ${brl0(meta)} por pessoa</small></div>
  ${lista.length ? `<div class="tbl-wrap"><table><thead><tr><th>Vendedora</th><th class="num">Vendas</th><th class="num">Faturamento</th><th class="num">Ticket médio</th><th class="num">Itens por venda</th><th>Meta do mês</th></tr></thead><tbody>
  ${lista.map(([nome, r]) => `<tr><td><div class="prod" style="min-width:0"><span class="avatar sm" aria-hidden="true">${iniciais(nome)}</span><b>${esc(nome)}</b></div></td><td class="num">${r.n}</td><td class="num"><b>${brl(r.f)}</b></td><td class="num">${brl(r.f / r.n)}</td><td class="num">${(r.it / r.n).toFixed(1).replace('.', ',')}</td><td style="min-width:160px"><div class="meta-mini">${barra(r.f / meta)}<small class="muted">${Math.round(r.f / meta * 100)}%</small></div></td></tr>`).join('')}
  </tbody></table></div>` : `<div class="empty" style="padding:28px">Sem vendas no mês ainda.</div>`}`;
}

// ----- Tela -----
TELAS.painel = () => {
  if (S.usuario.perfil === 'vendedora') return painelVendedora();
  const agora = new Date(), ano = agora.getFullYear(), mes = agora.getMonth(), hoje = chaveDia(agora);
  const vm = vendasDoMes(ano, mes); window._vmPainel = vm;
  const pm = new Date(ano, mes - 1, 1);
  const va = vendasDoMes(pm.getFullYear(), pm.getMonth(), v => new Date(v.data).getDate() <= agora.getDate());
  const vHoje = vendasValidas().filter(v => chaveDia(v.data) === hoje);
  const ontem = new Date(agora); ontem.setDate(ontem.getDate() - 1);
  const minAgora = agora.getHours() * 60 + agora.getMinutes();
  const vOntemAteAgora = vendasValidas().filter(v => { const d = new Date(v.data); return chaveDia(d) === chaveDia(ontem) && d.getHours() * 60 + d.getMinutes() <= minAgora; });
  const m = calcMeta(metaDoMes(), vm, vHoje);
  const fat = m.fat, fatA = somaTotal(va), custo = vm.reduce((s, v) => s + custoVenda(v), 0);
  const pct = (a, b) => b ? (a / b - 1) * 100 : 0;
  // séries dos últimos 7 dias
  const ult7 = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const k = chaveDia(d); const vs = vendasValidas().filter(v => chaveDia(v.data) === k); return { f: somaTotal(vs), n: vs.length, l: vs.reduce((s, v) => s + v.total - custoVenda(v), 0) }; });
  const ticket = vm.length ? fat / vm.length : 0, ticketA = va.length ? fatA / va.length : 0;
  const vc = perfil().verCusto;
  // alertas
  const baixos = S.produtos.filter(p => p.estoque <= p.minimo).sort((a, b) => a.estoque - b.estoque);
  const vendidos30 = new Set(vendasValidas().filter(v => (agora - new Date(v.data)) < 30 * 864e5).flatMap(v => v.itens.map(i => i.id)));
  const parados = S.produtos.filter(p => !vendidos30.has(p.id) && p.estoque > 0);
  const vencendo = S.produtos.filter(p => mesesAte(p.validade) <= 3).sort((a, b) => (a.validade || '').localeCompare(b.validade || ''));
  const aniver = S.clientes.filter(c => +c.nasc.slice(5, 7) === mes + 1).sort((a, b) => a.nasc.slice(8).localeCompare(b.nasc.slice(8)));
  const em7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const contas = pode('financeiro') ? S.contas.filter(c => c.tipo === 'pagar' && !c.pago && c.vencimento <= em7).sort((a, b) => a.vencimento.localeCompare(b.vencimento)) : [];
  const pend = pode('usuarios') ? USUARIOS.filter(u => u.status === 'pendente') : [];
  const h = agora.getHours(), saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const dataLonga = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  $('#tela').innerHTML = `
  ${head(`${saud}, <em>${esc(S.usuario.nome.split(' ')[0])}</em>`, `${dataLonga[0].toUpperCase() + dataLonga.slice(1)} · o que está acontecendo na loja e o que precisa de você`, `<a class="btn" href="#caixa">${ic('scan-barcode', 'sm')}Ir para o caixa</a>`)}
  ${htmlAgora(m)}
  <div class="grid painel-topo">
    ${htmlMeta(m, 'Meta do mês', pode('configuracoes'))}
    <div class="grid kpis-2">
      ${kpiSpark({ icone: 'shopping-bag', rotulo: 'Vendas hoje', valor: m.fatHoje, foot: `${delta(pct(m.fatHoje, somaTotal(vOntemAteAgora)))} ${vHoje.length} venda${vHoje.length === 1 ? '' : 's'} · vs ontem até esta hora`, serie: ult7.map(x => x.f), href: pode('vendas') ? '#vendas' : '', onclick: "filtroV.periodo='1'" })}
      ${kpiSpark({ icone: 'trending-up', tom: 'terra', rotulo: 'Faturamento do mês', valor: fat, foot: `${delta(pct(fat, fatA))} vs mesmo período do mês passado`, serie: ult7.map(x => x.f), href: pode('relatorios') ? '#relatorios' : '' })}
      ${kpiSpark({ icone: 'receipt', rotulo: 'Ticket médio', valor: ticket, foot: `${delta(pct(ticket, ticketA))} ${vm.length} vendas no mês`, serie: ult7.map(x => x.n ? x.f / x.n : 0), href: pode('relatorios') ? '#relatorios' : '' })}
      ${vc ? kpiSpark({ icone: 'piggy-bank', tom: 'ok', rotulo: 'Lucro bruto do mês', valor: fat - custo, foot: `Margem de ${fat ? ((1 - custo / fat) * 100).toFixed(0) : 0}% sobre as vendas`, serie: ult7.map(x => x.l), href: pode('relatorios') ? '#relatorios' : '' })
        : kpiSpark({ icone: 'users', tom: 'ok', rotulo: 'Clientes atendidas no mês', valor: new Set(vm.map(v => v.cliente).filter(Boolean)).size, fmt: 'int', foot: 'com cadastro', serie: ult7.map(x => x.n) })}
    </div>
  </div>
  <div class="grid cols-2-1">
    <div class="card"><div class="card-head grafico-head"><div><h3>${ic('chart-column', 'sm')}Faturamento por dia</h3><p class="graf-resumo" id="gResumo"></p></div>
      <div class="seg mini" id="segDias" role="group" aria-label="Período">${[7, 30, 90].map(n => `<button type="button" data-n="${n}" class="${painelDias === n ? 'sel' : ''}" aria-pressed="${painelDias === n}" onclick="mudarPeriodoPainel(${n})">${n} dias</button>`).join('')}</div></div>
      <div style="height:280px"><canvas id="gDias" aria-label="Gráfico de faturamento por dia. Clique numa barra para ver as vendas do dia." role="img"></canvas></div>
      <div class="legenda" aria-hidden="true"><span><i class="lg-barra"></i>Este período</span><span><i class="lg-linha"></i>Período anterior</span><span><i class="lg-fds"></i>Fim de semana</span><span><i class="lg-hoje"></i>Hoje</span><span class="muted">Clique numa barra para ver as vendas do dia</span></div>
    </div>
    <div class="card">${htmlCategorias(vm)}</div>
  </div>
  <div class="grid cols-2-1">
    <div class="card" id="cardRank">${htmlRanking(vm)}</div>
    <div class="card"><div class="card-head"><h3>${ic('bell', 'sm')}Precisa de atenção</h3></div>${htmlAtencao(baixos, vencendo, parados, aniver, contas, pend)}</div>
  </div>
  <div class="grid cols-2-1">
    <div class="card">${htmlHorarios()}</div>
    <div class="card">${htmlPagamentos(vm)}</div>
  </div>
  <div class="card flush">${htmlVendedoras(vm)}</div>`;
  desenharGraficoPainel();
  animarNumeros($('#tela'));
};

// ----- Painel da vendedora: só as vendas dela, sem custos -----
function painelVendedora() {
  const eu = S.usuario.nome, agora = new Date(), hoje = chaveDia(agora);
  const minhas = vendasValidas().filter(v => v.vendedor === eu);
  const vm = vendasDoMes(agora.getFullYear(), agora.getMonth(), v => v.vendedor === eu);
  const vHoje = minhas.filter(v => chaveDia(v.data) === hoje);
  const m = calcMeta(metaDaVendedora(), vm, vHoje);
  const ult7 = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const k = chaveDia(d); const vs = minhas.filter(v => chaveDia(v.data) === k); return { f: somaTotal(vs), n: vs.length }; });
  const itens = vm.reduce((s, v) => s + v.itens.reduce((a, i) => a + i.qtd, 0), 0);
  const recentes = [...minhas].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8);
  const diaHoje = agora.getDate();
  const aniver = S.clientes.filter(c => +c.nasc.slice(5, 7) === agora.getMonth() + 1).sort((a, b) => a.nasc.slice(8).localeCompare(b.nasc.slice(8)));
  const baixos = S.produtos.filter(p => p.estoque <= p.minimo).sort((a, b) => a.estoque - b.estoque);
  const h = agora.getHours(), saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  $('#tela').innerHTML = `
  ${head(`${saud}, <em>${esc(eu.split(' ')[0])}</em>`, 'Suas vendas de hoje e do mês', `<a class="btn" href="#caixa">${ic('scan-barcode', 'sm')}Ir para o caixa</a>`)}
  ${htmlAgora(m, minhas)}
  <div class="grid painel-topo">
    ${htmlMeta(m, 'Sua meta do mês', false)}
    <div class="grid kpis-2">
      ${kpiSpark({ icone: 'shopping-bag', rotulo: 'Suas vendas hoje', valor: m.fatHoje, foot: `${vHoje.length} venda${vHoje.length === 1 ? '' : 's'}`, serie: ult7.map(x => x.f), href: '#vendas', onclick: "filtroV.periodo='1'" })}
      ${kpiSpark({ icone: 'trending-up', tom: 'terra', rotulo: 'Seu mês', valor: m.fat, foot: `${vm.length} vendas`, serie: ult7.map(x => x.f), href: '#vendas', onclick: "filtroV.periodo='30'" })}
      ${kpiSpark({ icone: 'receipt', rotulo: 'Seu ticket médio', valor: vm.length ? m.fat / vm.length : 0, foot: 'no mês', serie: ult7.map(x => x.n ? x.f / x.n : 0) })}
      ${kpiSpark({ icone: 'package', tom: 'ok', rotulo: 'Itens por venda', valor: vm.length ? itens / vm.length : 0, fmt: 'dec', foot: 'média do mês', serie: ult7.map(x => x.n) })}
    </div>
  </div>
  <div class="grid cols-2-1">
    <div class="card"><div class="card-head"><h3>${ic('history', 'sm')}Suas últimas vendas</h3><a class="btn ghost sm" href="#vendas">Ver todas ${ic('arrow-right', 'sm')}</a></div>
      ${recentes.length ? `<div class="list">${recentes.map(v => `<button class="list-item clicavel" onclick="verVenda(${v.id})"><span class="hora">${haQuanto(v.data)}</span><span class="tx"><b>${v.itens.map(i => esc(i.nome)).join(', ')}</b><small>${esc(S.clientes.find(c => c.id === v.cliente)?.nome || 'Consumidor final')} · ${v.pagamentos.map(p => p.forma).join(' + ')}</small></span><b class="num">${brl(v.total)}</b></button>`).join('')}</div>`
        : `<div class="empty" style="padding:32px 10px"><div class="ring">${ic('receipt', 'xl')}</div><b>Nenhuma venda ainda</b>Suas vendas aparecem aqui.<div class="empty-acoes"><a class="btn" href="#caixa">${ic('scan-barcode', 'sm')}Fazer uma venda</a></div></div>`}</div>
    <div class="card"><div class="card-head"><h3>${ic('bell', 'sm')}Lembretes</h3></div>${htmlAtencao(baixos, [], [], aniver, [], [])}</div>
  </div>`;
  animarNumeros($('#tela'));
}
