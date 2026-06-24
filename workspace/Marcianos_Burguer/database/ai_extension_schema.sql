CREATE TABLE IF NOT EXISTS agendamentos_base (
    id SERIAL PRIMARY KEY,
    data_agendamento DATE NOT NULL,
    horario_inicio TIME NOT NULL,
    duracao_estimada INTERVAL '30 MINUTE' NOT NULL, -- Ajuste conforme necessário
    status VARCHAR(20) DEFAULT 'pendente',
    observacoes TEXT,
    id_cliente INTEGER  -- Chave estrangeira para tabela de clientes (a ser criada)
);

CREATE TABLE IF NOT EXISTS detalhes_agendamento_nicho (
    id SERIAL PRIMARY KEY,
    id_agendamento_base INTEGER REFERENCES agendamentos_base(id),
    tipo_servico VARCHAR(50) NOT NULL, -- 'Reserva de Mesa', 'Pedido Take Away', etc.
    preco DECIMAL(10, 2),
    num_pessoas INTEGER,
    observacoes TEXT
);

CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    telefone VARCHAR(20)
);


-- Exemplo de inserção para testar
INSERT INTO clientes (nome, email, telefone) VALUES ('João da Silva', 'joao@example.com', '5555555555');
INSERT INTO agendamentos_base (data_agendamento, horario_inicio, duracao_estimada, id_cliente) VALUES ('2024-11-28', '19:30', '1:00:00', 1);
INSERT INTO detalhes_agendamento_nicho (id_agendamento_base, tipo_servico, preco, num_pessoas, observacoes) VALUES (1, 'Reserva de Mesa (Rodízio)', 45.00, 2, 'Para duas pessoas');