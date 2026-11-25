-- Doze Cosméticos · estrutura do banco MySQL (vlpric51_dozecosmeticos)
-- Importar pelo phpMyAdmin da HostGator: selecione o banco > aba Importar > este arquivo.
-- Pode ser importado de novo sem apagar dados (CREATE TABLE IF NOT EXISTS / INSERT IGNORE).
-- Datas em UTC. Valores em reais com 2 casas.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  perfil ENUM('admin','gerente','vendedora') NOT NULL DEFAULT 'vendedora',
  status ENUM('ativo','pendente','bloqueado') NOT NULL DEFAULT 'pendente',
  criado_em DATETIME NOT NULL,
  UNIQUE KEY uk_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS config (
  chave VARCHAR(50) PRIMARY KEY,
  valor TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categorias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(60) NOT NULL,
  UNIQUE KEY uk_categorias_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS produtos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ean VARCHAR(32) NOT NULL,
  sku VARCHAR(40) NULL,
  nome VARCHAR(160) NOT NULL,
  linha VARCHAR(160) NULL,
  categoria VARCHAR(60) NOT NULL,
  marca VARCHAR(80) NOT NULL,
  variacao VARCHAR(80) NULL,
  custo DECIMAL(10,2) NOT NULL DEFAULT 0,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  estoque INT NOT NULL DEFAULT 0,
  minimo INT NOT NULL DEFAULT 0,
  validade CHAR(7) NULL,            -- AAAA-MM
  fiscal VARCHAR(20) NULL,          -- NCM / CFOP: 0000.00.00 / 0000
  criado_em DATETIME NOT NULL,
  atualizado_em DATETIME NOT NULL,
  UNIQUE KEY uk_produtos_ean (ean),
  UNIQUE KEY uk_produtos_sku (sku),
  KEY ix_produtos_linha (linha),
  KEY ix_produtos_marca (marca)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clientes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  cpf VARCHAR(14) NULL,
  fone VARCHAR(20) NULL,
  nasc DATE NULL,
  criado_em DATETIME NOT NULL,
  KEY ix_clientes_cpf (cpf)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fornecedores (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  cnpj VARCHAR(18) NULL,
  fone VARCHAR(20) NULL,
  contato VARCHAR(80) NULL,
  email VARCHAR(160) NULL,
  criado_em DATETIME NOT NULL,
  KEY ix_fornecedores_cnpj (cnpj)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS caixas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  operador VARCHAR(120) NOT NULL,
  usuario_id INT UNSIGNED NULL,
  aberto_em DATETIME NOT NULL,
  fundo DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('aberto','fechado') NOT NULL DEFAULT 'aberto',
  fechado_em DATETIME NULL,
  fechado_por VARCHAR(120) NULL,
  esperado DECIMAL(10,2) NULL,
  contado DECIMAL(10,2) NULL,
  diferenca DECIMAL(10,2) NULL,
  KEY ix_caixas_status (status),
  CONSTRAINT fk_caixas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS caixa_movimentos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  caixa_id INT UNSIGNED NOT NULL,
  tipo ENUM('sangria','suprimento') NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  motivo VARCHAR(200) NULL,
  usuario VARCHAR(120) NOT NULL,
  data DATETIME NOT NULL,
  CONSTRAINT fk_caixamov_caixa FOREIGN KEY (caixa_id) REFERENCES caixas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vendas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  data DATETIME NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  desconto DECIMAL(10,2) NOT NULL DEFAULT 0,
  troco DECIMAL(10,2) NOT NULL DEFAULT 0,
  pagamento VARCHAR(20) NOT NULL,   -- forma principal (maior valor)
  cliente_id INT UNSIGNED NULL,
  vendedor VARCHAR(120) NOT NULL,
  nfce VARCHAR(20) NULL,            -- NULL = concluída sem NFC-e
  caixa_id INT UNSIGNED NULL,
  cancelada_em DATETIME NULL,
  cancelada_por VARCHAR(120) NULL,
  cancelada_motivo VARCHAR(255) NULL,
  KEY ix_vendas_data (data),
  CONSTRAINT fk_vendas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  CONSTRAINT fk_vendas_caixa FOREIGN KEY (caixa_id) REFERENCES caixas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS venda_itens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  venda_id INT UNSIGNED NOT NULL,
  produto_id INT UNSIGNED NULL,
  nome VARCHAR(160) NOT NULL,       -- nome no momento da venda
  qtd INT NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  custo DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_vitens_venda FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
  CONSTRAINT fk_vitens_produto FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS venda_pagamentos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  venda_id INT UNSIGNED NOT NULL,
  forma VARCHAR(20) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_vpag_venda FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS estoque_movimentos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  produto_id INT UNSIGNED NULL,
  produto VARCHAR(160) NOT NULL,
  categoria VARCHAR(60) NULL,
  tipo VARCHAR(20) NOT NULL,        -- Entrada, Ajuste, Venda, Cancelamento, Compra
  qtd INT NOT NULL,
  saldo INT NULL,
  motivo VARCHAR(255) NULL,
  usuario VARCHAR(120) NOT NULL,
  data DATETIME NOT NULL,
  KEY ix_estmov_data (data),
  CONSTRAINT fk_estmov_produto FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS compras (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  data DATETIME NOT NULL,
  fornecedor_id INT UNSIGNED NULL,
  nota VARCHAR(40) NULL,
  total DECIMAL(10,2) NOT NULL,
  usuario VARCHAR(120) NOT NULL,
  CONSTRAINT fk_compras_fornecedor FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS compra_itens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  compra_id INT UNSIGNED NOT NULL,
  produto_id INT UNSIGNED NULL,
  qtd INT NOT NULL,
  custo DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_citens_compra FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
  CONSTRAINT fk_citens_produto FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('pagar','receber') NOT NULL,
  descricao VARCHAR(200) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  vencimento DATE NOT NULL,
  pago TINYINT(1) NOT NULL DEFAULT 0,
  compra_id INT UNSIGNED NULL,
  criado_em DATETIME NOT NULL,
  KEY ix_contas_venc (vencimento),
  CONSTRAINT fk_contas_compra FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cadastros base
INSERT IGNORE INTO categorias (nome) VALUES
  ('Maquiagem'), ('Skincare'), ('Cabelos'), ('Perfumaria'), ('Corpo & Banho'), ('Unhas'), ('Acessórios');

INSERT IGNORE INTO config (chave, valor) VALUES
  ('nome', 'DOZE COSMÉTICOS LTDA'), ('cnpj', ''), ('endereco', ''), ('cidade', 'Limeira'), ('uf', 'SP'), ('fone', ''),
  ('chavePix', ''), ('nomePix', 'DOZE COSMETICOS'), ('cidadePix', 'LIMEIRA'), ('largura', '80'),
  ('rodape', 'Obrigada pela preferência! Trocas em até 7 dias com o cupom.'), ('metaMes', '0'), ('metaVendedora', '0');

-- Usuários: a primeira conta criada na tela de login vira Administrador já liberado.
