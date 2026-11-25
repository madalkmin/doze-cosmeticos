<?php
// API da Doze Cosméticos (PHP + PDO + MySQL). Chamada pelo site: POST api/?a=<ação> com JSON.
// Compatível com PHP 7.4+. Sessão por cookie (login), regras de permissão por perfil no servidor.

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

// ---------- utilidades ----------
function responder($dados, int $status = 200): void { http_response_code($status); echo json_encode($dados, JSON_UNESCAPED_UNICODE); exit; }
function erro(string $msg, int $status = 400): void { responder(['erro' => $msg], $status); }
function agora(): string { return gmdate('Y-m-d H:i:s'); }
function iso(?string $dt): ?string { return $dt ? str_replace(' ', 'T', $dt) . 'Z' : null; }
function dinheiro($v): float { return round((float)$v, 2); }
function texto($v, int $max = 255): string { return mb_substr(trim((string)($v ?? '')), 0, $max); }
function ou_nulo($v, int $max = 255): ?string { $t = texto($v, $max); return $t === '' ? null : $t; }

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $arq = __DIR__ . '/config.php';
    if (!is_file($arq)) erro('Servidor sem config.php (copie config.exemplo.php e preencha).', 500);
    $c = require $arq;
    try {
        $pdo = new PDO("mysql:host={$c['db_host']};dbname={$c['db_nome']};charset=utf8mb4", $c['db_usuario'], $c['db_senha'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $pdo->exec("SET time_zone = '+00:00'");
    } catch (PDOException $e) {
        erro('Não foi possível conectar ao banco de dados.', 503);
    }
    return $pdo;
}
function q(string $sql, array $p = []): PDOStatement { $s = db()->prepare($sql); $s->execute($p); return $s; }
function um(string $sql, array $p = []): ?array { $r = q($sql, $p)->fetch(); return $r ?: null; }
function todos(string $sql, array $p = []): array { return q($sql, $p)->fetchAll(); }

// ---------- sessão e permissões ----------
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')]);
session_name('dozesess');
session_start();

const PERFIS = [
    'admin' => ['verCusto' => true, 'cancelar' => true, 'editarPreco' => true, 'gestao' => true],
    'gerente' => ['verCusto' => true, 'cancelar' => true, 'editarPreco' => false, 'gestao' => true],
    'vendedora' => ['verCusto' => false, 'cancelar' => false, 'editarPreco' => false, 'gestao' => false],
];
function usuario_publico(array $u): array { return ['id' => (int)$u['id'], 'nome' => $u['nome'], 'email' => $u['email'], 'perfil' => $u['perfil'], 'status' => $u['status']]; }
// Recarrega o usuário a cada chamada: bloqueio ou troca de perfil valem na hora
function eu(): array {
    if (empty($_SESSION['uid'])) erro('Sessão expirada. Entre de novo.', 401);
    $u = um('SELECT * FROM usuarios WHERE id = ?', [$_SESSION['uid']]);
    if (!$u || $u['status'] !== 'ativo') { session_destroy(); erro('Acesso não liberado.', 401); }
    return $u;
}
function exigir(string $permissao): array { $u = eu(); if (empty(PERFIS[$u['perfil']][$permissao])) erro('Sem permissão para isso.', 403); return $u; }

// ---------- formatos devolvidos ao site (mesmos nomes de campo do front) ----------
function fmt_produto(array $p, bool $verCusto): array {
    return ['id' => (int)$p['id'], 'ean' => $p['ean'], 'sku' => $p['sku'] ?? '', 'nome' => $p['nome'], 'linha' => $p['linha'] ?? '',
        'categoria' => $p['categoria'], 'marca' => $p['marca'], 'variacao' => $p['variacao'] ?? '',
        'custo' => $verCusto ? (float)$p['custo'] : 0, 'preco' => (float)$p['preco'], 'estoque' => (int)$p['estoque'],
        'minimo' => (int)$p['minimo'], 'validade' => $p['validade'] ?? '', 'fiscal' => $p['fiscal'] ?? ''];
}
function fmt_cliente(array $c): array { return ['id' => (int)$c['id'], 'nome' => $c['nome'], 'cpf' => $c['cpf'] ?? '', 'fone' => $c['fone'] ?? '', 'nasc' => $c['nasc'] ?? '']; }
function fmt_fornecedor(array $f): array { return ['id' => (int)$f['id'], 'nome' => $f['nome'], 'cnpj' => $f['cnpj'] ?? '', 'fone' => $f['fone'] ?? '', 'contato' => $f['contato'] ?? '', 'email' => $f['email'] ?? '']; }
function fmt_conta(array $c): array { return ['id' => (int)$c['id'], 'tipo' => $c['tipo'], 'descricao' => $c['descricao'], 'valor' => (float)$c['valor'], 'vencimento' => $c['vencimento'], 'pago' => (bool)$c['pago']]; }
function fmt_caixa(array $c, array $movs): array {
    return ['id' => (int)$c['id'], 'operador' => $c['operador'], 'abertoEm' => iso($c['aberto_em']), 'fechadoEm' => iso($c['fechado_em']),
        'fundo' => (float)$c['fundo'], 'status' => $c['status'], 'fechadoPor' => $c['fechado_por'],
        'esperado' => $c['esperado'] === null ? null : (float)$c['esperado'], 'contado' => $c['contado'] === null ? null : (float)$c['contado'],
        'diferenca' => $c['diferenca'] === null ? null : (float)$c['diferenca'],
        'movimentos' => array_map(fn($m) => ['tipo' => $m['tipo'], 'valor' => (float)$m['valor'], 'motivo' => $m['motivo'] ?? '', 'usuario' => $m['usuario'], 'data' => iso($m['data'])], $movs)];
}
function fmt_mov(array $m): array {
    return ['data' => iso($m['data']), 'produto' => $m['produto'], 'produtoId' => $m['produto_id'] === null ? null : (int)$m['produto_id'],
        'categoria' => $m['categoria'], 'tipo' => $m['tipo'], 'qtd' => (int)$m['qtd'], 'motivo' => $m['motivo'] ?? '', 'usuario' => $m['usuario'],
        'saldo' => $m['saldo'] === null ? null : (int)$m['saldo']];
}
// Vendas com itens e pagamentos (uma consulta por tabela, sem N+1)
function carregar_vendas(string $where, array $p, bool $verCusto): array {
    $vs = todos("SELECT * FROM vendas WHERE $where ORDER BY id", $p);
    if (!$vs) return [];
    $ids = implode(',', array_map(fn($v) => (int)$v['id'], $vs));
    $itens = []; foreach (todos("SELECT * FROM venda_itens WHERE venda_id IN ($ids) ORDER BY id") as $i) $itens[$i['venda_id']][] = $i;
    $pags = []; foreach (todos("SELECT * FROM venda_pagamentos WHERE venda_id IN ($ids) ORDER BY id") as $g) $pags[$g['venda_id']][] = $g;
    return array_map(function ($v) use ($itens, $pags, $verCusto) {
        $r = ['id' => (int)$v['id'], 'data' => iso($v['data']), 'total' => (float)$v['total'], 'desconto' => (float)$v['desconto'], 'troco' => (float)$v['troco'],
            'pagamento' => $v['pagamento'], 'cliente' => $v['cliente_id'] === null ? null : (int)$v['cliente_id'], 'vendedor' => $v['vendedor'],
            'nfce' => $v['nfce'], 'caixa' => $v['caixa_id'] === null ? null : (int)$v['caixa_id'],
            'itens' => array_map(fn($i) => ['id' => $i['produto_id'] === null ? null : (int)$i['produto_id'], 'nome' => $i['nome'], 'qtd' => (int)$i['qtd'],
                'preco' => (float)$i['preco'], 'custo' => $verCusto ? (float)$i['custo'] : 0], $itens[$v['id']] ?? []),
            'pagamentos' => array_map(fn($g) => ['forma' => $g['forma'], 'valor' => (float)$g['valor']], $pags[$v['id']] ?? [])];
        if ($v['cancelada_em']) $r['cancelada'] = ['motivo' => $v['cancelada_motivo'], 'data' => iso($v['cancelada_em']), 'usuario' => $v['cancelada_por']];
        return $r;
    }, $vs);
}
function carregar_caixas(string $where, array $p = []): array {
    $cs = todos("SELECT * FROM caixas WHERE $where ORDER BY id", $p);
    if (!$cs) return [];
    $ids = implode(',', array_map(fn($c) => (int)$c['id'], $cs));
    $movs = []; foreach (todos("SELECT * FROM caixa_movimentos WHERE caixa_id IN ($ids) ORDER BY id") as $m) $movs[$m['caixa_id']][] = $m;
    return array_map(fn($c) => fmt_caixa($c, $movs[$c['id']] ?? []), $cs);
}
function registrar_mov(array $p, string $tipo, int $qtd, string $motivo, array $u): void {
    q('INSERT INTO estoque_movimentos (produto_id, produto, categoria, tipo, qtd, saldo, motivo, usuario, data) VALUES (?,?,?,?,?,?,?,?,?)',
        [$p['id'], $p['nome'], $p['categoria'], $tipo, $qtd, $p['estoque'], mb_substr($motivo, 0, 255), $u['nome'], agora()]);
}
// Dinheiro esperado na gaveta: fundo + vendas em dinheiro (menos troco) + suprimentos − sangrias
function esperado_caixa(int $caixaId): float {
    $c = um('SELECT fundo FROM caixas WHERE id = ?', [$caixaId]);
    $din = um("SELECT COALESCE(SUM(p.valor),0) AS t FROM venda_pagamentos p JOIN vendas v ON v.id = p.venda_id WHERE v.caixa_id = ? AND v.cancelada_em IS NULL AND p.forma = 'Dinheiro'", [$caixaId])['t'];
    $troco = um('SELECT COALESCE(SUM(troco),0) AS t FROM vendas WHERE caixa_id = ? AND cancelada_em IS NULL', [$caixaId])['t'];
    $mov = um("SELECT COALESCE(SUM(CASE WHEN tipo='suprimento' THEN valor ELSE -valor END),0) AS t FROM caixa_movimentos WHERE caixa_id = ?", [$caixaId])['t'];
    return dinheiro((float)$c['fundo'] + (float)$din - (float)$troco + (float)$mov);
}
function transacao(callable $f) {
    db()->beginTransaction();
    try { $r = $f(); db()->commit(); return $r; }
    catch (Throwable $e) { if (db()->inTransaction()) db()->rollBack(); throw $e; }
}

// ---------- roteamento ----------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') erro('Use POST.', 405);
$acao = (string)($_GET['a'] ?? '');
$d = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($d)) erro('JSON inválido.');

try {
    switch ($acao) {

    // ===== Login =====
    case 'auth.login': {
        $u = um('SELECT * FROM usuarios WHERE email = ?', [mb_strtolower(texto($d['email'] ?? '', 160))]);
        if (!$u || !password_verify((string)($d['senha'] ?? ''), $u['senha_hash'])) erro('E-mail ou senha incorretos', 401);
        if ($u['status'] === 'pendente') responder(['pendente' => true]);
        if ($u['status'] === 'bloqueado') erro('Acesso bloqueado. Fale com a administradora.', 403);
        session_regenerate_id(true); $_SESSION['uid'] = (int)$u['id'];
        responder(['usuario' => usuario_publico($u)]);
    }
    case 'auth.criar': {
        $nome = texto($d['nome'] ?? '', 120); $email = mb_strtolower(texto($d['email'] ?? '', 160)); $senha = (string)($d['senha'] ?? '');
        if (mb_strlen($nome) < 2 || !filter_var($email, FILTER_VALIDATE_EMAIL)) erro('Informe nome e e-mail válidos');
        if (strlen($senha) < 8) erro('A senha precisa de 8 caracteres ou mais');
        if (um('SELECT id FROM usuarios WHERE email = ?', [$email])) erro('Já existe conta com esse e-mail', 409);
        // Primeira conta do sistema: administradora já liberada
        $primeiro = !um('SELECT id FROM usuarios LIMIT 1');
        q('INSERT INTO usuarios (nome, email, senha_hash, perfil, status, criado_em) VALUES (?,?,?,?,?,?)',
            [$nome, $email, password_hash($senha, PASSWORD_DEFAULT), $primeiro ? 'admin' : 'vendedora', $primeiro ? 'ativo' : 'pendente', agora()]);
        $u = um('SELECT * FROM usuarios WHERE id = ?', [db()->lastInsertId()]);
        if ($primeiro) { session_regenerate_id(true); $_SESSION['uid'] = (int)$u['id']; }
        responder(['usuario' => usuario_publico($u), 'primeiro' => $primeiro]);
    }
    case 'auth.sair': { $_SESSION = []; session_destroy(); responder(['ok' => true]); }
    case 'auth.eu': { responder(['usuario' => usuario_publico(eu())]); }

    // ===== Carga inicial de todos os dados =====
    case 'dados': {
        $u = eu(); $vc = PERFIS[$u['perfil']]['verCusto']; $gestao = PERFIS[$u['perfil']]['gestao'];
        $cfg = []; foreach (todos('SELECT chave, valor FROM config') as $c) $cfg[$c['chave']] = in_array($c['chave'], ['largura', 'metaMes', 'metaVendedora'], true) ? (float)$c['valor'] : $c['valor'];
        $desde = gmdate('Y-m-d H:i:s', time() - 400 * 86400);
        $compras = [];
        if ($gestao) {
            $cs = todos('SELECT * FROM compras ORDER BY id');
            $it = []; foreach (todos('SELECT * FROM compra_itens ORDER BY id') as $i) $it[$i['compra_id']][] = ['id' => $i['produto_id'] === null ? null : (int)$i['produto_id'], 'qtd' => (int)$i['qtd'], 'custo' => (float)$i['custo']];
            $compras = array_map(fn($c) => ['id' => (int)$c['id'], 'data' => iso($c['data']), 'fornecedor' => $c['fornecedor_id'] === null ? null : (int)$c['fornecedor_id'],
                'nota' => $c['nota'] ?? '', 'itens' => $it[$c['id']] ?? [], 'total' => (float)$c['total'], 'usuario' => $c['usuario']], $cs);
        }
        responder([
            'usuario' => usuario_publico($u),
            'config' => $cfg,
            'categorias' => array_column(todos('SELECT nome FROM categorias ORDER BY id'), 'nome'),
            'produtos' => array_map(fn($p) => fmt_produto($p, $vc), todos('SELECT * FROM produtos ORDER BY id')),
            'clientes' => array_map('fmt_cliente', todos('SELECT * FROM clientes ORDER BY id')),
            'fornecedores' => $gestao ? array_map('fmt_fornecedor', todos('SELECT * FROM fornecedores ORDER BY id')) : [],
            'vendas' => carregar_vendas('data >= ?', [$desde], $vc),
            'caixas' => carregar_caixas('aberto_em >= ? OR status = ?', [$desde, 'aberto']),
            'movs' => array_map('fmt_mov', todos('SELECT * FROM estoque_movimentos ORDER BY id DESC LIMIT 3000')),
            'compras' => $compras,
            'contas' => $gestao ? array_map('fmt_conta', todos('SELECT * FROM contas ORDER BY vencimento, id')) : [],
            'usuarios' => $u['perfil'] === 'admin' ? array_map('usuario_publico', todos('SELECT * FROM usuarios ORDER BY id')) : [usuario_publico($u)],
        ]);
    }

    // ===== Produtos =====
    case 'produto.salvar': {
        $u = exigir('gestao');
        $id = (int)($d['id'] ?? 0);
        $ean = preg_replace('/\s+/', '', (string)($d['ean'] ?? ''));
        $nome = texto($d['nome'] ?? '', 160); $marca = texto($d['marca'] ?? '', 80);
        if (strlen($ean) < 8 || $nome === '' || $marca === '' || dinheiro($d['preco'] ?? 0) <= 0) erro('Preencha código (8+ dígitos), nome, marca e preço');
        $dup = um('SELECT nome, variacao FROM produtos WHERE ean = ? AND id <> ?', [$ean, $id]);
        if ($dup) erro('Código já usado em: ' . $dup['nome'] . ($dup['variacao'] ? ' · ' . $dup['variacao'] : ''), 409);
        $sku = ou_nulo($d['sku'] ?? '', 40);
        if ($sku && um('SELECT id FROM produtos WHERE sku = ? AND id <> ?', [$sku, $id])) erro('Já existe produto com esse SKU', 409);
        $campos = [$ean, $sku, $nome, ou_nulo($d['linha'] ?? '', 160) ?? $nome, texto($d['categoria'] ?? '', 60) ?: 'Acessórios', $marca,
            ou_nulo($d['variacao'] ?? '', 80), dinheiro($d['custo'] ?? 0), dinheiro($d['preco'] ?? 0), max(0, (int)($d['minimo'] ?? 0)),
            preg_match('/^\d{4}-\d{2}$/', (string)($d['validade'] ?? '')) ? $d['validade'] : null, ou_nulo($d['fiscal'] ?? '', 20)];
        $p = transacao(function () use ($id, $campos, $d, $u) {
            if ($id) {
                if (!um('SELECT id FROM produtos WHERE id = ?', [$id])) erro('Produto não encontrado', 404);
                q('UPDATE produtos SET ean=?, sku=?, nome=?, linha=?, categoria=?, marca=?, variacao=?, custo=?, preco=?, minimo=?, validade=?, fiscal=?, atualizado_em=? WHERE id=?', array_merge($campos, [agora(), $id]));
            } else {
                $est = max(0, (int)($d['estoque'] ?? 0));
                q('INSERT INTO produtos (ean, sku, nome, linha, categoria, marca, variacao, custo, preco, minimo, validade, fiscal, estoque, criado_em, atualizado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', array_merge($campos, [$est, agora(), agora()]));
                $id = (int)db()->lastInsertId();
                if (!$campos[1]) q('UPDATE produtos SET sku = ? WHERE id = ?', ['DZ-' . str_pad((string)$id, 4, '0', STR_PAD_LEFT), $id]);
                $novo = um('SELECT * FROM produtos WHERE id = ?', [$id]);
                if ($est) registrar_mov($novo, 'Entrada', $est, 'Estoque inicial', $u);
            }
            return um('SELECT * FROM produtos WHERE id = ?', [$id]);
        });
        responder(['produto' => fmt_produto($p, true)]);
    }

    // ===== Estoque: entrada por bipe, contagem e ajuste manual =====
    case 'estoque.ajustar': {
        $u = eu();
        $tipo = in_array($d['tipo'] ?? '', ['Entrada', 'Ajuste'], true) ? $d['tipo'] : 'Ajuste';
        $motivo = texto($d['motivo'] ?? '', 255);
        $itens = is_array($d['itens'] ?? null) ? $d['itens'] : [];
        if (!$itens) erro('Nenhum item');
        $saida = transacao(function () use ($itens, $tipo, $motivo, $u) {
            $r = [];
            foreach ($itens as $i) {
                $p = um('SELECT * FROM produtos WHERE id = ? FOR UPDATE', [(int)($i['id'] ?? 0)]);
                if (!$p) erro('Produto não encontrado', 404);
                $qtd = (int)($i['qtd'] ?? 0);
                $novo = ($i['modo'] ?? '') === 'definir' ? $qtd : (int)$p['estoque'] + $qtd;
                if ($novo < 0) erro('O estoque de ' . $p['nome'] . ' ficaria negativo');
                $dif = $novo - (int)$p['estoque'];
                if (!$dif) continue;
                q('UPDATE produtos SET estoque = ?, atualizado_em = ? WHERE id = ?', [$novo, agora(), $p['id']]);
                $p['estoque'] = $novo;
                registrar_mov($p, $tipo, $dif, $motivo, $u);
                $r[] = ['id' => (int)$p['id'], 'estoque' => $novo];
            }
            return $r;
        });
        responder(['produtos' => $saida]);
    }

    // ===== Clientes e fornecedores =====
    case 'cliente.salvar': {
        eu();
        $nome = texto($d['nome'] ?? '', 160);
        if (mb_strlen($nome) < 2) erro('Informe o nome');
        $nasc = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($d['nasc'] ?? '')) ? $d['nasc'] : null;
        q('INSERT INTO clientes (nome, cpf, fone, nasc, criado_em) VALUES (?,?,?,?,?)', [$nome, ou_nulo($d['cpf'] ?? '', 14), ou_nulo($d['fone'] ?? '', 20), $nasc, agora()]);
        responder(['cliente' => fmt_cliente(um('SELECT * FROM clientes WHERE id = ?', [db()->lastInsertId()]))]);
    }
    case 'fornecedor.salvar': {
        exigir('gestao');
        $id = (int)($d['id'] ?? 0); $nome = texto($d['nome'] ?? '', 160);
        if ($nome === '') erro('Informe o nome do fornecedor');
        $v = [$nome, ou_nulo($d['cnpj'] ?? '', 18), ou_nulo($d['fone'] ?? '', 20), ou_nulo($d['contato'] ?? '', 80), ou_nulo($d['email'] ?? '', 160)];
        if ($id) q('UPDATE fornecedores SET nome=?, cnpj=?, fone=?, contato=?, email=? WHERE id=?', array_merge($v, [$id]));
        else { q('INSERT INTO fornecedores (nome, cnpj, fone, contato, email, criado_em) VALUES (?,?,?,?,?,?)', array_merge($v, [agora()])); $id = (int)db()->lastInsertId(); }
        responder(['fornecedor' => fmt_fornecedor(um('SELECT * FROM fornecedores WHERE id = ?', [$id]))]);
    }

    // ===== Vendas =====
    case 'venda.criar': {
        $u = eu(); $perm = PERFIS[$u['perfil']];
        $caixa = um("SELECT * FROM caixas WHERE status = 'aberto' ORDER BY id DESC LIMIT 1");
        if (!$caixa) erro('Abra o caixa antes de vender');
        $itens = is_array($d['itens'] ?? null) ? $d['itens'] : [];
        $pags = is_array($d['pagamentos'] ?? null) ? $d['pagamentos'] : [];
        if (!$itens || !$pags) erro('Venda sem itens ou sem pagamento');
        $venda = transacao(function () use ($u, $perm, $caixa, $itens, $pags, $d) {
            $linhas = []; $bruto = 0;
            foreach ($itens as $i) {
                $p = um('SELECT * FROM produtos WHERE id = ? FOR UPDATE', [(int)($i['id'] ?? 0)]);
                if (!$p) erro('Produto não encontrado', 404);
                $qtd = max(1, (int)($i['qtd'] ?? 1));
                // Só quem pode mudar preço no caixa envia preço diferente do cadastro
                $preco = $perm['editarPreco'] && isset($i['preco']) ? max(0, dinheiro($i['preco'])) : (float)$p['preco'];
                $linhas[] = [$p, $qtd, $preco]; $bruto += $qtd * $preco;
            }
            $desc = min(max(0, dinheiro($d['desconto'] ?? 0)), $bruto);
            $total = dinheiro($bruto - $desc);
            $pago = 0; $princ = null;
            foreach ($pags as $g) { $pago += dinheiro($g['valor'] ?? 0); if (!$princ || dinheiro($g['valor'] ?? 0) > $princ[1]) $princ = [texto($g['forma'] ?? '', 20), dinheiro($g['valor'] ?? 0)]; }
            if ($pago + 0.001 < $total) erro('Pagamento menor que o total da venda');
            $troco = dinheiro($pago - $total);
            $cli = (int)($d['cliente'] ?? 0); if ($cli && !um('SELECT id FROM clientes WHERE id = ?', [$cli])) $cli = 0;
            q('INSERT INTO vendas (data, total, desconto, troco, pagamento, cliente_id, vendedor, caixa_id) VALUES (?,?,?,?,?,?,?,?)',
                [agora(), $total, $desc, $troco, $princ[0], $cli ?: null, $u['nome'], $caixa['id']]);
            $vid = (int)db()->lastInsertId();
            // NFC-e simulada: numeração sequencial pela venda; sem emissão fica NULL
            if (!empty($d['emitir'])) q('UPDATE vendas SET nfce = ? WHERE id = ?', [str_pad((string)$vid, 9, '0', STR_PAD_LEFT), $vid]);
            foreach ($linhas as [$p, $qtd, $preco]) {
                q('INSERT INTO venda_itens (venda_id, produto_id, nome, qtd, preco, custo) VALUES (?,?,?,?,?,?)', [$vid, $p['id'], $p['nome'], $qtd, $preco, $p['custo']]);
                q('UPDATE produtos SET estoque = estoque - ?, atualizado_em = ? WHERE id = ?', [$qtd, agora(), $p['id']]);
                $p['estoque'] = (int)$p['estoque'] - $qtd;
                registrar_mov($p, 'Venda', -$qtd, 'Venda #' . $vid, $u);
            }
            foreach ($pags as $g) q('INSERT INTO venda_pagamentos (venda_id, forma, valor) VALUES (?,?,?)', [$vid, texto($g['forma'] ?? '', 20), dinheiro($g['valor'] ?? 0)]);
            return carregar_vendas('id = ?', [$vid], PERFIS[$u['perfil']]['verCusto'])[0];
        });
        responder(['venda' => $venda]);
    }
    case 'venda.cancelar': {
        $u = exigir('cancelar');
        $motivo = texto($d['motivo'] ?? '', 255);
        if (mb_strlen($motivo) < 5) erro('Escreva o motivo (mínimo 5 letras)');
        $venda = transacao(function () use ($d, $u, $motivo) {
            $v = um('SELECT * FROM vendas WHERE id = ? FOR UPDATE', [(int)($d['id'] ?? 0)]);
            if (!$v) erro('Venda não encontrada', 404);
            if ($v['cancelada_em']) erro('Esta venda já foi cancelada', 409);
            foreach (todos('SELECT * FROM venda_itens WHERE venda_id = ?', [$v['id']]) as $i) {
                if ($i['produto_id'] === null) continue;
                q('UPDATE produtos SET estoque = estoque + ?, atualizado_em = ? WHERE id = ?', [$i['qtd'], agora(), $i['produto_id']]);
                $p = um('SELECT * FROM produtos WHERE id = ?', [$i['produto_id']]);
                if ($p) registrar_mov($p, 'Cancelamento', (int)$i['qtd'], 'Venda #' . $v['id'] . ' cancelada', $u);
            }
            q('UPDATE vendas SET cancelada_em = ?, cancelada_por = ?, cancelada_motivo = ? WHERE id = ?', [agora(), $u['nome'], $motivo, $v['id']]);
            return carregar_vendas('id = ?', [$v['id']], PERFIS[$u['perfil']]['verCusto'])[0];
        });
        responder(['venda' => $venda]);
    }

    // ===== Caixa =====
    case 'caixa.abrir': {
        $u = eu();
        $c = transacao(function () use ($u, $d) {
            if (um("SELECT id FROM caixas WHERE status = 'aberto' FOR UPDATE")) erro('Já existe um caixa aberto', 409);
            q('INSERT INTO caixas (operador, usuario_id, aberto_em, fundo, status) VALUES (?,?,?,?,?)', [$u['nome'], $u['id'], agora(), max(0, dinheiro($d['fundo'] ?? 0)), 'aberto']);
            return carregar_caixas('id = ?', [(int)db()->lastInsertId()])[0];
        });
        responder(['caixa' => $c]);
    }
    case 'caixa.movimento': {
        $u = eu();
        $caixa = um("SELECT id FROM caixas WHERE status = 'aberto' ORDER BY id DESC LIMIT 1");
        if (!$caixa) erro('Nenhum caixa aberto');
        $tipo = ($d['tipo'] ?? '') === 'suprimento' ? 'suprimento' : 'sangria';
        $valor = dinheiro($d['valor'] ?? 0);
        if ($valor <= 0) erro('Informe um valor maior que zero');
        q('INSERT INTO caixa_movimentos (caixa_id, tipo, valor, motivo, usuario, data) VALUES (?,?,?,?,?,?)', [$caixa['id'], $tipo, $valor, ou_nulo($d['motivo'] ?? '', 200), $u['nome'], agora()]);
        responder(['caixa' => carregar_caixas('id = ?', [$caixa['id']])[0]]);
    }
    case 'caixa.fechar': {
        $u = eu();
        $c = transacao(function () use ($u, $d) {
            $caixa = um("SELECT * FROM caixas WHERE status = 'aberto' ORDER BY id DESC LIMIT 1 FOR UPDATE");
            if (!$caixa) erro('Nenhum caixa aberto');
            $esp = esperado_caixa((int)$caixa['id']); $cont = dinheiro($d['contado'] ?? 0);
            q("UPDATE caixas SET status = 'fechado', fechado_em = ?, fechado_por = ?, esperado = ?, contado = ?, diferenca = ? WHERE id = ?",
                [agora(), $u['nome'], $esp, $cont, dinheiro($cont - $esp), $caixa['id']]);
            return carregar_caixas('id = ?', [$caixa['id']])[0];
        });
        responder(['caixa' => $c]);
    }

    // ===== Compras de fornecedor =====
    case 'compra.criar': {
        $u = exigir('gestao');
        $itens = is_array($d['itens'] ?? null) ? $d['itens'] : [];
        if (!$itens) erro('Adicione pelo menos um produto');
        $r = transacao(function () use ($u, $d, $itens) {
            $forn = (int)($d['fornecedor'] ?? 0); $f = $forn ? um('SELECT * FROM fornecedores WHERE id = ?', [$forn]) : null;
            $nota = ou_nulo($d['nota'] ?? '', 40);
            $total = 0; foreach ($itens as $i) $total += max(1, (int)($i['qtd'] ?? 1)) * max(0, dinheiro($i['custo'] ?? 0));
            $total = dinheiro($total);
            q('INSERT INTO compras (data, fornecedor_id, nota, total, usuario) VALUES (?,?,?,?,?)', [agora(), $f ? $f['id'] : null, $nota, $total, $u['nome']]);
            $cid = (int)db()->lastInsertId();
            foreach ($itens as $i) {
                $p = um('SELECT * FROM produtos WHERE id = ? FOR UPDATE', [(int)($i['id'] ?? 0)]);
                if (!$p) erro('Produto não encontrado', 404);
                $qtd = max(1, (int)($i['qtd'] ?? 1)); $custo = max(0, dinheiro($i['custo'] ?? 0));
                q('INSERT INTO compra_itens (compra_id, produto_id, qtd, custo) VALUES (?,?,?,?)', [$cid, $p['id'], $qtd, $custo]);
                if (!empty($d['atualizarCusto'])) q('UPDATE produtos SET estoque = estoque + ?, custo = ?, atualizado_em = ? WHERE id = ?', [$qtd, $custo, agora(), $p['id']]);
                else q('UPDATE produtos SET estoque = estoque + ?, atualizado_em = ? WHERE id = ?', [$qtd, agora(), $p['id']]);
                $p['estoque'] = (int)$p['estoque'] + $qtd;
                registrar_mov($p, 'Compra', $qtd, 'Compra #' . $cid . ($nota ? ' · NF ' . $nota : ''), $u);
            }
            $conta = null;
            if (!empty($d['lancarConta'])) {
                $venc = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($d['venc'] ?? '')) ? $d['venc'] : gmdate('Y-m-d', time() + 30 * 86400);
                q('INSERT INTO contas (tipo, descricao, valor, vencimento, pago, compra_id, criado_em) VALUES (?,?,?,?,0,?,?)',
                    ['pagar', 'Compra #' . $cid . ($f ? ' · ' . $f['nome'] : '') . ($nota ? ' · NF ' . $nota : ''), $total, $venc, $cid, agora()]);
                $conta = fmt_conta(um('SELECT * FROM contas WHERE id = ?', [db()->lastInsertId()]));
            }
            return ['id' => $cid, 'conta' => $conta];
        });
        responder($r);
    }

    // ===== Financeiro =====
    case 'conta.pago': {
        exigir('gestao');
        q('UPDATE contas SET pago = ? WHERE id = ?', [!empty($d['pago']) ? 1 : 0, (int)($d['id'] ?? 0)]);
        responder(['ok' => true]);
    }

    // ===== Configurações (somente administrador) =====
    case 'config.salvar': {
        $u = eu(); if ($u['perfil'] !== 'admin') erro('Somente a administradora altera as configurações.', 403);
        $permitidas = ['nome', 'cnpj', 'endereco', 'cidade', 'uf', 'fone', 'chavePix', 'nomePix', 'cidadePix', 'largura', 'rodape', 'metaMes', 'metaVendedora'];
        $s = db()->prepare('INSERT INTO config (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)');
        foreach ($permitidas as $k) if (array_key_exists($k, $d)) $s->execute([$k, texto($d[$k], 500)]);
        responder(['ok' => true]);
    }

    // ===== Usuários (somente administrador) =====
    case 'usuario.atualizar': {
        $u = eu(); if ($u['perfil'] !== 'admin') erro('Somente a administradora gerencia usuários.', 403);
        $id = (int)($d['id'] ?? 0);
        if ($id === (int)$u['id']) erro('Você não pode alterar o próprio acesso.');
        if (isset($d['perfil']) && isset(PERFIS[$d['perfil']])) q('UPDATE usuarios SET perfil = ? WHERE id = ?', [$d['perfil'], $id]);
        if (isset($d['status']) && in_array($d['status'], ['ativo', 'bloqueado', 'pendente'], true)) q('UPDATE usuarios SET status = ? WHERE id = ?', [$d['status'], $id]);
        $alvo = um('SELECT * FROM usuarios WHERE id = ?', [$id]);
        if (!$alvo) erro('Usuário não encontrado', 404);
        responder(['usuario' => usuario_publico($alvo)]);
    }

    default: erro('Ação desconhecida: ' . $acao, 404);
    }
} catch (PDOException $e) {
    error_log('[doze api] ' . $e->getMessage());
    if ($e->getCode() === '23000') erro('Registro duplicado ou em uso.', 409);
    erro('Erro no banco de dados.', 500);
}
