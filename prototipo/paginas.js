// Páginas trazidas do estoque-pdv: vendas, movimentações, compras, fornecedores,
// relatórios, configurações, login com aprovação e usuários.
const dataHora = d => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const MOTIVOS_AJUSTE = ['Avaria / quebrado', 'Produto vencido', 'Amostra / uso interno', 'Inventário', 'Devolução de cliente', 'Devolução ao fornecedor', 'Outro'];

// ===== Ajuste de estoque com motivo =====
function ajustarEstoque(id) {
  const p = S.produtos.find(x => x.id === id);
  abrirModal(`<div class="modal-head">${thumb(p.categoria)}<div><h2>Ajustar estoque</h2><p>${esc(p.nome)}${p.variacao ? ' · ' + esc(p.variacao) : ''} · hoje: <b>${p.estoque}</b></p></div></div>
  <form id="faj" class="form-grid" onsubmit="return false">
    <label class="field">Tipo<select class="campo" name="tipo"><option value="saida">Saída (tirar do estoque)</option><option value="entrada">Entrada (somar)</option><option value="definir">Definir quantidade exata</option></select></label>
    <label class="field">Quantidade<input name="qtd" type="number" min="0" step="1" value="1" required></label>
    <label class="field full">Motivo<select class="campo" name="motivo">${MOTIVOS_AJUSTE.map(m => `<option>${m}</option>`).join('')}</select></label>
    <label class="field full">Observação<input name="obs" placeholder="Opcional"></label>
  </form>
  <div class="acoes"><button class="btn sec" onclick="fecharModal()">Cancelar</button><button class="btn" onclick="salvarAjuste(${id})">${ic('check', 'sm')}Confirmar ajuste</button></div>`, true);
}
async function salvarAjuste(id) {
  const p = S.produtos.find(x => x.id === id), d = Object.fromEntries(new FormData($('#faj'))), q = Math.max(0, Math.round(+d.qtd || 0));
  const novo = d.tipo === 'entrada' ? p.estoque + q : d.tipo === 'saida' ? p.estoque - q : q;
  if (novo < 0) return toast('O estoque ficaria negativo', true);
  if (novo === p.estoque) return toast('Nada mudou', true);
  const motivo = d.motivo + (d.obs ? ' · ' + d.obs : '');
  await persistir('estoque.ajustar', { tipo: 'Ajuste', motivo, itens: [{ id, qtd: novo, modo: 'definir' }] });
  const dif = novo - p.estoque; p.estoque = novo;
  registrarMov(p, 'Ajuste', dif, motivo);
  fecharModal(); toast('Estoque ajustado'); render();
}

// ===== VENDAS =====
let filtroV = { periodo: '7', forma: '', status: '', busca: '' }, limiteV = 50;
const abasCompras = sel => abasRota([['compras', 'shopping-cart', 'Compras'], ['fornecedores', 'truck', 'Fornecedores']], sel);
TELAS.vendas = () => {
  const ini = new Date(); ini.setHours(0, 0, 0, 0); ini.setDate(ini.getDate() - (+filtroV.periodo - 1));
  const souVend = S.usuario.perfil === 'vendedora';
  const lista = S.vendas.filter(v => new Date(v.data) >= ini && (!filtroV.forma || v.pagamentos.some(p => p.forma === filtroV.forma)) && (!filtroV.status || (filtroV.status === 'cancelada') === !!v.cancelada)
    && (!souVend || v.vendedor === S.usuario.nome)
    && (!filtroV.busca || ('#' + v.id + ' ' + (S.clientes.find(c => c.id === v.cliente)?.nome || '') + ' ' + v.itens.map(i => i.nome).join(' ')).toLowerCase().includes(filtroV.busca.toLowerCase())))
    .sort((a, b) => b.data.localeCompare(a.data));
  const val = lista.filter(v => !v.cancelada), tot = val.reduce((s, v) => s + v.total, 0);
  $('#tela').innerHTML = `
  ${head('Vendas', `${val.length} vendas concluídas · ${brl(tot)}${souVend ? ' · só as suas' : ''}`)}
  <div class="card flush">
    <div class="toolbar">
      <div class="input-ico">${ic('search', 'sm')}<input id="vBusca" placeholder="Buscar por nº, cliente ou produto" value="${esc(filtroV.busca)}"></div>
      <select class="campo" id="vPer">${[['1', 'Hoje'], ['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['60', 'Últimos 60 dias']].map(([k, n]) => `<option value="${k}" ${filtroV.periodo === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <select class="campo" id="vForma"><option value="">Todas as formas</option>${PAGAMENTOS.map(([p]) => `<option ${filtroV.forma === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
      <select class="campo" id="vStatus"><option value="">Todas</option><option value="concluida" ${filtroV.status === 'concluida' ? 'selected' : ''}>Concluídas</option><option value="cancelada" ${filtroV.status === 'cancelada' ? 'selected' : ''}>Canceladas</option></select>
    </div>
    <div class="tbl-wrap">${lista.length ? `<table><thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th>Itens</th><th>Pagamento</th><th>Vendedora</th><th class="num">Total</th><th>Status</th><th></th></tr></thead><tbody>
    ${lista.slice(0, limiteV).map(v => `<tr class="${v.cancelada ? 'riscada' : ''}"><td><b>#${v.id}</b></td><td class="muted">${dataHora(v.data)}</td><td>${esc(S.clientes.find(c => c.id === v.cliente)?.nome || '—')}</td><td>${v.itens.reduce((s, i) => s + i.qtd, 0)}</td><td>${v.pagamentos.map(p => p.forma).join(' + ')}</td><td>${esc(v.vendedor)}</td><td class="num"><b>${brl(v.total)}</b></td>
      <td>${v.cancelada ? '<span class="pill bad">Cancelada</span>' : '<span class="pill ok">Concluída</span>'}</td><td><div class="row-actions"><button class="icon-btn" title="Detalhes" onclick="verVenda(${v.id})">${ic('eye', 'sm')}</button><button class="icon-btn" title="Reimprimir cupom" onclick="imprimirCupom(${v.id})">${ic('printer', 'sm')}</button></div></td></tr>`).join('')}
    </tbody></table>${lista.length > limiteV ? `<div class="mais"><button class="btn sec" onclick="limiteV+=50;TELAS.vendas()">Carregar mais ${Math.min(50, lista.length - limiteV)}</button><small class="muted">Mostrando ${limiteV} de ${lista.length}</small></div>` : ''}` : `<div class="empty"><div class="ring">${ic('receipt', 'xl')}</div><b>Nenhuma venda encontrada</b>Nenhuma venda nesse período ou com esses filtros.<div class="empty-acoes"><button class="btn sec" onclick="filtroV={periodo:'30',forma:'',status:'',busca:''};TELAS.vendas()">${ic('x', 'sm')}Limpar filtros</button><a class="btn" href="#caixa">${ic('scan-barcode', 'sm')}Ir para o caixa</a></div></div>`}</div>
  </div>`;
  $('#vBusca').addEventListener('input', e => { filtroV.busca = e.target.value; clearTimeout(window._vb); window._vb = setTimeout(() => { TELAS.vendas(); const i = $('#vBusca'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); });
  [['#vPer', 'periodo'], ['#vForma', 'forma'], ['#vStatus', 'status']].forEach(([s, k]) => $(s).addEventListener('change', e => { filtroV[k] = e.target.value; TELAS.vendas(); }));
};
function verVenda(id) {
  const v = S.vendas.find(x => x.id === id), cli = S.clientes.find(c => c.id === v.cliente);
  const sub = v.itens.reduce((s, i) => s + i.preco * i.qtd, 0);
  abrirModal(`<div class="modal-head"><span class="ico-chip ${v.cancelada ? 'bad' : 'ok'}">${ic(v.cancelada ? 'ban' : 'receipt', 'lg')}</span><div><h2>Venda #${v.id}</h2><p>${dataHora(v.data)} · ${esc(v.vendedor)}${cli ? ' · ' + esc(cli.nome) : ''} · ${v.nfce ? 'NFC-e ' + v.nfce : 'sem NFC-e'}</p></div></div>
  ${v.cancelada ? `<div class="aviso bad">${ic('ban', 'sm')}<span>Cancelada em ${dataHora(v.cancelada.data)} por ${esc(v.cancelada.usuario)}: “${esc(v.cancelada.motivo)}”. Itens devolvidos ao estoque e NFC-e cancelada na SEFAZ.</span></div>` : ''}
  <table><thead><tr><th>Produto</th><th class="num">Qtd</th><th class="num">Unit.</th><th class="num">Total</th></tr></thead><tbody>${v.itens.map(i => `<tr><td>${esc(i.nome)}</td><td class="num">${i.qtd}</td><td class="num">${brl(i.preco)}</td><td class="num">${brl(i.preco * i.qtd)}</td></tr>`).join('')}</tbody></table>
  <div style="margin-top:12px">
    <div class="sum-line"><span>Subtotal</span><span>${brl(sub)}</span></div>${v.desconto ? `<div class="sum-line"><span>Desconto</span><span>−${brl(v.desconto)}</span></div>` : ''}
    <div class="sum-line"><b>Total</b><b>${brl(v.total)}</b></div>
    ${v.pagamentos.map(p => `<div class="sum-line"><span>${p.forma}</span><span>${brl(p.valor)}</span></div>`).join('')}${v.troco ? `<div class="sum-line"><span>Troco</span><span>${brl(v.troco)}</span></div>` : ''}
  </div>
  <div class="acoes">${!v.cancelada && perfil().cancelar ? `<button class="btn danger" onclick="cancelarVendaFeita(${v.id})">${ic('ban', 'sm')}Cancelar venda</button>` : ''}<button class="btn sec" onclick="mostrarCupom(S.vendas.find(x=>x.id===${v.id}))">${ic('file-text', 'sm')}Ver cupom</button><button class="btn sec" onclick="imprimirCupom(${v.id})">${ic('printer', 'sm')}Reimprimir</button><button class="btn" onclick="fecharModal()">Fechar</button></div>`);
}
function cancelarVendaFeita(id) {
  const v = S.vendas.find(x => x.id === id);
  const min = (Date.now() - new Date(v.data)) / 6e4;
  abrirModal(`<div class="modal-head"><span class="ico-chip bad">${ic('ban', 'lg')}</span><div><h2>Cancelar venda #${v.id}?</h2><p>Os itens voltam para o estoque${v.nfce ? ' e a NFC-e é cancelada na SEFAZ' : ''}.</p></div></div>
  ${v.nfce && min > 30 ? `<div class="aviso warn">${ic('triangle-alert', 'sm')}<span>Esta venda tem mais de 30 minutos. Em SP o cancelamento da NFC-e é limitado a esse prazo; depois disso o caminho é uma nota de devolução (o contador orienta).</span></div>` : ''}
  <label class="field">Motivo do cancelamento<input id="motCanc" placeholder="Ex.: cliente desistiu, produto errado" required></label>
  <div class="acoes"><button class="btn sec" onclick="verVenda(${id})">Voltar</button><button class="btn danger" onclick="confirmarCancelamento(${id})">${ic('ban', 'sm')}Confirmar cancelamento</button></div>`, true);
  setTimeout(() => $('#motCanc').focus(), 50);
}
async function confirmarCancelamento(id) {
  const m = $('#motCanc').value.trim();
  if (m.length < 5) return toast('Escreva o motivo (mínimo 5 letras)', true);
  const v = S.vendas.find(x => x.id === id);
  const srv = await persistir('venda.cancelar', { id, motivo: m });
  v.itens.forEach(i => { const p = S.produtos.find(x => x.id === i.id); if (p) { p.estoque += i.qtd; registrarMov(p, 'Cancelamento', i.qtd, 'Venda #' + v.id + ' cancelada'); } });
  v.cancelada = srv ? srv.venda.cancelada : { motivo: m, data: new Date().toISOString(), usuario: S.usuario.nome };
  fecharModal(); toast('Venda cancelada e estoque devolvido'); render();
}

// ===== MOVIMENTAÇÕES =====
let filtroM = { tipo: '', busca: '' }, limiteM = 50;
TELAS.movimentacoes = () => {
  const tipos = ['Venda', 'Entrada', 'Compra', 'Ajuste', 'Cancelamento'];
  const lista = S.movs.filter(m => (!filtroM.tipo || m.tipo === filtroM.tipo) && (!filtroM.busca || (m.produto + ' ' + m.motivo).toLowerCase().includes(filtroM.busca.toLowerCase())));
  const cor = { Venda: 'rose', Entrada: 'ok', Compra: 'ok', Ajuste: 'warn', Cancelamento: 'bad' };
  $('#tela').innerHTML = `
  ${head('Estoque', 'Histórico de todas as entradas e saídas: quem, quando e por quê')}
  ${segEstoque('movs')}
  <div class="card flush">
    <div class="toolbar"><div class="input-ico">${ic('search', 'sm')}<input id="mBusca" placeholder="Buscar produto ou motivo e Enter" aria-label="Buscar produto ou motivo" value="${esc(filtroM.busca)}"></div>
      <select class="campo" id="mTipo"><option value="">Todos os tipos</option>${tipos.map(t => `<option ${filtroM.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="tbl-wrap">${lista.length ? `<table><thead><tr><th>Quando</th><th>Produto</th><th>Tipo</th><th>Motivo</th><th class="num">Qtd</th><th class="num">Saldo</th><th>Por</th></tr></thead><tbody>
      ${lista.slice(0, limiteM).map(m => `<tr><td class="muted">${dataHora(m.data)}</td><td><div class="prod" style="min-width:0">${thumb(m.categoria, true)}<b>${esc(m.produto)}</b></div></td><td><span class="pill plain ${cor[m.tipo] || ''}">${m.tipo}</span></td><td>${esc(m.motivo) || '—'}</td><td class="num"><b style="color:${m.qtd < 0 ? 'var(--bad)' : 'var(--ok)'}">${m.qtd > 0 ? '+' : ''}${m.qtd}</b></td><td class="num">${m.saldo ?? '—'}</td><td>${esc(m.usuario)}</td></tr>`).join('')}
      </tbody></table>${lista.length > limiteM ? `<div style="text-align:center;padding:14px"><button class="btn sec" onclick="limiteM+=50;TELAS.movimentacoes()">Carregar mais</button></div>` : ''}`
      : `<div class="empty"><div class="ring">${ic('history', 'xl')}</div><b>Sem movimentações</b>Vendas, compras e ajustes de estoque aparecem aqui com quem fez e por quê.${filtroM.tipo || filtroM.busca ? `<div class="empty-acoes"><button class="btn sec" onclick="filtroM={tipo:'',busca:''};TELAS.movimentacoes()">${ic('x', 'sm')}Limpar filtros</button></div>` : ''}</div>`}</div>
  </div>`;
  $('#mBusca').addEventListener('change', e => { filtroM.busca = e.target.value; TELAS.movimentacoes(); });
  $('#mTipo').addEventListener('change', e => { filtroM.tipo = e.target.value; TELAS.movimentacoes(); });
};

// ===== FORNECEDORES =====
TELAS.fornecedores = () => {
  $('#tela').innerHTML = `
  ${head('Compras', `${S.fornecedores.length} fornecedores cadastrados`, `<button class="btn" onclick="formFornecedor()">${ic('plus', 'sm')}Novo fornecedor</button>`)}
  ${abasCompras('fornecedores')}
  <div class="card flush tbl-wrap"><table><thead><tr><th>Fornecedor</th><th>CNPJ</th><th>Contato</th><th>Telefone</th><th class="num">Compras</th><th class="num">Total comprado</th><th></th></tr></thead><tbody>
  ${S.fornecedores.map(f => { const cs = S.compras.filter(c => c.fornecedor === f.id); return `<tr><td><div class="prod" style="min-width:0"><span class="ico-chip" style="width:34px;height:34px">${ic('truck', 'sm')}</span><span><b>${esc(f.nome)}</b><small>${esc(f.email || '')}</small></span></div></td><td class="code">${esc(f.cnpj)}</td><td>${esc(f.contato || '—')}</td><td>${esc(f.fone || '—')}</td><td class="num">${cs.length}</td><td class="num">${brl(cs.reduce((s, c) => s + c.total, 0))}</td><td><div class="row-actions"><button class="icon-btn" title="Editar" onclick="formFornecedor(${f.id})">${ic('pencil', 'sm')}</button></div></td></tr>`; }).join('')}
  </tbody></table></div>`;
};
function formFornecedor(id) {
  const f = id ? S.fornecedores.find(x => x.id === id) : { nome: '', cnpj: '', fone: '', contato: '', email: '' };
  abrirModal(`<div class="modal-head"><span class="ico-chip">${ic('truck', 'lg')}</span><div><h2>${id ? 'Editar fornecedor' : 'Novo fornecedor'}</h2></div></div>
  <form id="ff" class="form-grid" onsubmit="return false"><label class="field full">CNPJ<input name="cnpj" value="${esc(f.cnpj)}" inputmode="numeric" placeholder="00.000.000/0000-00"><small class="muted" id="cnpjInfo">Digite o CNPJ para preencher os dados da Receita</small></label><label class="field full">Nome<input name="nome" value="${esc(f.nome)}" required></label><label class="field">Telefone<input name="fone" value="${esc(f.fone)}"></label><label class="field">Contato<input name="contato" value="${esc(f.contato)}"></label><label class="field">E-mail<input name="email" value="${esc(f.email)}"></label></form>
  <div class="acoes"><button class="btn sec" onclick="fecharModal()">Cancelar</button><button class="btn" onclick="salvarFornecedor(${id || 0})">${ic('check', 'sm')}Salvar</button></div>`, true);
  const cnpj = $('#ff [name=cnpj]');
  cnpj.addEventListener('input', () => { if (cnpj.value.replace(/\D/g, '').length === 14) buscarCnpj(id || 0); });
  setTimeout(() => (id ? $('#ff [name=nome]') : cnpj).focus(), 60);
}
// Consulta o CNPJ na BrasilAPI (gratuita, dados públicos da Receita) e preenche os campos vazios
let cnpjBuscando = '';
async function buscarCnpj(idAtual) {
  const f = $('#ff'), info = $('#cnpjInfo'), dig = f.cnpj.value.replace(/\D/g, '');
  if (cnpjBuscando === dig) return; cnpjBuscando = dig;
  const dup = S.fornecedores.find(x => (x.cnpj || '').replace(/\D/g, '') === dig && x.id !== idAtual);
  if (dup) { info.className = 'erro-campo'; info.textContent = 'Já cadastrado: ' + dup.nome; cnpjBuscando = ''; return; }
  info.className = 'muted'; info.textContent = 'Buscando na Receita…';
  try {
    const r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + dig);
    if (!$('#ff') || f.cnpj.value.replace(/\D/g, '') !== dig) return; // modal fechado ou CNPJ mudou
    if (r.status === 404 || r.status === 400) { info.className = 'erro-campo'; info.textContent = 'CNPJ não encontrado na Receita. Confira os números.'; return; }
    if (!r.ok) throw 0;
    const d = await r.json();
    const preencher = (nome, v) => { const el = f[nome]; if (el && v && !el.value.trim()) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
    preencher('nome', d.nome_fantasia || d.razao_social);
    preencher('fone', d.ddd_telefone_1 ? MASCARAS.fone(d.ddd_telefone_1) : '');
    preencher('email', (d.email || '').toLowerCase());
    const sit = d.descricao_situacao_cadastral || '';
    info.className = sit && sit !== 'ATIVA' ? 'erro-campo' : 'muted';
    info.textContent = `${d.razao_social}${sit ? ' · ' + sit.toLowerCase() : ''}${d.municipio ? ' · ' + d.municipio + '/' + d.uf : ''}`;
  } catch { info.className = 'muted'; info.textContent = 'Não deu para consultar agora (sem internet?). Preencha à mão.'; }
  finally { cnpjBuscando = ''; }
}
async function salvarFornecedor(id) {
  const d = Object.fromEntries(new FormData($('#ff')));
  if (!d.nome.trim()) return toast('Informe o nome', true);
  if (real()) Object.assign(d, (await persistir('fornecedor.salvar', { ...d, id })).fornecedor);
  if (id) Object.assign(S.fornecedores.find(f => f.id === id), d); else { if (!real()) d.id = proximoId(S.fornecedores); S.fornecedores.push(d); }
  fecharModal(); toast('Fornecedor salvo'); render();
}

// ===== COMPRAS =====
TELAS.compras = () => {
  const lista = [...S.compras].sort((a, b) => b.data.localeCompare(a.data));
  $('#tela').innerHTML = `
  ${head('Compras', 'Entrada de mercadorias de fornecedores: soma no estoque e atualiza o custo', `<button class="btn" onclick="novaCompra()">${ic('plus', 'sm')}Nova compra</button>`)}
  ${abasCompras('compras')}
  <div class="card flush tbl-wrap">${lista.length ? `<table><thead><tr><th>Nº</th><th>Data</th><th>Fornecedor</th><th>Nota</th><th class="num">Itens</th><th class="num">Total</th><th>Por</th><th></th></tr></thead><tbody>
  ${lista.map(c => `<tr><td><b>#${c.id}</b></td><td class="muted">${dataHora(c.data)}</td><td>${esc(S.fornecedores.find(f => f.id === c.fornecedor)?.nome || '—')}</td><td>${esc(c.nota || '—')}</td><td class="num">${c.itens.reduce((s, i) => s + i.qtd, 0)}</td><td class="num"><b>${brl(c.total)}</b></td><td>${esc(c.usuario)}</td><td><div class="row-actions"><button class="icon-btn" title="Detalhes" onclick="verCompra(${c.id})">${ic('eye', 'sm')}</button></div></td></tr>`).join('')}
  </tbody></table>` : `<div class="empty"><div class="ring">${ic('shopping-cart', 'xl')}</div><b>Nenhuma compra registrada</b>Quando chegar mercadoria de um fornecedor, registre aqui: o estoque soma e o custo se atualiza.<div class="empty-acoes"><button class="btn" onclick="novaCompra()">${ic('plus', 'sm')}Registrar primeira compra</button></div></div>`}</div>`;
};
let NC = null;
function novaCompra() { NC = { fornecedor: S.fornecedores[0]?.id || '', nota: '', itens: [], atualizarCusto: true, lancarConta: true, venc: '' }; desenharCompra(); }
function desenharCompra() {
  const tot = NC.itens.reduce((s, i) => s + i.qtd * i.custo, 0);
  const v30 = new Date(); v30.setDate(v30.getDate() + 30);
  abrirModal(`<div class="modal-head"><span class="ico-chip">${ic('shopping-cart', 'lg')}</span><div><h2>Nova compra</h2><p>Bipe ou busque os produtos que chegaram.</p></div></div>
  <div class="form-grid">
    <label class="field">Fornecedor<select class="campo" id="ncF"><option value="">Sem fornecedor</option>${S.fornecedores.map(f => `<option value="${f.id}" ${NC.fornecedor == f.id ? 'selected' : ''}>${esc(f.nome)}</option>`).join('')}</select></label>
    <label class="field">Nº da nota fiscal<input id="ncN" value="${esc(NC.nota)}" placeholder="Ex.: 12345"></label>
    <label class="field full">Adicionar produto<div class="input-ico">${ic('scan-barcode', 'sm')}<input id="ncBusca" placeholder="Bipe o código ou digite o nome e Enter" autocomplete="off"></div></label>
  </div>
  ${NC.itens.length ? `<table style="margin-top:12px"><thead><tr><th>Produto</th><th class="num">Qtd</th><th class="num">Custo unit.</th><th class="num">Subtotal</th><th></th></tr></thead><tbody>
    ${NC.itens.map((i, k) => { const p = S.produtos.find(x => x.id === i.id); return `<tr><td>${esc(p.nome)}${p.variacao ? ' · ' + esc(p.variacao) : ''}<br><small class="muted">custo atual ${brl(p.custo)}</small></td><td class="num"><input class="inp-preco" type="number" min="1" step="1" value="${i.qtd}" onchange="NC.itens[${k}].qtd=Math.max(1,+this.value||1);desenharCompra()"></td><td class="num"><input class="inp-preco" type="text" inputmode="numeric" data-moeda value="${brl(i.custo)}" onchange="NC.itens[${k}].custo=Math.max(0,num(this.value));desenharCompra()"></td><td class="num"><b>${brl(i.qtd * i.custo)}</b></td><td><button class="icon-btn del" onclick="NC.itens.splice(${k},1);desenharCompra()">${ic('x', 'sm')}</button></td></tr>`; }).join('')}
  </tbody></table>` : `<div class="empty" style="padding:24px">Adicione os produtos recebidos.</div>`}
  <div class="sum-total" style="margin-top:8px"><span>Total da compra</span><b>${brl(tot)}</b></div>
  <label class="check"><input type="checkbox" id="ncCusto" ${NC.atualizarCusto ? 'checked' : ''}> Atualizar o preço de custo dos produtos</label>
  <label class="check"><input type="checkbox" id="ncConta" ${NC.lancarConta ? 'checked' : ''}> Lançar em contas a pagar com vencimento em <input id="ncVenc" type="date" value="${NC.venc || v30.toISOString().slice(0, 10)}" style="width:auto;padding:4px 8px"></label>
  <div class="acoes"><button class="btn sec" onclick="fecharModal()">Cancelar</button><button class="btn" ${NC.itens.length ? '' : 'disabled'} onclick="registrarCompra()">${ic('check', 'sm')}Registrar compra</button></div>`);
  $('#ncF').addEventListener('change', e => NC.fornecedor = e.target.value);
  $('#ncN').addEventListener('input', e => NC.nota = e.target.value);
  $('#ncCusto').addEventListener('change', e => NC.atualizarCusto = e.target.checked);
  $('#ncConta').addEventListener('change', e => NC.lancarConta = e.target.checked);
  $('#ncVenc').addEventListener('change', e => NC.venc = e.target.value);
  const b = $('#ncBusca');
  b.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return; e.preventDefault();
    const t = b.value.trim().toLowerCase(); if (!t) return;
    const p = S.produtos.find(x => x.ean === t) || S.produtos.find(x => (x.nome + ' ' + x.variacao).toLowerCase().includes(t));
    if (!p) { beep(false); return toast('Produto não encontrado', true); }
    beep(true);
    const it = NC.itens.find(i => i.id === p.id); if (it) it.qtd++; else NC.itens.push({ id: p.id, qtd: 1, custo: p.custo });
    desenharCompra();
  });
  setTimeout(() => b.focus(), 40);
}
async function registrarCompra() {
  const venc = NC.venc || new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const srv = await persistir('compra.criar', { fornecedor: NC.fornecedor ? +NC.fornecedor : null, nota: NC.nota, itens: NC.itens, atualizarCusto: NC.atualizarCusto, lancarConta: NC.lancarConta, venc });
  const id = srv ? srv.id : Math.max(500, ...S.compras.map(c => c.id)) + 1;
  const total = NC.itens.reduce((s, i) => s + i.qtd * i.custo, 0);
  NC.itens.forEach(i => { const p = S.produtos.find(x => x.id === i.id); p.estoque += i.qtd; if (NC.atualizarCusto) p.custo = i.custo; registrarMov(p, 'Compra', i.qtd, 'Compra #' + id + (NC.nota ? ' · NF ' + NC.nota : '')); });
  S.compras.push({ id, data: new Date().toISOString(), fornecedor: NC.fornecedor ? +NC.fornecedor : null, nota: NC.nota, itens: NC.itens.map(i => ({ ...i })), total, usuario: S.usuario.nome });
  if (srv && srv.conta) S.contas.push(srv.conta);
  else if (NC.lancarConta && !srv) { const f = S.fornecedores.find(x => x.id == NC.fornecedor); S.contas.push({ id: proximoId(S.contas), tipo: 'pagar', descricao: `Compra #${id}${f ? ' · ' + f.nome : ''}${NC.nota ? ' · NF ' + NC.nota : ''}`, valor: Math.round(total * 100) / 100, vencimento: NC.venc || new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), pago: false }); }
  NC = null; fecharModal(); toast('Compra registrada, estoque atualizado'); render();
}
function verCompra(id) {
  const c = S.compras.find(x => x.id === id);
  abrirModal(`<div class="modal-head"><span class="ico-chip">${ic('shopping-cart', 'lg')}</span><div><h2>Compra #${c.id}</h2><p>${dataHora(c.data)} · ${esc(S.fornecedores.find(f => f.id === c.fornecedor)?.nome || 'Sem fornecedor')}${c.nota ? ' · NF ' + esc(c.nota) : ''} · ${esc(c.usuario)}</p></div></div>
  <table><thead><tr><th>Produto</th><th class="num">Qtd</th><th class="num">Custo</th><th class="num">Subtotal</th></tr></thead><tbody>${c.itens.map(i => { const p = S.produtos.find(x => x.id === i.id); return `<tr><td>${esc(p?.nome || '')}</td><td class="num">${i.qtd}</td><td class="num">${brl(i.custo)}</td><td class="num">${brl(i.qtd * i.custo)}</td></tr>`; }).join('')}</tbody></table>
  <div class="sum-total"><span>Total</span><b>${brl(c.total)}</b></div><div class="acoes"><button class="btn" onclick="fecharModal()">Fechar</button></div>`);
}

// ===== RELATÓRIOS =====
let filtroR = { de: '', ate: '' };
TELAS.relatorios = () => {
  const hoje = hojeISO(), d30 = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
  const de = filtroR.de || d30, ate = filtroR.ate || hoje;
  const vs = vendasValidas().filter(v => v.data.slice(0, 10) >= de && v.data.slice(0, 10) <= ate);
  const fat = vs.reduce((s, v) => s + v.total, 0), custo = vs.reduce((s, v) => s + v.itens.reduce((a, i) => a + (i.custo || 0) * i.qtd, 0), 0);
  const desc = vs.reduce((s, v) => s + (v.desconto || 0), 0), canc = S.vendas.filter(v => v.cancelada && v.data.slice(0, 10) >= de && v.data.slice(0, 10) <= ate).length;
  const rank = {}; vs.forEach(v => v.itens.forEach(i => { const r = rank[i.id] = rank[i.id] || { q: 0, f: 0, l: 0 }; r.q += i.qtd; r.f += i.qtd * i.preco; r.l += i.qtd * (i.preco - (i.custo || 0)); }));
  const top = Object.entries(rank).sort((a, b) => b[1].f - a[1].f).slice(0, 10).map(([id, r]) => [S.produtos.find(p => p.id == id), r]);
  const porForma = PAGAMENTOS.map(([p]) => [p, vs.reduce((s, v) => s + v.pagamentos.filter(x => x.forma === p).reduce((a, x) => a + x.valor, 0), 0)]);
  const porCat = CATEGORIAS.map(c => [c, vs.reduce((s, v) => s + v.itens.filter(i => (S.produtos.find(p => p.id === i.id) || {}).categoria === c).reduce((a, i) => a + i.qtd * i.preco, 0), 0)]);
  const estCusto = S.produtos.reduce((s, p) => s + p.custo * Math.max(0, p.estoque), 0), estVenda = S.produtos.reduce((s, p) => s + p.preco * Math.max(0, p.estoque), 0);
  const sem = S.produtos.filter(p => p.estoque <= 0).length;
  window._rel = { vs, top };
  $('#tela').innerHTML = `
  ${head('Relatórios', 'Desempenho de vendas e valor em estoque', `<button class="btn sec" onclick="exportarCSV('vendas')">${ic('download', 'sm')}Vendas (CSV)</button><button class="btn sec" onclick="exportarCSV('produtos')">${ic('download', 'sm')}Estoque (CSV)</button>`)}
  <div class="card periodo"><label class="field">De<input type="date" id="rDe" value="${de}"></label><label class="field">Até<input type="date" id="rAte" value="${ate}"></label>
    <div class="atalhos-per">${[['Hoje', 0], ['7 dias', 6], ['30 dias', 29], ['60 dias', 59]].map(([n, d]) => `<button class="btn ghost" onclick="filtroR={de:new Date(Date.now()-${d}*864e5).toISOString().slice(0,10),ate:hojeISO()};TELAS.relatorios()">${n}</button>`).join('')}</div></div>
  <div class="grid kpis" style="margin-top:16px">
    ${kpi('trending-up', '', 'Faturamento', brl(fat), `${vs.length} vendas${canc ? ` · ${canc} cancelada${canc > 1 ? 's' : ''}` : ''}`)}
    ${kpi('piggy-bank', 'ok', 'Lucro bruto', brl(fat - custo), `Margem de ${fat ? ((1 - custo / fat) * 100).toFixed(0) : 0}%`)}
    ${kpi('receipt', 'terra', 'Ticket médio', brl(vs.length ? fat / vs.length : 0))}
    ${kpi('badge-percent', 'warn', 'Descontos concedidos', brl(desc))}
  </div>
  <div class="grid cols-2-1">
    <div class="card"><div class="card-head"><h3>${ic('chart-column', 'sm')}Vendas por dia</h3></div><div style="height:260px"><canvas id="rDia"></canvas></div></div>
    <div class="card"><div class="card-head"><h3>${ic('credit-card', 'sm')}Por forma de pagamento</h3></div>${porForma.map(([p, v]) => `<div class="sum-line"><span>${p}</span><span class="num">${brl(v)} <small class="muted">${fat ? (v / fat * 100).toFixed(0) : 0}%</small></span></div><div class="bar"><i style="width:${fat ? v / fat * 100 : 0}%"></i></div>`).join('')}</div>
  </div>
  <div class="grid cols-2-1" style="margin-top:16px">
    <div class="card flush"><div class="card-head" style="padding-bottom:14px"><h3>${ic('award', 'sm')}Produtos mais vendidos</h3></div><div class="tbl-wrap"><table><thead><tr><th>Produto</th><th class="num">Qtd</th><th class="num">Faturamento</th><th class="num">Lucro</th></tr></thead><tbody>
      ${top.map(([p, r], i) => `<tr><td><div class="prod" style="min-width:0"><span class="rank ${i < 3 ? 'top' : ''}">${i + 1}</span>${thumb(p.categoria, true)}<b>${esc(p.nome)}</b></div></td><td class="num">${r.q}</td><td class="num">${brl(r.f)}</td><td class="num">${brl(r.l)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Sem dados no período</td></tr>'}</tbody></table></div></div>
    <div class="card"><div class="card-head"><h3>${ic('boxes', 'sm')}Valor em estoque</h3></div>
      <div class="sum-line"><span>A preço de custo</span><b class="num">${brl(estCusto)}</b></div><div class="sum-line"><span>A preço de venda</span><b class="num">${brl(estVenda)}</b></div>
      <div class="sum-line"><span>Lucro potencial</span><b class="num" style="color:var(--ok)">${brl(estVenda - estCusto)}</b></div><div class="sum-line"><span>Itens cadastrados</span><span>${S.produtos.length}</span></div><div class="sum-line"><span>Sem estoque</span><span>${sem}</span></div>
      <div class="card-head" style="margin-top:16px"><h3>${ic('tags', 'sm')}Por categoria</h3></div>${porCat.filter(c => c[1]).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<div class="sum-line"><span>${c}</span><span class="num">${brl(v)}</span></div>`).join('')}</div>
  </div>`;
  ['#rDe', '#rAte'].forEach((s, k) => $(s).addEventListener('change', e => { filtroR[k ? 'ate' : 'de'] = e.target.value; TELAS.relatorios(); }));
  const dias = []; for (let d = new Date(de + 'T12:00'); d <= new Date(ate + 'T12:00'); d.setDate(d.getDate() + 1)) dias.push(d.toISOString().slice(0, 10));
  graficos.push(new Chart($('#rDia'), { type: 'bar', data: { labels: dias.map(d => d.slice(8) + '/' + d.slice(5, 7)), datasets: [{ data: dias.map(d => vs.filter(v => v.data.slice(0, 10) === d).reduce((s, v) => s + v.total, 0)), backgroundColor: '#7d3150', borderRadius: 6, maxBarThickness: 18 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => brl(c.raw) } } }, scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } }, y: { border: { display: false }, grid: { color: '#f3e8e6' }, ticks: { callback: v => 'R$ ' + v } } } } }));
};
function exportarCSV(tipo) {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"', n = v => String(v.toFixed(2)).replace('.', ',');
  let linhas;
  if (tipo === 'vendas') linhas = [['Nº', 'Data', 'Cliente', 'Vendedora', 'Itens', 'Desconto', 'Total', 'Pagamento']].concat(window._rel.vs.map(v => [v.id, dataHora(v.data), S.clientes.find(c => c.id === v.cliente)?.nome || '', v.vendedor, v.itens.reduce((s, i) => s + i.qtd, 0), n(v.desconto || 0), n(v.total), v.pagamentos.map(p => p.forma + ' ' + n(p.valor)).join(' + ')]));
  else linhas = [['Código', 'SKU', 'Produto', 'Variação', 'Categoria', 'Marca', 'Custo', 'Preço', 'Estoque', 'Mínimo', 'Validade']].concat(S.produtos.map(p => [p.ean, p.sku, p.nome, p.variacao, p.categoria, p.marca, n(+p.custo), n(+p.preco), p.estoque, p.minimo, p.validade]));
  const csv = '﻿' + linhas.map(l => l.map(q).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `doze-${tipo}-${hojeISO()}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Planilha baixada');
}

// ===== CONFIGURAÇÕES =====
TELAS.configuracoes = () => {
  const c = S.config;
  $('#tela').innerHTML = `
  ${head('Configurações', 'Dados impressos no cupom e recebimento por Pix')}
  <div class="grid cols-1-1">
    <div class="card"><div class="card-head"><h3>${ic('store', 'sm')}Dados da loja</h3></div>
      <form id="fcfg" class="form-grid" onsubmit="return false">
        <label class="field full">Razão social<input name="nome" value="${esc(c.nome)}"></label><label class="field">CNPJ<input name="cnpj" value="${esc(c.cnpj)}"></label><label class="field">Telefone<input name="fone" value="${esc(c.fone)}"></label>
        <label class="field full">Endereço<input name="endereco" value="${esc(c.endereco)}"></label><label class="field">Cidade<input name="cidade" value="${esc(c.cidade)}"></label><label class="field">UF<input name="uf" value="${esc(c.uf)}" maxlength="2"></label>
        <div class="form-sec">Pix</div>
        <label class="field full">Chave Pix<input name="chavePix" value="${esc(c.chavePix)}" placeholder="CPF, CNPJ, e-mail, telefone ou aleatória"></label><label class="field">Nome do recebedor<input name="nomePix" value="${esc(c.nomePix)}"></label><label class="field">Cidade do recebedor<input name="cidadePix" value="${esc(c.cidadePix)}"></label>
        <div class="form-sec">Cupom</div>
        <label class="field">Largura da impressora<select class="campo" name="largura"><option value="80" ${+c.largura === 80 ? 'selected' : ''}>80 mm</option><option value="58" ${+c.largura === 58 ? 'selected' : ''}>58 mm</option></select></label>
        <label class="field full">Mensagem no rodapé<input name="rodape" value="${esc(c.rodape)}"></label>
        <div class="form-sec">Metas (aparecem no painel)</div>
        <label class="field">Meta de faturamento do mês (R$)<input name="metaMes" type="text" inputmode="numeric" data-moeda value="${brl(metaDoMes())}"></label>
        <label class="field">Meta mensal por vendedora (R$)<input name="metaVendedora" type="text" inputmode="numeric" data-moeda value="${brl(metaDaVendedora())}"></label>
      </form>
      <div class="acoes"><button class="btn" onclick="salvarConfig()">${ic('check', 'sm')}Salvar</button></div></div>
    <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
      <div class="card"><div class="card-head"><h3>${ic('monitor-smartphone', 'sm')}Aplicativo no computador do caixa</h3></div>
        <p class="muted" style="margin:0 0 14px">Instale o sistema como aplicativo: ganha ícone na área de trabalho, abre em tela cheia sem a barra do navegador e avisa quando a internet cai.</p>
        <div id="pwaArea">${htmlInstalar()}</div></div>
      <div class="card"><div class="card-head"><h3>${ic('eye', 'sm')}Prévia do cupom</h3></div><div id="prevCupom"></div></div>
    </div>
  </div>`;
  prevCupom();
  $('#fcfg').addEventListener('input', () => { Object.assign(S.config, Object.fromEntries(new FormData($('#fcfg')))); prevCupom(); });
};
function prevCupom() { const v = vendasValidas().slice(-1)[0]; $('#prevCupom').innerHTML = v ? htmlCupom(v) : ''; }
async function salvarConfig() { const d = Object.fromEntries(new FormData($('#fcfg'))); d.metaMes = num(d.metaMes); d.metaVendedora = num(d.metaVendedora); await persistir('config.salvar', d); Object.assign(S.config, d); toast('Configurações salvas'); }

// ===== LOGIN com e-mail, senha e aprovação =====
let modoLogin = 'entrar';
function telaLogin() {
  $('#app').classList.add('hidden');
  const L = $('#login'); L.classList.remove('hidden');
  const forms = {
    entrar: `<h1>Bem-vinda de volta</h1><p class="sub">Entre com seu e-mail e senha.</p>
      <form id="fl" onsubmit="fazerLogin();return false" class="login-form">
        <label class="field">E-mail<input name="email" type="email" autocomplete="username" placeholder="voce@doze.com" required></label>
        <label class="field">Senha<input name="senha" type="password" autocomplete="current-password" placeholder="Sua senha" required></label>
        <div class="login-links"><label class="check"><input type="checkbox" checked> Lembrar meu e-mail</label><a href="javascript:void 0" onclick="modoLogin='recuperar';telaLogin()">Esqueci a senha</a></div>
        <button class="btn xl">${ic('log-in', 'sm')}Entrar</button>
      </form>
      <p class="muted" style="text-align:center;margin-top:14px">Funcionária nova? <a href="javascript:void 0" onclick="modoLogin='criar';telaLogin()">Criar conta</a></p>
      <div class="note">${ic('info', 'sm')}<span>Contas de apresentação, com dados fictícios (nada é salvo):</span></div>
      <div class="users mini">${USUARIOS.filter(u => u.status === 'ativo').map(u => `<button onclick="entrarDemo(${u.id})"><span class="avatar">${iniciais(u.nome)}</span><span class="tx"><b>${u.nome}</b><small>${PERFIS[u.perfil].nome}</small></span>${ic('chevron-right')}</button>`).join('')}</div>`,
    criar: `<h1>Criar conta</h1><p class="sub">Depois de criar, a administradora precisa liberar seu acesso.</p>
      <form id="fl" onsubmit="criarConta();return false" class="login-form">
        <label class="field">Nome completo<input name="nome" placeholder="Como devemos te chamar" required></label>
        <label class="field">E-mail<input name="email" type="email" placeholder="voce@doze.com" required></label>
        <label class="field">Senha<input name="senha" id="novaSenha" type="password" placeholder="Crie uma senha forte" required></label>
        <div class="forca"><i id="forcaBar"></i></div><small class="muted" id="forcaTx">Força: —</small>
        <label class="field">Confirmar senha<input name="senha2" type="password" placeholder="Repita a senha" required></label>
        <label class="check"><input type="checkbox" name="termos"> Li e aceito os termos de uso e a política de privacidade (LGPD)</label>
        <button class="btn xl">${ic('user-plus', 'sm')}Criar conta</button>
      </form><p class="muted" style="text-align:center;margin-top:14px"><a href="javascript:void 0" onclick="modoLogin='entrar';telaLogin()">Voltar para entrar</a></p>`,
    recuperar: `<h1>Recuperar senha</h1><p class="sub">Enviaremos um link para você criar uma nova senha.</p>
      <form id="fl" onsubmit="toast('Link enviado para o e-mail (simulação)');modoLogin='entrar';telaLogin();return false" class="login-form">
        <label class="field">E-mail<input name="email" type="email" placeholder="voce@doze.com" required></label><button class="btn xl">${ic('mail', 'sm')}Enviar link</button>
      </form><p class="muted" style="text-align:center;margin-top:14px"><a href="javascript:void 0" onclick="modoLogin='entrar';telaLogin()">Voltar para entrar</a></p>`,
    aguardando: `<h1>Aguardando aprovação</h1><p class="sub">Sua conta foi criada. Peça para a administradora liberar seu acesso em <b>Usuários</b>.</p>
      <button class="btn xl" onclick="modoLogin='entrar';telaLogin()">${ic('arrow-left', 'sm')}Voltar</button>`,
  };
  L.innerHTML = `
  <div class="art">
    <svg class="ghost-selo"><use href="#selo"/></svg>
    <small>Sistema de gestão</small>
    <svg class="big"><use href="#selo"/></svg>
    <p>Vendas, estoque e clientes da loja <em>num só lugar</em>.</p>
  </div>
  <div class="form">${forms[modoLogin]}</div>`;
  const ns = $('#novaSenha');
  if (ns) ns.addEventListener('input', () => { const f = forcaSenha(ns.value); $('#forcaBar').style.width = f.p + '%'; $('#forcaBar').style.background = f.cor; $('#forcaTx').textContent = 'Força: ' + f.nome; });
  setTimeout(() => { const i = L.querySelector('input'); i && i.focus(); }, 50);
}
function forcaSenha(s) {
  let p = 0; if (s.length >= 8) p++; if (s.length >= 12) p++; if (/[A-Z]/.test(s) && /[a-z]/.test(s)) p++; if (/\d/.test(s)) p++; if (/[^A-Za-z0-9]/.test(s)) p++;
  return [{ nome: 'muito fraca', cor: 'var(--bad)' }, { nome: 'fraca', cor: 'var(--bad)' }, { nome: 'razoável', cor: 'var(--warn)' }, { nome: 'boa', cor: 'var(--warn)' }, { nome: 'forte', cor: 'var(--ok)' }, { nome: 'muito forte', cor: 'var(--ok)' }].map((x, i) => ({ ...x, p: i * 20 }))[p];
}
// E-mail e senha entram sempre pelo banco (modo real). Os dados fictícios só aparecem nas contas de apresentação.
async function fazerLogin() {
  const d = Object.fromEntries(new FormData($('#fl')));
  let r;
  try { r = await api('auth.login', { email: d.email.trim(), senha: d.senha }); }
  catch (e) { return toast(e.offline ? 'Servidor indisponível. Para conhecer o sistema, use uma conta de apresentação.' : e.message, true); }
  if (r.pendente) { modoLogin = 'aguardando'; return telaLogin(); }
  await entrarReal();
}
async function criarConta() {
  const d = Object.fromEntries(new FormData($('#fl')));
  if (forcaSenha(d.senha).p < 40) return toast('Use uma senha mais forte (8+ caracteres, letras e números)', true);
  if (d.senha !== d.senha2) return toast('As senhas não conferem', true);
  if (!d.termos) return toast('É preciso aceitar os termos', true);
  let r;
  try { r = await api('auth.criar', { nome: d.nome.trim(), email: d.email.trim(), senha: d.senha }); }
  catch (e) { return toast(e.offline ? 'Servidor indisponível. Tente de novo mais tarde.' : e.message, true); }
  // primeira conta do sistema já entra como administradora
  if (r.primeiro) { toast('Conta de administradora criada'); return entrarReal(); }
  modoLogin = 'aguardando'; telaLogin();
}
const _entrarOrig = entrar;
entrar = function (id) { modoLogin = 'entrar'; _entrarOrig(id); };
// Botões de apresentação: sempre com os dados fictícios
function entrarDemo(id) { MODO = 'demo'; entrar(id); }

// ===== USUÁRIOS (com aprovação) =====
const _usuariosMatriz = TELAS.usuarios;
TELAS.usuarios = () => {
  _usuariosMatriz();
  const st = { ativo: ['ok', 'Ativo'], pendente: ['warn', 'Aguardando'], bloqueado: ['bad', 'Bloqueado'] };
  const grid = document.querySelector('.users-grid');
  grid.outerHTML = `<div class="card flush tbl-wrap" style="margin-bottom:16px"><div class="card-head" style="padding-bottom:14px"><h3>${ic('users', 'sm')}Pessoas com acesso</h3><small class="muted">Funcionárias novas se cadastram na tela de login e aparecem aqui para aprovação</small></div>
  <table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th></th></tr></thead><tbody>
  ${USUARIOS.map(u => `<tr><td><div class="prod" style="min-width:0"><span class="avatar">${iniciais(u.nome)}</span><b>${esc(u.nome)}</b>${u.id === S.usuario.id ? ' <span class="pill ok plain">Você</span>' : ''}</div></td><td>${esc(u.email)}</td>
    <td>${u.id === S.usuario.id ? PERFIS[u.perfil].nome : `<select class="campo" onchange="mudarPerfil(${u.id}, this.value)">${Object.entries(PERFIS).map(([k, p]) => `<option value="${k}" ${u.perfil === k ? 'selected' : ''}>${p.nome}</option>`).join('')}</select>`}</td>
    <td><span class="pill ${st[u.status][0]}">${st[u.status][1]}</span></td>
    <td><div class="row-actions">${u.id === S.usuario.id ? '' : u.status === 'ativo' ? `<button class="btn sec" onclick="mudarStatus(${u.id},'bloqueado')">${ic('lock', 'sm')}Bloquear</button>` : `<button class="btn" onclick="mudarStatus(${u.id},'ativo')">${ic('check', 'sm')}Liberar acesso</button>`}</div></td></tr>`).join('')}
  </tbody></table></div>`;
};
async function mudarPerfil(id, perfil) { await persistir('usuario.atualizar', { id, perfil }); USUARIOS.find(x => x.id === id).perfil = perfil; toast('Perfil alterado'); }
async function mudarStatus(id, st) { await persistir('usuario.atualizar', { id, status: st }); USUARIOS.find(u => u.id === id).status = st; toast(st === 'ativo' ? 'Acesso liberado' : 'Acesso bloqueado'); render(); }

// ===== Dados de demonstração extras: compras e movimentações =====
(function semearCompras() {
  const mk = (diasAtras, h) => { const d = new Date(); d.setDate(d.getDate() - diasAtras); d.setHours(h, 20, 0, 0); return d.toISOString(); };
  const compra = (id, dias, forn, nota, eans) => {
    const itens = eans.map(([e, q]) => { const p = S.produtos.find(x => x.ean === e); return { id: p.id, qtd: q, custo: p.custo }; });
    S.compras.push({ id, data: mk(dias, 10), fornecedor: forn, nota, itens, total: itens.reduce((s, i) => s + i.qtd * i.custo, 0), usuario: 'Carla (Dona)' });
    itens.forEach(i => { const p = S.produtos.find(x => x.id === i.id); S.movs.push({ data: mk(dias, 10), produto: p.nome, produtoId: p.id, categoria: p.categoria, tipo: 'Compra', qtd: i.qtd, motivo: `Compra #${id} · NF ${nota}`, usuario: 'Carla (Dona)', saldo: null }); });
  };
  compra(501, 12, 1, '88120', [['7899045600112', 12], ['7899045600129', 8], ['7899045600235', 10]]);
  compra(502, 5, 2, '45521', [['7898944770012', 12], ['7898944770029', 24], ['7898944770036', 6]]);
  S.movs.push({ data: mk(3, 16), produto: 'Água Termal 150ml', produtoId: 15, categoria: 'Skincare', tipo: 'Ajuste', qtd: -1, motivo: 'Avaria / quebrado · frasco caiu', usuario: 'Renata', saldo: 1 });
  S.movs.sort((a, b) => b.data.localeCompare(a.data));
})();

// redesenha a tela atual agora que todas as páginas existem
render();
