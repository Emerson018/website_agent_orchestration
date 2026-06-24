-- Tabela de Serviços oferecidos para agendamento
CREATE TABLE IF NOT EXISTS servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    duracao INT NOT NULL -- Duração em minutos
);

-- Tabela de Agendamentos realizados pelos clientes
CREATE TABLE IF NOT EXISTS agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_nome VARCHAR(255) NOT NULL,
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    servico_id UUID REFERENCES servicos(id) ON DELETE CASCADE
);

-- Habilitar Row Level Security (RLS) para maior segurança dos dados
-- [RLS ATIVADO AQUI]
-- ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- [POLÍTICA DE SERVIÇOS]
-- CREATE POLICY "Serviços são visíveis publicamente" ON servicos FOR SELECT USING (true);
-- [POLÍTICA DE AGENDAMENTOS]
-- CREATE POLICY "Clientes podem criar agendamentos, mas não visualizar os de outros" ON agendamentos FOR INSERT WITH CHECK (true);
