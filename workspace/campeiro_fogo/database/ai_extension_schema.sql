CREATE TABLE IF NOT EXISTS agendamentos_base (
    id SERIAL PRIMARY KEY,
    data_agendamento DATE NOT NULL,
    horario TIME(MINUTE) NOT NULL,
    numero_pessoas INTEGER NOT NULL CHECK (numero_pessoas > 0),
    status VARCHAR(20) DEFAULT 'pendente' NOT NULL, -- Ex: pendente, confirmado, cancelado, completo
    observacoes TEXT,
    id_cliente INTEGER REFERENCES clientes_base(id)  -- Adicionado para rastrear o cliente
);

CREATE TABLE IF NOT EXISTS clientes_base (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    endereco TEXT
);


CREATE TABLE IF NOT EXISTS detalhes_agendamento_nicho (
    id_agendamento_base INTEGER PRIMARY KEY REFERENCES agendamentos_base(id),
    tipo_servico VARCHAR(255) NOT NULL, -- Ex: Churrasco Tradicional, Pratos Regionais
    descricao TEXT,
    preco DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS cardapio (
    id SERIAL PRIMARY KEY,
    nome_prato VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10, 2) NOT NULL,
    imagem_url VARCHAR(255), -- URL da imagem do prato
    tipo VARCHAR(50)  -- Ex: Carne, Acompanhamento, Bebida
);

CREATE TABLE IF NOT EXISTS detalhes_cardapio (
    id_agendamento_base INTEGER PRIMARY KEY REFERENCES agendamentos_base(id),
    id_cardapio INTEGER PRIMARY KEY REFERENCES cardapio(id),
    quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0)
);