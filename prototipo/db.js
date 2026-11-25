// ===== Banco de dados (API PHP + MySQL) =====
// Dois modos:
//  - 'real': login por e-mail e senha; tudo é lido e gravado no MySQL pela API (api/index.php).
//  - 'demo': contas de apresentação da tela de login; dados fictícios só na memória (nada é salvo).
let MODO = 'demo';
const real = () => MODO === 'real';
const API_URL = 'api/';

// Chama uma ação da API. Erro de rede ou resposta que não é JSON (sem PHP no servidor) vira e.offline.
async function api(acao, dados = {}) {
  let r, j;
  try {
    r = await fetch(API_URL + '?a=' + encodeURIComponent(acao), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
    j = await r.json();
  } catch (e) { const er = new Error('Servidor indisponível'); er.offline = true; throw er; }
  if (!r.ok || j.erro) {
    const er = new Error(j.erro || 'Erro ' + r.status); er.status = r.status;
    if (r.status === 401 && real()) setTimeout(() => { toast('Sua sessão expirou. Entre de novo.', true); setTimeout(() => location.reload(), 1500); }, 0);
    throw er;
  }
  return j;
}
// Grava no banco quando está no modo real (no demo não faz nada). Em erro avisa e interrompe a ação.
async function persistir(acao, dados) {
  if (!real()) return null;
  try { return await api(acao, dados); }
  catch (e) { toast(e.offline ? 'Sem conexão com o servidor: nada foi salvo' : e.message, true); throw e; }
}
// Próximo id local (só no modo demo; no real quem gera é o banco)
const proximoId = lista => lista.reduce((m, x) => Math.max(m, +x.id || 0), 0) + 1;

// Troca os dados fictícios pelos do banco, mantendo as mesmas listas que as telas usam
function carregarDados(d) {
  const trocar = (lista, novos) => lista.splice(0, lista.length, ...novos);
  S.produtos = d.produtos; S.clientes = d.clientes; S.vendas = d.vendas; S.caixas = d.caixas;
  S.movs = d.movs; S.compras = d.compras; S.contas = d.contas; S.fornecedores = d.fornecedores;
  S.caixa = d.caixas.find(c => c.status === 'aberto') || null;
  S.carrinho = []; S.desconto = 0; S.clienteVenda = null;
  if (d.categorias.length) trocar(CATEGORIAS, d.categorias);
  trocar(MARCAS, [...new Set(d.produtos.map(p => p.marca).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')));
  Object.assign(S.config, d.config);
  trocar(USUARIOS, d.usuarios);
}
// Entra no modo real: carrega tudo do banco e abre o sistema
async function entrarReal() {
  let d;
  try { d = await api('dados'); }
  catch (e) { return toast(e.offline ? 'Servidor indisponível' : e.message, true); }
  MODO = 'real';
  carregarDados(d);
  modoLogin = 'entrar';
  entrar(d.usuario.id);
}
// Ao abrir a página: se já existe sessão no servidor, entra direto (F5 não desloga)
window.addEventListener('load', async () => {
  try { const r = await api('auth.eu'); if (r.usuario && !S.usuario) await entrarReal(); } catch (e) { /* sem sessão ou sem servidor: fica no login */ }
});
