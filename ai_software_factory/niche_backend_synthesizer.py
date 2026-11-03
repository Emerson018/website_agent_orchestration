import os
import re
from typing import Dict, Any, List, Optional

def normalize_niche_family(niche_str: Optional[str]) -> str:
    """Classifica o nicho bruto do Google Maps em uma das três famílias canônicas."""
    if not niche_str:
        return "servicos"
    n = niche_str.lower().strip()
    
    # Serviços explícitos de alta prioridade (para não colidir 'barber' com 'bar')
    if any(k in n for k in ["barber", "barbearia", "salao", "salon", "estetica", "clinica", "dentist", "medico", "advocacia", "consultoria"]):
        return "servicos"

    # Gastronomia
    gastronomia_keywords = ["food", "restaurant", "meal", "cafe", "pizzaria", "hamburguer", "lanche", "gastronomia", "bakery", "padaria", "bistro", "choperia"]
    if any(k in n for k in gastronomia_keywords) or re.search(r"\bbar\b", n):
        return "gastronomia"
    
    # Varejo / Comércio
    if any(k in n for k in ["store", "clothing", "shop", "pet", "mercado", "loja", "varejo", "eletronico", "comercio", "boutique", "calcados"]):
        return "varejo"
        
    # Padrão: Serviços / Saúde / Beleza
    return "servicos"


def generate_gastronomia_backend(routes_dir: str, db_dir: str, company_name: str) -> List[str]:
    created_files = []
    
    # 1. routes/cardapio.js
    cardapio_code = f"""import {{ Router }} from 'express';
import {{ z }} from 'zod';
import {{ validateRequest }} from '../validate.js';
import {{ getDbClient }} from '../db.js';

const router = Router();

const itemSchema = z.object({{
  nome: z.string().min(2, 'Nome do prato deve ter ao menos 2 caracteres'),
  descricao: z.string().optional().default(''),
  preco: z.number().positive('Preço deve ser maior que zero'),
  categoria: z.string().min(2, 'Categoria obrigatória'),
  disponivel: z.boolean().optional().default(true),
  foto_url: z.string().url().optional(),
}});

// GET /api/cardapio
router.get('/', async (req, res, next) => {{
  try {{
    const db = getDbClient();
    if (db) {{
      const {{ data, error }} = await db.from('produtos').select('*').order('categoria');
      if (!error && data) return res.json({{ success: true, itens: data }});
    }}
    // Fallback de inicialização
    res.json({{
      success: true,
      empresa: '{company_name}',
      itens: [
        {{ id: 1, nome: 'Especial da Casa', preco: 48.0, categoria: 'Principais', disponivel: true }},
        {{ id: 2, nome: 'Bebida Artesanal', preco: 14.0, categoria: 'Bebidas', disponivel: true }},
      ],
    }});
  }} catch (err) {{
    next(err);
  }}
}});

// POST /api/cardapio (com validação Zod)
router.post('/', validateRequest({{ body: itemSchema }}), async (req, res, next) => {{
  try {{
    const db = getDbClient();
    if (db) {{
      const {{ data, error }} = await db.from('produtos').insert([req.body]).select().single();
      if (!error) return res.status(201).json({{ success: true, item: data }});
    }}
    res.status(201).json({{ success: true, item: {{ id: Date.now(), ...req.body }} }});
  }} catch (err) {{
    next(err);
  }}
}});

export default router;
"""
    cardapio_path = os.path.join(routes_dir, "cardapio.js")
    with open(cardapio_path, "w", encoding="utf-8") as f:
        f.write(cardapio_code)
    created_files.append(cardapio_path)

    # 2. routes/pedidos.js
    pedidos_code = f"""import {{ Router }} from 'express';
import {{ z }} from 'zod';
import {{ validateRequest }} from '../validate.js';
import {{ getDbClient }} from '../db.js';

const router = Router();

const pedidoSchema = z.object({{
  cliente_nome: z.string().min(2, 'Nome do cliente obrigatório'),
  cliente_telefone: z.string().min(8, 'Telefone de contato obrigatório'),
  itens: z.array(z.object({{
    nome: z.string(),
    quantidade: z.number().int().positive(),
    preco_unitario: z.number().positive(),
  }})).min(1, 'Pedido deve conter ao menos um item'),
  total: z.number().positive(),
  endereco_entrega: z.string().min(5, 'Endereço de entrega obrigatório'),
  observacoes: z.string().optional(),
}});

// POST /api/pedidos
router.post('/', validateRequest({{ body: pedidoSchema }}), async (req, res, next) => {{
  try {{
    const db = getDbClient();
    const novoPedido = {{
      id: `PED-${{Date.now()}}`,
      ...req.body,
      status: 'recebido',
      created_at: new Date().toISOString(),
    }};
    if (db) {{
      await db.from('pedidos').insert([novoPedido]);
    }}
    res.status(201).json({{
      success: true,
      mensagem: 'Pedido recebido com sucesso!',
      pedido: novoPedido,
    }});
  }} catch (err) {{
    next(err);
  }}
}});

export default router;
"""
    pedidos_path = os.path.join(routes_dir, "pedidos.js")
    with open(pedidos_path, "w", encoding="utf-8") as f:
        f.write(pedidos_code)
    created_files.append(pedidos_path)

    # 3. database/001_gastronomia_schema.sql
    schema_code = """-- Tabelas de Gastronomia & Pedidos
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  disponivel BOOLEAN DEFAULT TRUE,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedidos (
  id VARCHAR(100) PRIMARY KEY,
  cliente_nome VARCHAR(255) NOT NULL,
  cliente_telefone VARCHAR(50) NOT NULL,
  itens JSONB NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  endereco_entrega TEXT NOT NULL,
  observacoes TEXT,
  status VARCHAR(50) DEFAULT 'recebido',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
"""
    schema_path = os.path.join(db_dir, "001_gastronomia_schema.sql")
    with open(schema_path, "w", encoding="utf-8") as f:
        f.write(schema_code)
    created_files.append(schema_path)

    return created_files


def generate_servicos_backend(routes_dir: str, db_dir: str, company_name: str) -> List[str]:
    created_files = []
    
    # 1. routes/servicos.js
    servicos_code = f"""import {{ Router }} from 'express';
import {{ z }} from 'zod';
import {{ validateRequest }} from '../validate.js';
import {{ getDbClient }} from '../db.js';

const router = Router();

const servicoSchema = z.object({{
  nome: z.string().min(2, 'Nome do serviço obrigatório'),
  duracao_minutos: z.number().int().positive().default(30),
  preco: z.number().positive('Preço deve ser positivo'),
  categoria: z.string().optional().default('Geral'),
  descricao: z.string().optional(),
}});

// GET /api/servicos
router.get('/', async (req, res, next) => {{
  try {{
    const db = getDbClient();
    if (db) {{
      const {{ data, error }} = await db.from('servicos').select('*').order('nome');
      if (!error && data) return res.json({{ success: true, servicos: data }});
    }}
    res.json({{
      success: true,
      empresa: '{company_name}',
      servicos: [
        {{ id: 1, nome: 'Atendimento Especializado', duracao_minutos: 45, preco: 90.0 }},
        {{ id: 2, nome: 'Consulta / Avaliação', duracao_minutos: 30, preco: 60.0 }},
      ],
    }});
  }} catch (err) {{
    next(err);
  }}
}});

// POST /api/servicos
router.post('/', validateRequest({{ body: servicoSchema }}), async (req, res, next) => {{
  try {{
    const db = getDbClient();
    if (db) {{
      const {{ data, error }} = await db.from('servicos').insert([req.body]).select().single();
      if (!error) return res.status(201).json({{ success: true, servico: data }});
    }}
    res.status(201).json({{ success: true, servico: {{ id: Date.now(), ...req.body }} }});
  }} catch (err) {{
    next(err);
  }}
}});

export default router;
"""
    servicos_path = os.path.join(routes_dir, "servicos.js")
    with open(servicos_path, "w", encoding="utf-8") as f:
        f.write(servicos_code)
    created_files.append(servicos_path)

    # 2. routes/agendamentos.js
    agendamentos_code = f"""import {{ Router }} from 'express';
import {{ z }} from 'zod';
import {{ validateRequest }} from '../validate.js';
import {{ getDbClient }} from '../db.js';

const router = Router();

const agendamentoSchema = z.object({{
  cliente_nome: z.string().min(2, 'Nome do cliente obrigatório'),
  cliente_telefone: z.string().min(8, 'Telefone obrigatório'),
  servico_nome: z.string().min(2, 'Nome do serviço obrigatório'),
  data: z.string().regex(/^\\d{{4}}-\\d{{2}}-\\d{{2}}$/, 'Data deve estar no formato YYYY-MM-DD'),
  horario: z.string().regex(/^\\d{{2}}:\\d{{2}}$/, 'Horário deve estar no formato HH:MM'),
  observacoes: z.string().optional(),
}});

// POST /api/agendamentos
router.post('/', validateRequest({{ body: agendamentoSchema }}), async (req, res, next) => {{
  try {{
    const db = getDbClient();
    const novoAgendamento = {{
      id: `AG-${{Date.now()}}`,
      ...req.body,
      status: 'Confirmado',
      created_at: new Date().toISOString(),
    }};
    if (db) {{
      await db.from('agendamentos').insert([novoAgendamento]);
    }}
    res.status(201).json({{
      success: true,
      mensagem: 'Horário reservado com sucesso!',
      agendamento: novoAgendamento,
    }});
  }} catch (err) {{
    next(err);
  }}
}});

export default router;
"""
    agendamentos_path = os.path.join(routes_dir, "agendamentos.js")
    with open(agendamentos_path, "w", encoding="utf-8") as f:
        f.write(agendamentos_code)
    created_files.append(agendamentos_path)

    # 3. database/001_servicos_schema.sql
    schema_code = """-- Tabelas de Serviços & Agendamentos
CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  duracao_minutos INTEGER DEFAULT 30,
  preco NUMERIC(10,2) NOT NULL,
  categoria VARCHAR(100) DEFAULT 'Geral',
  descricao TEXT,
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
"""
    schema_path = os.path.join(db_dir, "001_servicos_schema.sql")
    with open(schema_path, "w", encoding="utf-8") as f:
        f.write(schema_code)
    created_files.append(schema_path)

    return created_files


def generate_varejo_backend(routes_dir: str, db_dir: str, company_name: str) -> List[str]:
    created_files = []
    
    # 1. routes/produtos.js
    produtos_code = f"""import {{ Router }} from 'express';
import {{ z }} from 'zod';
import {{ validateRequest }} from '../validate.js';
import {{ getDbClient }} from '../db.js';

const router = Router();

const produtoSchema = z.object({{
  nome: z.string().min(2, 'Nome do produto obrigatório'),
  preco: z.number().positive('Preço deve ser positivo'),
  categoria: z.string().min(2, 'Categoria obrigatória'),
  estoque: z.number().int().nonnegative().default(10),
  descricao: z.string().optional(),
  foto_url: z.string().url().optional(),
}});

// GET /api/produtos
router.get('/', async (req, res, next) => {{
  try {{
    const db = getDbClient();
    if (db) {{
      const {{ data, error }} = await db.from('produtos_varejo').select('*');
      if (!error && data) return res.json({{ success: true, produtos: data }});
    }}
    res.json({{
      success: true,
      empresa: '{company_name}',
      produtos: [
        {{ id: 1, nome: 'Produto Destaque', preco: 79.9, estoque: 15, categoria: 'Novidades' }},
        {{ id: 2, nome: 'Item Premium', preco: 129.0, estoque: 8, categoria: 'Coleção' }},
      ],
    }});
  }} catch (err) {{
    next(err);
  }}
}});

// POST /api/produtos
router.post('/', validateRequest({{ body: produtoSchema }}), async (req, res, next) => {{
  try {{
    const db = getDbClient();
    if (db) {{
      const {{ data, error }} = await db.from('produtos_varejo').insert([req.body]).select().single();
      if (!error) return res.status(201).json({{ success: true, produto: data }});
    }}
    res.status(201).json({{ success: true, produto: {{ id: Date.now(), ...req.body }} }});
  }} catch (err) {{
    next(err);
  }}
}});

export default router;
"""
    produtos_path = os.path.join(routes_dir, "produtos.js")
    with open(produtos_path, "w", encoding="utf-8") as f:
        f.write(produtos_code)
    created_files.append(produtos_path)

    # 2. routes/carrinho.js
    carrinho_code = f"""import {{ Router }} from 'express';
import {{ z }} from 'zod';
import {{ validateRequest }} from '../validate.js';
import {{ getDbClient }} from '../db.js';

const router = Router();

const checkoutSchema = z.object({{
  cliente_nome: z.string().min(2, 'Nome obrigatório'),
  cliente_telefone: z.string().min(8, 'Telefone obrigatório'),
  itens: z.array(z.object({{
    produto_id: z.any(),
    nome: z.string(),
    quantidade: z.number().int().positive(),
    preco: z.number().positive(),
  }})).min(1, 'Carrinho vazio'),
  total: z.number().positive(),
  metodo_pagamento: z.enum(['pix', 'cartao', 'dinheiro']).default('pix'),
  endereco_entrega: z.string().min(5, 'Endereço obrigatório'),
}});

// POST /api/carrinho/checkout
router.post('/checkout', validateRequest({{ body: checkoutSchema }}), async (req, res, next) => {{
  try {{
    const db = getDbClient();
    const pedido = {{
      id: `LOJA-${{Date.now()}}`,
      ...req.body,
      status: 'confirmado',
      created_at: new Date().toISOString(),
    }};
    if (db) {{
      await db.from('pedidos_varejo').insert([pedido]);
    }}
    res.status(201).json({{
      success: true,
      mensagem: 'Compra finalizada com sucesso!',
      pedido,
    }});
  }} catch (err) {{
    next(err);
  }}
}});

export default router;
"""
    carrinho_path = os.path.join(routes_dir, "carrinho.js")
    with open(carrinho_path, "w", encoding="utf-8") as f:
        f.write(carrinho_code)
    created_files.append(carrinho_path)

    # 3. database/001_varejo_schema.sql
    schema_code = """-- Tabelas de Varejo & Catálogo
CREATE TABLE IF NOT EXISTS produtos_varejo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  estoque INTEGER DEFAULT 10,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedidos_varejo (
  id VARCHAR(100) PRIMARY KEY,
  cliente_nome VARCHAR(255) NOT NULL,
  cliente_telefone VARCHAR(50) NOT NULL,
  itens JSONB NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  metodo_pagamento VARCHAR(20) DEFAULT 'pix',
  endereco_entrega TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmado',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
"""
    schema_path = os.path.join(db_dir, "001_varejo_schema.sql")
    with open(schema_path, "w", encoding="utf-8") as f:
        f.write(schema_code)
    created_files.append(schema_path)

    return created_files


def synthesize_niche_backend(project_path: str, niche: Optional[str] = None, company_name: str = "Empresa") -> Dict[str, Any]:
    """
    Sintetiza as rotas de backend e schemas de banco específicos para o nicho detectado no Google Maps.
    """
    family = normalize_niche_family(niche)
    routes_dir = os.path.join(project_path, "backend", "routes")
    db_dir = os.path.join(project_path, "database")
    
    os.makedirs(routes_dir, exist_ok=True)
    os.makedirs(db_dir, exist_ok=True)
    
    if family == "gastronomia":
        files = generate_gastronomia_backend(routes_dir, db_dir, company_name)
    elif family == "varejo":
        files = generate_varejo_backend(routes_dir, db_dir, company_name)
    else:
        files = generate_servicos_backend(routes_dir, db_dir, company_name)
        
    return {
        "success": True,
        "niche_family": family,
        "created_files": files,
        "routes_mounted": [os.path.basename(f).replace(".js", "") for f in files if f.endswith(".js")],
    }
