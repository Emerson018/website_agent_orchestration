-- Tabelas de Serviços & Agendamentos
CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  duracao_minutos INTEGER DEFAULT 30,
  preco NUMERIC(10,2) NOT NULL,
  categoria VARCHAR(100) DEFAULT 'Geral',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id VARCHAR(100) PRIMARY KEY,
  cliente_nome VARCHAR(255) NOT NULL,
  cliente_telefone VARCHAR(50) NOT NULL,
  servico_nome VARCHAR(255) NOT NULL,
  data DATE NOT NULL,
  horario VARCHAR(10) NOT NULL,
  observacoes TEXT,
  status VARCHAR(50) DEFAULT 'Confirmado',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
