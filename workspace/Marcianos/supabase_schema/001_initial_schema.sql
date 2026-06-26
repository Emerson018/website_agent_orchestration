-- Tabela de Agendamentos
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

-- Tabela de Configurações da Agenda
CREATE TABLE IF NOT EXISTS configuracao_agenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave VARCHAR(255) UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir dados padrão de funcionamento e horários
INSERT INTO configuracao_agenda (chave, valor)
VALUES 
('dias_funcionamento', '[2, 3, 4, 5, 6, 0]') -- Terça a Domingo (0=Domingo, 1=Segunda, 2=Terça...)
ON CONFLICT (chave) DO NOTHING;

INSERT INTO configuracao_agenda (chave, valor)
VALUES 
('horarios_disponiveis', '["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"]')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO configuracao_agenda (chave, valor)
VALUES 
('vagas_padrao', '5') -- Capacidade padrão de 5 pessoas/lugares por slot
ON CONFLICT (chave) DO NOTHING;

INSERT INTO configuracao_agenda (chave, valor)
VALUES 
('limites_customizados', '{}') -- Mapeamento de exceções
ON CONFLICT (chave) DO NOTHING;
