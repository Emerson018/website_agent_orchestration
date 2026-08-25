CREATE TABLE IF NOT EXISTS agendamentos_base (
    id SERIAL PRIMARY KEY,
    data_agendamento DATE NOT NULL,
    hora_agendamento TIME NOT NULL,
    duracao_minutos INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pendente',
    observacoes TEXT,
    cliente_id INT, -- Chave estrangeira para a tabela de clientes (a ser criada)
    profissional_id INT, -- Chave estrangeira para a tabela de profissionais (a ser criada)
    servico_id INT, -- Chave estrangeira para a tabela de serviços (a ser criada)
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    endereco TEXT
);

CREATE TABLE IF NOT EXISTS profissionais (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    especialidade VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS servicos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10, 2) NOT NULL
);


CREATE TABLE IF NOT EXISTS detalhes_agendamento_nicho (
    agendamento_base_id INT PRIMARY KEY REFERENCES agendamentos_base(id),
    cliente_id INT REFERENCES clientes(id),
    profissional_id INT REFERENCES profissionais(id),
    servico_id INT REFERENCES servicos(id)
);