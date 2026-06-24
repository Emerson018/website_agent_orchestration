-- Habilitar a extensão pgcrypto para gen_random_uuid() se necessário
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabela de Configurações da Loja
CREATE TABLE IF NOT EXISTS configuracoes_loja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave VARCHAR(255) UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(50),
    email VARCHAR(255),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Agendamentos Base
CREATE TABLE IF NOT EXISTS agendamentos_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fim TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'confirmado', -- ex: pendente, confirmado, cancelado, concluido
    referencia_recurso_id UUID, -- Referência flexível (serviço, profissional, vaga, etc.)
    valor_total DECIMAL(10, 2) DEFAULT 0.00,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar Row Level Security (RLS) nas tabelas
ALTER TABLE configuracoes_loja ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos_base ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- Políticas para configuracoes_loja
-- =====================================================================
-- Administrador autenticado tem controle total
CREATE POLICY "Admin total configuracoes_loja" 
ON configuracoes_loja 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Leitura pública das configurações (necessário para carregar horários, logo, cores no PWA)
CREATE POLICY "Leitura publica configuracoes_loja" 
ON configuracoes_loja 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- =====================================================================
-- Políticas para clientes
-- =====================================================================
-- Administrador autenticado tem controle total
CREATE POLICY "Admin total clientes" 
ON clientes 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Clientes públicos (não autenticados) podem cadastrar seus próprios dados ao fazer agendamento
CREATE POLICY "Insercao publica clientes" 
ON clientes 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- =====================================================================
-- Políticas para agendamentos_base
-- =====================================================================
-- Administrador autenticado tem controle total
CREATE POLICY "Admin total agendamentos_base" 
ON agendamentos_base 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Clientes públicos (não autenticados) podem realizar novos agendamentos no sistema
CREATE POLICY "Insercao publica agendamentos_base" 
ON agendamentos_base 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);
