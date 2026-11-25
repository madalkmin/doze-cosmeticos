// ===== CAIXA (PDV) =====
TELAS.caixa = () => {
  const t = totais();
  const rapidos = ['7891350034567', '7899045600112', '7896090611009', '7898944770029', '7891033102345', '7891350500011', '3337875597388', '7896006299985'].map(e => S.produtos.find(p => p.ean === e));
  const ep = perfil().editarPreco;
  const up = S.ultimoT && Date.now() - S.ultimoT < 2500 && S.produtos.find(p => p.id === S.ultimo);
  const eco = up ? `<div class="scan-eco" role="status">${ic('circle-check', 'sm')}<b>${esc(up.nome)}</b>${up.variacao ? ` · ${esc(up.variacao)}` : ''}<span>${brl(up.preco)}</span></div>` : '<div class="scan-eco vazio" role="status"></div>';
  const barra = S.caixa
    ? `<div class="card caixa-bar"><span class="cb-info"><span class="pulso"></span><b>Caixa #${S.caixa.id} aberto</b><small class="muted">desde ${new Date(S.caixa.abertoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${esc(S.caixa.operador)}</small></span>
       <span class="cb-acoes"><button class="btn ghost" onclick="movimentoCaixa('suprimento')">${ic('arrow-down-circle', 'sm')}Suprimento</button><button class="btn ghost" onclick="movimentoCaixa('sangria')">${ic('arrow-up-circle', 'sm')}Sangria</button><a class="btn sec" href="#caixas">${ic('lock-keyhole', 'sm')}Fechar caixa</a></span></div>`
    : `<div class="card caixa-bar fechado"><span class="cb-info"><span class="pulso off"></span><b>Caixa fechado.</b><small class="muted">Abra o caixa com o fundo de troco para registrar vendas.</small></span><button class="btn" onclick="abrirCaixa()">${ic('lock-open', 'sm')}Abrir caixa</button></div>`;
  $('#tela').innerHTML = `
  ${head('Caixa', `Operadora: ${S.usuario.nome}`, S.carrinho.length ? `<button class="btn sec" onclick="cancelarVenda()">${ic('x', 'sm')}Cancelar venda</button>` : '')}
  ${abasRota([['caixa', 'scan-barcode', 'Vender'], ['caixas', 'lock-keyhole', 'Abrir/fechar caixa']], 'caixa')}
  ${barra}
  <div class="caixa">
    <div>
      <div class="scan">${ic('scan-barcode', 'lg')}
        <input id="bipe" placeholder="Bipe o produto, ou digite nome ou código e Enter" autocomplete="off">
        <span class="ready"><span class="status-dot ok" aria-hidden="true"></span>Leitor pronto</span></div>
      ${eco}
      <div class="card flush">
        <div class="card-head" style="padding-bottom:14px"><h3>${ic('shopping-bag', 'sm')}Itens da venda</h3><span class="pill rose plain">${t.itens} ${t.itens === 1 ? 'item' : 'itens'}</span></div>
        ${S.carrinho.length ? `<div class="tbl-wrap"><table><thead><tr><th>Produto</th><th class="num">Unitário</th><th style="text-align:center">Qtd</th><th class="num">Total</th><th></th></tr></thead><tbody>
        ${S.carrinho.map((i, k) => `<tr class="cart-row ${i.id === S.ultimo ? 'flash' : ''}"><td><div class="prod">${thumb(i.categoria, true)}<span><b>${esc(i.nome)}</b><small>${i.marca}${i.variacao ? ' · ' + i.variacao : ''} · <span class="code">${i.ean}</span></small></span></div></td>
          <td class="num">${ep ? `<input class="inp-preco" type="text" inputmode="numeric" data-moeda value="${brl(i.preco)}" title="Preço editável pelo administrador" onchange="mudaPreco(${k}, this.value)">` : brl(i.preco)}</td>
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
        <label class="field">Cliente <small class="muted" style="font-weight:400">(F4)</small>
          <select class="campo" id="cliVenda"><option value="">Consumidor final</option>${S.clientes.map(c => `<option value="${c.id}" ${S.clienteVenda == c.id ? 'selected' : ''}>${esc(c.nome)}${c.cpf ? ' · ' + c.cpf : ''}</option>`).join('')}</select></label>
        <button class="btn ghost" style="margin-top:8px;padding:6px 8px" onclick="clienteRapido()">${ic('user-plus', 'sm')}Cadastrar cliente rápido</button>
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:14px">
        <div>
          <div class="sum-line"><span>Subtotal</span><span>${brl(t.sub)}</span></div>
          <div class="sum-line"><span>Desconto</span><input id="desc" type="text" inputmode="numeric" data-moeda placeholder="R$ 0,00" value="${S.desconto ? brl(S.desconto) : ''}" style="width:120px;text-align:right;padding:7px 10px"></div>
          <div class="sum-total"><span>Total</span><b>${brl(t.total)}</b></div>
        </div>
        <button class="btn xl" onclick="finalizarVenda()" ${S.carrinho.length && S.caixa ? '' : 'disabled'}>${ic('receipt')}Finalizar venda <kbd class="kbd-btn">F2</kbd></button>
        ${!S.caixa ? `<small class="muted" style="text-align:center">Abra o caixa para finalizar vendas.</small>` : ''}
        <div class="keys" aria-label="Atalhos do teclado"><span><kbd>Enter</kbd> adicionar</span><span><kbd>F2</kbd> finalizar</span><span><kbd>F3</kbd> buscar produto</span><span><kbd>F4</kbd> cliente</span><span><kbd>Esc</kbd> cancelar</span></div>
      </div>
    </div>
  </div>`;
  const inp = $('#bipe');
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); bipar(inp.value); } });
  $('#desc').addEventListener('change', e => { S.desconto = Math.max(0, num(e.target.value)); TELAS.caixa(); });
  $('#cliVenda').addEventListener('change', e => S.clienteVenda = e.target.value || null);
  focarBipe();
};
function mudaQtd(k, d) {
  const i = S.carrinho[k], p = S.produtos.find(x => x.id === i.id);
  if (d > 0 && i.qtd + 1 > p.estoque) return toast('Estoque insuficiente', true);
  const antes = i.qtd;
  i.qtd += d;
  if (i.qtd <= 0) {
    S.carrinho.splice(k, 1); i.qtd = antes;
    toast(`Removido: ${i.nome}`, false, () => { S.carrinho.splice(Math.min(k, S.carrinho.length), 0, i); if (location.hash === '#caixa') TELAS.caixa(); });
  }
  TELAS.caixa();
}
function mudaPreco(k, v) { S.carrinho[k].preco = Math.max(0, num(v)); TELAS.caixa(); toast('Preço alterado só nesta venda'); }
function clienteRapido() {
  abrirModal(`<div class="modal-head"><span class="ico-chip">${ic('user-plus', 'lg')}</span><div><h2>Cliente rápido</h2><p>Só o essencial. Dá para completar depois em Clientes.</p></div></div>
  <form id="fcr" class="form-grid" onsubmit="return false"><label class="field full">Nome<input name="nome" required></label><label class="field">CPF (nota fiscal)<input name="cpf" placeholder="000.000.000-00"></label><label class="field">WhatsApp<input name="fone" placeholder="(19) 90000-0000"></label></form>
  <div class="acoes"><button class="btn sec" onclick="fecharModal()">Voltar</button><button class="btn" onclick="salvarClienteRapido()">${ic('check', 'sm')}Salvar e usar na venda</button></div>`, true);
  setTimeout(() => $('#fcr [name=nome]').focus(), 60);
}
async function salvarClienteRapido() {
  const d = Object.fromEntries(new FormData($('#fcr')));
  if (!d.nome.trim()) return toast('Informe o nome', true);
  if (real()) Object.assign(d, (await persistir('cliente.salvar', d)).cliente);
  else { d.id = proximoId(S.clientes); d.nasc = '2000-01-01'; }
  S.clientes.push(d);
  S.clienteVenda = d.id; fecharModal(); toast('Cliente cadastrada'); TELAS.caixa();
}

// ===== Pagamento dividido =====
let PG = null;
function finalizarVenda() {
  if (!S.carrinho.length) return;
  if (!S.caixa) { toast('Abra o caixa antes de vender', true); return abrirCaixa(); }
  PG = { pags: [], forma: 'Pix' };
  desenharPagamento();
}
function pgTotais() {
  const r = v => Math.round(v * 100) / 100;
  const total = totais().total, pago = PG.pags.reduce((s, p) => s + p.valor, 0);
  return { total, pago, falta: Math.max(0, r(total - pago)), troco: Math.max(0, r(pago - total)) };
}
function desenharPagamento() {
  const t = pgTotais();
  const pix = PG.pags.filter(p => p.forma === 'Pix').reduce((s, p) => s + p.valor, 0);
  abrirModal(`<div class="modal-head"><span class="ico-chip">${ic('wallet', 'lg')}</span><div><h2>Pagamento</h2><p>Dá para dividir em várias formas, por exemplo parte no Pix e o resto no cartão.</p></div></div>
  <div class="pg-topo"><div><small class="muted">Total</small><b>${brl(t.total)}</b></div>${t.falta > 0 ? `<div style="text-align:right"><small class="muted">Falta</small><b style="color:var(--bad)">${brl(t.falta)}</b></div>` : `<div style="text-align:right"><small class="muted">Troco</small><b style="color:var(--ok)">${brl(t.troco)}</b></div>`}</div>
  ${t.falta > 0 ? `<form id="fpg" onsubmit="addPagamento();return false">
    <div class="pay">${PAGAMENTOS.map(([p, i]) => `<button type="button" class="${PG.forma === p ? 'sel' : ''}" onclick="PG.forma='${p}';desenharPagamento()">${ic(i)}${p}</button>`).join('')}</div>
    <div style="display:flex;gap:8px;margin-top:12px"><input id="pgValor" type="text" inputmode="numeric" data-moeda value="${brl(t.falta)}" style="font-size:18px;height:46px"><button class="btn" style="height:46px">${ic('plus', 'sm')}Adicionar</button></div>
    ${PG.forma === 'Dinheiro' ? `<small class="muted" style="display:block;margin-top:6px">Em dinheiro pode passar do valor: o sistema calcula o troco.</small>` : ''}
  </form>` : ''}
  ${PG.pags.length ? `<div class="list" style="margin-top:12px">${PG.pags.map((p, k) => `<div class="list-item"><span class="ico-chip" style="width:34px;height:34px">${ic(PAGAMENTOS.find(x => x[0] === p.forma)[1], 'sm')}</span><span class="tx"><b>${p.forma}</b></span><b class="num">${brl(p.valor)}</b><button class="icon-btn del" title="Remover" onclick="PG.pags.splice(${k},1);desenharPagamento()">${ic('x', 'sm')}</button></div>`).join('')}</div>` : ''}
  ${pix > 0 ? `<div class="pix-box"><div id="pixQr"></div><div><b>Pix de ${brl(pix)}</b><small class="muted">Peça para a cliente escanear com o app do banco e confirme o recebimento antes de concluir.</small><small class="muted">Chave: ${esc(S.config.chavePix)}</small></div></div>` : ''}
  <div class="acoes"><button class="btn sec" onclick="fecharModal()">Voltar</button><button class="btn sec" ${t.falta > 0 ? 'disabled' : ''} onclick="concluirVenda(false)" title="Registra a venda sem nota fiscal">${ic('circle-check', 'sm')}Concluir sem NFC-e</button><button class="btn" ${t.falta > 0 ? 'disabled' : ''} onclick="concluirVenda()">${ic('receipt', 'sm')}Concluir e emitir NFC-e</button></div>`);
  if (pix > 0) $('#pixQr').innerHTML = qrSvg(gerarPix({ chave: S.config.chavePix, nome: S.config.nomePix, cidade: S.config.cidadePix, valor: pix }));
  const v = $('#pgValor'); if (v) setTimeout(() => { v.focus(); v.select(); }, 40);
}
function addPagamento() {
  const v = Math.round(num($('#pgValor').value) * 100) / 100, t = pgTotais();
  if (v <= 0) return;
  if (PG.forma !== 'Dinheiro' && v > t.falta + 0.001) return toast('Só dinheiro pode passar do valor restante (para gerar troco)', true);
  PG.pags.push({ forma: PG.forma, valor: v }); desenharPagamento();
}
// emitir = false: venda registrada sem NFC-e (comprovante sem valor fiscal)
let concluindo = false; // evita venda dupla com clique duplo enquanto o servidor responde
async function concluirVenda(emitir = true) {
  const t = totais(), pt = pgTotais();
  if (pt.falta > 0 || concluindo) return;
  concluindo = true;
  let venda;
  try {
    const princ = [...PG.pags].sort((a, b) => b.valor - a.valor)[0].forma;
    venda = { data: new Date().toISOString(), itens: S.carrinho.map(i => ({ ...i })), total: t.total, desconto: t.desc, pagamento: princ, pagamentos: PG.pags, troco: pt.troco, cliente: S.clienteVenda ? +S.clienteVenda : null, vendedor: S.usuario.nome, nfce: null, caixa: S.caixa.id };
    // modo real: o servidor grava a venda, baixa o estoque e devolve número e NFC-e
    if (real()) venda = (await persistir('venda.criar', { itens: S.carrinho.map(i => ({ id: i.id, qtd: i.qtd, preco: i.preco })), desconto: t.desc, pagamentos: PG.pags, cliente: venda.cliente, emitir })).venda;
    else { venda.id = proximoId(S.vendas); venda.nfce = emitir ? String(Date.now()).slice(-9) : null; }
  } finally { concluindo = false; }
  S.carrinho.forEach(i => { const p = S.produtos.find(x => x.id === i.id); p.estoque -= i.qtd; registrarMov(p, 'Venda', -i.qtd, 'Venda #' + venda.id); });
  S.vendas.push(venda);
  S.carrinho = []; S.desconto = 0; S.clienteVenda = null; PG = null;
  render();
  mostrarCupom(venda, true);
}

// ===== Pix: BR Code estático com valor (padrão do Banco Central) =====
function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) { crc ^= str.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1; }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}
function gerarPix({ chave, nome, cidade, valor, txid = '***' }) {
  const limpa = (s, n) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, n);
  const f = (id, v) => id + String(v.length).padStart(2, '0') + v;
  const conta = f('00', 'br.gov.bcb.pix') + f('01', chave.trim());
  const corpo = f('00', '01') + f('26', conta) + f('52', '0000') + f('53', '986') + (valor ? f('54', valor.toFixed(2)) : '') + f('58', 'BR') + f('59', limpa(nome, 25) || 'LOJA') + f('60', limpa(cidade, 15) || 'CIDADE') + f('62', f('05', txid)) + '6304';
  return corpo + crc16(corpo);
}
function qrSvg(texto, cel = 4) {
  if (!window.qrcode) return '<small class="muted">QR Code indisponível sem internet</small>';
  const q = qrcode(0, 'M'); q.addData(texto); q.make();
  return q.createSvgTag({ cellSize: cel, margin: 2, scalable: true });
}

// ===== Cupom (DANFE NFC-e simulado) =====
function htmlCupom(v) {
  const c = S.config, cli = S.clientes.find(x => x.id === v.cliente);
  const fiscal = !!v.nfce; // venda concluída sem NFC-e não tem chave nem QR
  const chave = !fiscal ? '' : ('3526' + new Date(v.data).toISOString().slice(2, 7).replace('-', '') + c.cnpj.replace(/\D/g, '') + '65001' + v.nfce.padStart(9, '0') + '1' + String(v.id).padStart(8, '0')).slice(0, 44);
  const pags = v.pagamentos || [{ forma: v.pagamento, valor: v.total }];
  return `<div class="cupom ${+c.largura === 58 ? 'w58' : ''}">
    <div class="c"><b>${esc(c.nome)}</b><br>CNPJ ${esc(c.cnpj)}<br>${esc(c.endereco)}<br>${esc(c.cidade)} · ${esc(c.uf)} · ${esc(c.fone)}</div><hr>
    <div class="c">${fiscal ? 'DANFE NFC-e · Documento Auxiliar da<br>Nota Fiscal de Consumidor Eletrônica' : '<b>COMPROVANTE DE VENDA</b><br>NÃO É DOCUMENTO FISCAL'}</div><hr>
    ${v.itens.map(i => `<div>${esc(i.nome.slice(0, 32))}</div><div class="row"><span>${i.qtd} x ${brl(i.preco)}</span><span>${brl(i.qtd * i.preco)}</span></div>`).join('')}<hr>
    <div class="row"><span>Qtd. itens</span><span>${v.itens.reduce((s, i) => s + i.qtd, 0)}</span></div>
    ${v.desconto ? `<div class="row"><span>Desconto</span><span>-${brl(v.desconto)}</span></div>` : ''}
    <div class="row"><b>VALOR TOTAL</b><b>${brl(v.total)}</b></div>
    <div class="row"><span>FORMA PAGAMENTO</span><span>VALOR PAGO</span></div>
    ${pags.map(p => `<div class="row"><span>${p.forma}</span><span>${brl(p.valor)}</span></div>`).join('')}
    ${v.troco ? `<div class="row"><span>Troco</span><span>${brl(v.troco)}</span></div>` : ''}<hr>
    <div class="c">${cli ? `CONSUMIDOR: ${esc(cli.nome).toUpperCase()}${cli.cpf ? '<br>CPF ' + esc(cli.cpf) : ''}` : 'CONSUMIDOR NÃO IDENTIFICADO'}<br>
    ${fiscal ? '' : `Venda nº ${v.id}<br>${new Date(v.data).toLocaleString('pt-BR')}${v.cancelada ? '<br><b>*** VENDA CANCELADA ***</b>' : ''}</div>`}
    ${!fiscal ? '' : `NFC-e nº ${v.nfce} · Série 001<br>${new Date(v.data).toLocaleString('pt-BR')}${v.cancelada ? '<br><b>*** NFC-e CANCELADA ***</b>' : ''}
    <div class="qr-real">${qrSvg('https://www.nfce.fazenda.sp.gov.br/qrcode?p=' + chave + '|2|2|1|SIMULACAO', 3)}</div>Consulte pela chave de acesso em<br>nfce.fazenda.sp.gov.br/consulta<br><span style="font-size:9.5px;word-break:break-all">${chave.replace(/(\d{4})/g, '$1 ')}</span></div>`}
    ${c.rodape ? `<hr><div class="c">${esc(c.rodape)}</div>` : ''}
  </div>`;
}
function mostrarCupom(v, nova) {
  abrirModal(`<div class="modal-head"><span class="ico-chip ${v.cancelada ? 'bad' : 'ok'}">${ic(v.cancelada ? 'ban' : 'circle-check', 'lg')}</span><div><h2>${nova ? 'Venda concluída' : 'Venda #' + v.id}</h2><p>${brl(v.total)} · ${(v.pagamentos || []).map(p => p.forma).join(' + ')}${v.troco ? ` · troco de <b>${brl(v.troco)}</b>` : ''}${nova ? '. Estoque atualizado.' : ''}</p></div></div>
  ${htmlCupom(v)}
  <p class="muted" style="text-align:center;font-size:12px;margin:14px 0 0">${ic('info', 'sm')} ${v.nfce ? 'Nota simulada. No sistema real ela é autorizada pela SEFAZ-SP.' : 'Venda sem NFC-e: comprovante sem valor fiscal.'}</p>
  <div class="acoes"><button class="btn sec" onclick="toast('Comprovante enviado por WhatsApp (simulação)')">${ic('message-circle', 'sm')}WhatsApp</button><button class="btn sec" onclick="imprimirCupom(${v.id})">${ic('printer', 'sm')}${nova ? 'Imprimir' : 'Reimprimir'}</button><button class="btn" onclick="fecharModal()">${ic(nova ? 'plus' : 'check', 'sm')}${nova ? 'Nova venda' : 'Fechar'}</button></div>`);
}
function imprimirCupom(id) { imprimirHtml(htmlCupom(S.vendas.find(x => x.id === id))); }
// Abre uma janela no tamanho da bobina térmica (58 ou 80 mm) e manda imprimir
function imprimirHtml(html) {
  const w = +S.config.largura || 80;
  const j = window.open('', '_blank', 'width=420,height=700');
  if (!j) return toast('Libere pop-ups para imprimir', true);
  j.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Cupom</title><style>@page{size:${w}mm auto;margin:3mm}body{margin:0;font:12px/1.35 'Courier New',monospace;color:#000;width:${w - 6}mm}hr{border:0;border-top:1px dashed #000;margin:6px 0}.c{text-align:center}.row{display:flex;justify-content:space-between;gap:8px}.qr-real svg{width:120px;height:120px;margin:6px auto;display:block}</style></head><body>${html}<script>onload=()=>{print();setTimeout(()=>close(),300)}<\/script></body></html>`);
  j.document.close();
}

// ===== Abrir / fechar caixa =====
function abrirCaixa(valor = 'R$ 200,00') {
  if (S.caixa) return toast('Já existe um caixa aberto');
  abrirModal(`<div class="modal-head"><span class="ico-chip ok">${ic('lock-open', 'lg')}</span><div><h2>Abrir caixa</h2><p>Informe o dinheiro que já está na gaveta para troco (fundo de caixa).</p></div></div>
  <form onsubmit="confirmarAbertura();return false"><label class="field">Valor inicial em dinheiro<input id="fundo" type="text" inputmode="numeric" data-moeda value="${valor}" style="font-size:18px;height:46px"></label></form>
  <div class="acoes"><button class="btn sec" onclick="fecharModal()">Cancelar</button><button class="btn" onclick="confirmarAbertura()">${ic('lock-open', 'sm')}Abrir caixa</button></div>`, true);
  setTimeout(() => $('#fundo').select(), 50);
}
// Pede confirmação antes de abrir; "Voltar" reabre o formulário com o valor digitado
function confirmarAbertura() {
  const fundo = Math.max(0, num($('#fundo').value));
  dialogo({ icone: 'lock-open', tom: 'ok', titulo: 'Abrir o caixa?', texto: `Caixa aberto por <b>${esc(S.usuario.nome)}</b> com <b>${brl(fundo)}</b> de troco na gaveta.`,
    botoes: [{ label: 'Voltar', estilo: 'sec', acao: () => abrirCaixa(brl(fundo)) }, { label: 'Sim, abrir caixa', icone: 'lock-open', acao: () => efetivarAbertura(fundo) }] });
}
async function efetivarAbertura(fundo) {
  S.caixa = real() ? (await persistir('caixa.abrir', { fundo })).caixa
    : { id: proximoId(S.caixas), operador: S.usuario.nome, abertoEm: new Date().toISOString(), fundo, movimentos: [], status: 'aberto' };
  S.caixas.push(S.caixa); fecharModal(); toast(`Caixa #${S.caixa.id} aberto com ${brl(fundo)}`); render();
}
function movimentoCaixa(tipo) {
  if (!S.caixa) return toast('Abra o caixa primeiro', true);
  const sg = tipo === 'sangria';
  abrirModal(`<div class="modal-head"><span class="ico-chip ${sg ? 'bad' : 'ok'}">${ic(sg ? 'arrow-up-circle' : 'arrow-down-circle', 'lg')}</span><div><h2>${sg ? 'Sangria' : 'Suprimento'}</h2><p>${sg ? 'Retirada de dinheiro da gaveta (ex.: depósito, pagamento de fornecedor).' : 'Reforço de dinheiro na gaveta (ex.: mais troco).'}</p></div></div>
  <form id="fmv" class="form-grid" onsubmit="return false"><label class="field">Valor (R$)<input name="valor" type="text" inputmode="numeric" data-moeda placeholder="R$ 0,00" required></label><label class="field">Motivo<input name="motivo" placeholder="${sg ? 'Ex.: depósito no banco' : 'Ex.: troco extra'}"></label></form>
  <div class="acoes"><button class="btn sec" onclick="fecharModal()">Cancelar</button><button class="btn ${sg ? 'danger' : ''}" onclick="salvarMovimento('${tipo}')">${ic('check', 'sm')}Registrar</button></div>`, true);
  setTimeout(() => $('#fmv [name=valor]').focus(), 50);
}
async function salvarMovimento(tipo) {
  const d = Object.fromEntries(new FormData($('#fmv'))), v = Math.round(num(d.valor) * 100) / 100;
  if (v <= 0) return toast('Informe um valor maior que zero', true);
  if (tipo === 'sangria' && v > esperadoDinheiro(S.caixa)) return toast('Valor maior que o dinheiro na gaveta', true);
  if (real()) S.caixa.movimentos = (await persistir('caixa.movimento', { tipo, valor: v, motivo: d.motivo })).caixa.movimentos;
  else S.caixa.movimentos.unshift({ tipo, valor: v, motivo: d.motivo, data: new Date().toISOString(), usuario: S.usuario.nome });
  fecharModal(); toast(tipo === 'sangria' ? 'Sangria registrada' : 'Suprimento registrado'); render();
}
function resumoCaixa(c) {
  const vendas = S.vendas.filter(v => v.caixa === c.id && !v.cancelada);
  const porForma = Object.fromEntries(PAGAMENTOS.map(([p]) => [p, 0]));
  vendas.forEach(v => v.pagamentos.forEach(p => porForma[p.forma] += p.valor));
  const troco = vendas.reduce((s, v) => s + (v.troco || 0), 0);
  const sup = c.movimentos.filter(m => m.tipo === 'suprimento').reduce((s, m) => s + m.valor, 0);
  const san = c.movimentos.filter(m => m.tipo === 'sangria').reduce((s, m) => s + m.valor, 0);
  return { vendas, porForma, troco, sup, san, total: vendas.reduce((s, v) => s + v.total, 0), esperado: esperadoDinheiro(c), canceladas: S.vendas.filter(v => v.caixa === c.id && v.cancelada).length };
}
function htmlResumoCaixa(c) {
  const r = resumoCaixa(c);
  const linha = (n, v, cls = '') => `<div class="sum-line ${cls}"><span>${n}</span><span class="num">${v}</span></div>`;
  return `${linha('Vendas', r.vendas.length + (r.canceladas ? ` <small class="muted">(${r.canceladas} cancelada${r.canceladas > 1 ? 's' : ''})</small>` : ''))}
    ${PAGAMENTOS.map(([p]) => linha(p, brl(r.porForma[p]))).join('')}
    ${linha('<b>Total vendido</b>', `<b>${brl(r.total)}</b>`)}<hr class="sep">
    <div class="muted" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Dinheiro na gaveta</div>
    ${linha('Fundo de troco', brl(c.fundo))}${linha('+ Vendas em dinheiro', brl(r.porForma.Dinheiro))}${linha('− Troco dado', brl(r.troco))}${linha('+ Suprimentos', brl(r.sup))}${linha('− Sangrias', brl(r.san))}
    ${linha('<b>Esperado na gaveta</b>', `<b>${brl(r.esperado)}</b>`)}
    ${c.status === 'fechado' ? linha('Contado', brl(c.contado)) + linha('Diferença', difPill(c.diferenca)) : ''}`;
}
const difPill = d => `<span class="pill ${Math.abs(d) < .01 ? 'ok' : d > 0 ? 'warn' : 'bad'}">${Math.abs(d) < .01 ? 'Confere' : (d > 0 ? 'Sobra de ' : 'Falta de ') + brl(Math.abs(d))}</span>`;

TELAS.caixas = () => {
  const c = S.caixa, admin = S.usuario.perfil !== 'vendedora';
  const hist = [...S.caixas].sort((a, b) => b.abertoEm.localeCompare(a.abertoEm)).filter(x => admin || x.operador === S.usuario.nome);
  const dt = d => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  $('#tela').innerHTML = `
  ${head('Abrir e fechar caixa', 'Fundo de troco, sangria, suprimento e conferência no fechamento')}
  ${abasRota([['caixa', 'scan-barcode', 'Vender'], ['caixas', 'lock-keyhole', 'Abrir/fechar caixa']], 'caixas')}
  ${!c ? `<div class="card empty"><div class="ring">${ic('wallet', 'xl')}</div><b>Seu caixa está fechado</b>Abra o caixa informando o fundo de troco para começar a vender.<div style="margin-top:16px"><button class="btn" onclick="abrirCaixa()">${ic('lock-open', 'sm')}Abrir caixa</button></div></div>`
  : `<div class="card caixa-bar"><span class="cb-info"><span class="pulso"></span><b>Caixa #${c.id} aberto</b><small class="muted">desde ${dt(c.abertoEm)} · ${esc(c.operador)}</small></span>
      <span class="cb-acoes"><button class="btn sec" onclick="movimentoCaixa('suprimento')">${ic('arrow-down-circle', 'sm')}Suprimento</button><button class="btn sec" onclick="movimentoCaixa('sangria')">${ic('arrow-up-circle', 'sm')}Sangria</button><button class="btn" onclick="fecharCaixa()">${ic('lock-keyhole', 'sm')}Fechar caixa</button></span></div>
    <div class="grid cols-1-1" style="margin-top:16px">
      <div class="card"><div class="card-head"><h3>${ic('calculator', 'sm')}Resumo do caixa</h3></div>${htmlResumoCaixa(c)}</div>
      <div class="card flush"><div class="card-head" style="padding-bottom:14px"><h3>${ic('arrow-left-right', 'sm')}Sangrias e suprimentos</h3></div>
        ${c.movimentos.length ? `<table><thead><tr><th>Hora</th><th>Tipo</th><th>Motivo</th><th class="num">Valor</th></tr></thead><tbody>${c.movimentos.map(m => `<tr><td class="muted">${new Date(m.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td><td><span class="pill ${m.tipo === 'sangria' ? 'bad' : 'ok'}">${m.tipo === 'sangria' ? 'Sangria' : 'Suprimento'}</span></td><td>${esc(m.motivo) || '—'}</td><td class="num"><b>${brl(m.valor)}</b></td></tr>`).join('')}</tbody></table>`
        : `<div class="empty" style="padding:30px">Nenhuma movimentação neste caixa.</div>`}</div>
    </div>`}
  <div class="card flush" style="margin-top:16px"><div class="card-head" style="padding-bottom:14px"><h3>${ic('history', 'sm')}Histórico de caixas</h3></div><div class="tbl-wrap">
    <table><thead><tr><th>Nº</th>${admin ? '<th>Operador</th>' : ''}<th>Abertura</th><th>Fechamento</th><th class="num">Esperado</th><th class="num">Contado</th><th>Diferença</th><th>Status</th><th></th></tr></thead><tbody>
    ${hist.map(x => `<tr><td><b>#${x.id}</b></td>${admin ? `<td>${esc(x.operador)}</td>` : ''}<td>${dt(x.abertoEm)}</td><td>${x.fechadoEm ? dt(x.fechadoEm) : '—'}</td><td class="num">${x.esperado != null ? brl(x.esperado) : '—'}</td><td class="num">${x.contado != null ? brl(x.contado) : '—'}</td><td>${x.diferenca != null ? difPill(x.diferenca) : '—'}</td>
      <td><span class="pill ${x.status === 'aberto' ? 'ok' : 'plain'}">${x.status === 'aberto' ? 'Aberto' : 'Fechado'}</span></td><td><div class="row-actions"><button class="icon-btn" title="Ver detalhes" onclick="verCaixa(${x.id})">${ic('eye', 'sm')}</button></div></td></tr>`).join('')}
    </tbody></table></div></div>`;
};
function fecharCaixa(valor = '') {
  const c = S.caixa, r = resumoCaixa(c);
  abrirModal(`<div class="modal-head"><span class="ico-chip">${ic('lock-keyhole', 'lg')}</span><div><h2>Fechar caixa #${c.id}</h2><p>Conte o dinheiro da gaveta e informe o valor. O sistema compara com o esperado.</p></div></div>
  <div class="sum-line"><span>Esperado na gaveta</span><b class="num">${brl(r.esperado)}</b></div>
  <label class="field" style="margin-top:10px">Dinheiro contado<input id="contado" type="text" inputmode="numeric" data-moeda placeholder="R$ 0,00" value="${valor}" style="font-size:18px;height:46px"></label>
  <div id="difCx" style="margin:12px 0 4px;min-height:26px"></div>
  <div class="acoes"><button class="btn sec" onclick="fecharModal()">Cancelar</button><button class="btn" onclick="confirmarFechamento()">${ic('lock-keyhole', 'sm')}Fechar caixa</button></div>`, true);
  const mostrarDif = () => { const e = $('#contado'); $('#difCx').innerHTML = e.value === '' ? '' : difPill(num(e.value) - r.esperado); };
  $('#contado').addEventListener('input', mostrarDif); mostrarDif();
  setTimeout(() => $('#contado').focus(), 50);
}
// Pede confirmação antes de fechar; com diferença, o alerta destaca a falta ou a sobra
function confirmarFechamento() {
  const v = $('#contado').value;
  if (v === '') return toast('Informe o dinheiro contado', true);
  const c = S.caixa, contado = Math.round(num(v) * 100) / 100, esperado = esperadoDinheiro(c), dif = Math.round((contado - esperado) * 100) / 100;
  const linhas = `Esperado na gaveta: <b>${brl(esperado)}</b><br>Dinheiro contado: <b>${brl(contado)}</b>`;
  const voltar = { label: dif ? 'Voltar e recontar' : 'Voltar', estilo: 'sec', acao: () => fecharCaixa(brl(contado)) };
  if (!dif) return dialogo({ icone: 'lock-keyhole', tom: 'ok', titulo: `Fechar o caixa #${c.id}?`, texto: `${linhas}<br>O valor bate certinho com o esperado.`, botoes: [voltar, { label: 'Sim, fechar caixa', icone: 'lock-keyhole', acao: () => efetivarFechamento(contado) }] });
  dialogo({ icone: 'triangle-alert', tom: 'bad', titulo: dif < 0 ? `Falta ${brl(-dif)} no caixa` : `Sobra ${brl(dif)} no caixa`,
    texto: `${linhas}<br><br>O dinheiro contado não bate com o esperado. Confira a gaveta, sangrias e trocos antes de fechar. A diferença fica registrada no fechamento.`,
    botoes: [voltar, { label: 'Fechar mesmo assim', estilo: 'danger', icone: 'lock-keyhole', acao: () => efetivarFechamento(contado) }] });
}
async function efetivarFechamento(contado) {
  const c = S.caixa;
  if (real()) Object.assign(c, (await persistir('caixa.fechar', { contado })).caixa); // esperado calculado no servidor
  else {
    c.esperado = esperadoDinheiro(c); c.contado = contado; c.diferenca = Math.round((c.contado - c.esperado) * 100) / 100;
    c.fechadoEm = new Date().toISOString(); c.status = 'fechado'; c.fechadoPor = S.usuario.nome;
  }
  S.caixa = null; fecharModal(); render(); toast(`Caixa #${c.id} fechado`);
  setTimeout(() => verCaixa(c.id), 200);
}
function verCaixa(id) {
  const c = S.caixas.find(x => x.id === id);
  abrirModal(`<div class="modal-head"><span class="ico-chip">${ic('wallet', 'lg')}</span><div><h2>Caixa #${c.id}</h2><p>${esc(c.operador)} · aberto em ${new Date(c.abertoEm).toLocaleString('pt-BR')}${c.fechadoEm ? ' · fechado em ' + new Date(c.fechadoEm).toLocaleString('pt-BR') : ''}</p></div></div>
  ${htmlResumoCaixa(c)}
  <div class="acoes"><button class="btn sec" onclick="imprimirFechamento(${c.id})">${ic('printer', 'sm')}Imprimir</button><button class="btn" onclick="fecharModal()">Fechar</button></div>`);
}
function imprimirFechamento(id) {
  const c = S.caixas.find(x => x.id === id), r = resumoCaixa(c);
  const row = (a, b) => `<div class="row"><span>${a}</span><span>${b}</span></div>`;
  imprimirHtml(`<div class="c"><b>${esc(S.config.nome)}</b><br>FECHAMENTO DE CAIXA #${c.id}</div><hr>${row('Operador', esc(c.operador))}${row('Abertura', new Date(c.abertoEm).toLocaleString('pt-BR'))}${row('Fechamento', c.fechadoEm ? new Date(c.fechadoEm).toLocaleString('pt-BR') : 'em aberto')}<hr>
    ${PAGAMENTOS.map(([p]) => row(p, brl(r.porForma[p]))).join('')}${row('<b>Total</b>', `<b>${brl(r.total)}</b>`)}<hr>
    ${row('Fundo', brl(c.fundo))}${row('Suprimentos', brl(r.sup))}${row('Sangrias', brl(r.san))}${row('Troco dado', brl(r.troco))}${row('<b>Esperado</b>', `<b>${brl(r.esperado)}</b>`)}
    ${c.status === 'fechado' ? row('Contado', brl(c.contado)) + row('Diferença', brl(c.diferenca)) : ''}<hr><div class="c">Assinatura: ____________________</div>`);
}
