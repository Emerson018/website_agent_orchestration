-- Habilitar a extensão pgcrypto para gen_random_uuid() se necessário
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabela de Configurações da Agenda
CREATE TABLE IF NOT EXISTS configuracao_agenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave VARCHAR(255) UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_nome VARCHAR(255) NOT NULL,
    cliente_telefone VARCHAR(50) NOT NULL,
    data DATE NOT NULL,
    horario VARCHAR(10) NOT NULL,
    pessoas INTEGER NOT NULL DEFAULT 1,
    observacoes TEXT,
    status VARCHAR(20) DEFAULT 'Confirmado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir dados padrão de funcionamento e horários
INSERT INTO configuracao_agenda (chave, valor)
VALUES 
('dias_funcionamento', '[2, 3, 4, 5, 6, 0]')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO configuracao_agenda (chave, valor)
VALUES 
('horarios_disponiveis', '["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"]')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO configuracao_agenda (chave, valor)
VALUES 
('vagas_padrao', '5')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO configuracao_agenda (chave, valor)
VALUES 
('limites_customizados', '{}')
ON CONFLICT (chave) DO NOTHING;

-- Habilitar Row Level Security (RLS)
ALTER TABLE configuracao_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- Políticas para configuracao_agenda
-- =====================================================================
CREATE POLICY "Admin total configuracao_agenda" 
ON configuracao_agenda 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Leitura publica configuracao_agenda" 
ON configuracao_agenda 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- =====================================================================
-- Políticas para agendamentos
-- =====================================================================
CREATE POLICY "Admin total agendamentos" 
ON agendamentos 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Insercao publica agendamentos" 
ON agendamentos 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Leitura publica agendamentos" 
ON agendamentos 
FOR SELECT 
TO anon, authenticated 
USING (true);
