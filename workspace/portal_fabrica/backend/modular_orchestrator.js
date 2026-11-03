import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../');

/**
 * Normaliza o nicho bruto para uma das três famílias canônicas
 */
export function normalizeNicheFamily(rawNiche) {
  if (!rawNiche || typeof rawNiche !== 'string') return 'servicos';
  const n = rawNiche.toLowerCase().trim();

  // Serviços explícitos de alta prioridade (para não confundir barber com bar)
  if (['barber', 'barbearia', 'salao', 'salon', 'estetica', 'clinica', 'dentist', 'medico', 'advocacia', 'consultoria'].some((k) => n.includes(k))) {
    return 'servicos';
  }

  // Gastronomia
  const gastroKeywords = ['food', 'restaurant', 'meal', 'cafe', 'pizzaria', 'hamburguer', 'lanche', 'gastronomia', 'bakery', 'padaria', 'bistro', 'choperia'];
  if (gastroKeywords.some((k) => n.includes(k)) || /\bbar\b/.test(n)) {
    return 'gastronomia';
  }

  // Varejo / Comércio
  if (['store', 'clothing', 'shop', 'pet', 'mercado', 'loja', 'varejo', 'eletronico', 'comercio', 'boutique', 'calcados'].some((k) => n.includes(k))) {
    return 'varejo';
  }

  return 'servicos';
}

/**
 * Converte nome em slug seguro
 */
export function sanitizeSlug(name) {
  const clean = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || 'app_customizado';
}

/**
 * Copia diretório recursivamente excluindo pastas pesadas
 */
function copyDirSync(src, dest, ignoreList = ['node_modules', 'dist', '.git']) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoreList.includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath, ignoreList);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Sintetiza rotas de backend de acordo com o nicho
 */
function synthesizeNicheRoutes(backendRoutesDir, dbDir, nicheFamily, companyName) {
  fs.mkdirSync(backendRoutesDir, { recursive: true });
  fs.mkdirSync(dbDir, { recursive: true });

  if (nicheFamily === 'gastronomia') {
    // 1. routes/cardapio.js
    const cardapioCode = `import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../validate.js';
import { getDbClient } from '../db.js';

const router = Router();

const itemSchema = z.object({
  nome: z.string().min(2, 'Nome do prato deve ter ao menos 2 caracteres'),
  descricao: z.string().optional().default(''),
  preco: z.number().positive('Preço deve ser maior que zero'),
  categoria: z.string().min(2, 'Categoria obrigatória'),
  disponivel: z.boolean().optional().default(true),
});

// GET /api/cardapio
router.get('/', async (req, res, next) => {
  try {
    const db = getDbClient();
    if (db) {
      const { data, error } = await db.from('produtos').select('*').order('categoria');
      if (!error && data) return res.json({ success: true, itens: data });
    }
    res.json({
      success: true,
      empresa: '${companyName}',
      itens: [
        { id: 1, nome: 'Especial da Casa', preco: 48.0, categoria: 'Principais', disponivel: true },
        { id: 2, nome: 'Bebida Artesanal', preco: 14.0, categoria: 'Bebidas', disponivel: true },
      ],
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/cardapio
router.post('/', validateRequest({ body: itemSchema }), async (req, res, next) => {
  try {
    const db = getDbClient();
    if (db) {
      const { data, error } = await db.from('produtos').insert([req.body]).select().single();
      if (!error) return res.status(201).json({ success: true, item: data });
    }
    res.status(201).json({ success: true, item: { id: Date.now(), ...req.body } });
  } catch (err) {
    next(err);
  }
});

export default router;
`;
    fs.writeFileSync(path.join(backendRoutesDir, 'cardapio.js'), cardapioCode, 'utf-8');

    // 2. routes/pedidos.js
    const pedidosCode = `import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../validate.js';
import { getDbClient } from '../db.js';

const router = Router();

const pedidoSchema = z.object({
  cliente_nome: z.string().min(2, 'Nome do cliente obrigatório'),
  cliente_telefone: z.string().min(8, 'Telefone de contato obrigatório'),
  itens: z.array(z.object({
    nome: z.string(),
    quantidade: z.number().int().positive(),
    preco_unitario: z.number().positive(),
  })).min(1, 'Pedido deve conter ao menos um item'),
  total: z.number().positive(),
  endereco_entrega: z.string().min(5, 'Endereço de entrega obrigatório'),
  observacoes: z.string().optional(),
});

// POST /api/pedidos
router.post('/', validateRequest({ body: pedidoSchema }), async (req, res, next) => {
  try {
    const db = getDbClient();
    const novoPedido = {
      id: \`PED-\${Date.now()}\`,
      ...req.body,
      status: 'recebido',
      created_at: new Date().toISOString(),
    };
    if (db) {
      await db.from('pedidos').insert([novoPedido]);
    }
    res.status(201).json({
      success: true,
      mensagem: 'Pedido recebido com sucesso!',
      pedido: novoPedido,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
`;
    fs.writeFileSync(path.join(backendRoutesDir, 'pedidos.js'), pedidosCode, 'utf-8');

    // 3. database/001_gastronomia_schema.sql
    const schemaCode = `-- Tabelas de Gastronomia & Pedidos
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  disponivel BOOLEAN DEFAULT TRUE,
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
`;
    fs.writeFileSync(path.join(dbDir, '001_gastronomia_schema.sql'), schemaCode, 'utf-8');
  } else if (nicheFamily === 'varejo') {
    // 1. routes/produtos.js
    const produtosCode = `import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../validate.js';
import { getDbClient } from '../db.js';

const router = Router();

const produtoSchema = z.object({
  nome: z.string().min(2, 'Nome do produto obrigatório'),
  preco: z.number().positive('Preço deve ser positivo'),
  categoria: z.string().min(2, 'Categoria obrigatória'),
  estoque: z.number().int().nonnegative().default(10),
});

// GET /api/produtos
router.get('/', async (req, res, next) => {
  try {
    const db = getDbClient();
    if (db) {
      const { data, error } = await db.from('produtos_varejo').select('*');
      if (!error && data) return res.json({ success: true, produtos: data });
    }
    res.json({
      success: true,
      empresa: '${companyName}',
      produtos: [
        { id: 1, nome: 'Produto Destaque', preco: 79.9, estoque: 15, categoria: 'Novidades' },
        { id: 2, nome: 'Item Premium', preco: 129.0, estoque: 8, categoria: 'Coleção' },
      ],
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/produtos
router.post('/', validateRequest({ body: produtoSchema }), async (req, res, next) => {
  try {
    const db = getDbClient();
    if (db) {
      const { data, error } = await db.from('produtos_varejo').insert([req.body]).select().single();
      if (!error) return res.status(201).json({ success: true, produto: data });
    }
    res.status(201).json({ success: true, produto: { id: Date.now(), ...req.body } });
  } catch (err) {
    next(err);
  }
});

export default router;
`;
    fs.writeFileSync(path.join(backendRoutesDir, 'produtos.js'), produtosCode, 'utf-8');

    // 2. routes/carrinho.js
    const carrinhoCode = `import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../validate.js';
import { getDbClient } from '../db.js';

const router = Router();

const checkoutSchema = z.object({
  cliente_nome: z.string().min(2, 'Nome obrigatório'),
  cliente_telefone: z.string().min(8, 'Telefone obrigatório'),
  itens: z.array(z.object({
    produto_id: z.any(),
    nome: z.string(),
    quantidade: z.number().int().positive(),
    preco: z.number().positive(),
  })).min(1, 'Carrinho vazio'),
  total: z.number().positive(),
  metodo_pagamento: z.enum(['pix', 'cartao', 'dinheiro']).default('pix'),
  endereco_entrega: z.string().min(5, 'Endereço obrigatório'),
});

// POST /api/carrinho/checkout
router.post('/checkout', validateRequest({ body: checkoutSchema }), async (req, res, next) => {
  try {
    const db = getDbClient();
    const pedido = {
      id: \`LOJA-\${Date.now()}\`,
      ...req.body,
      status: 'confirmado',
      created_at: new Date().toISOString(),
    };
    if (db) {
      await db.from('pedidos_varejo').insert([pedido]);
    }
    res.status(201).json({
      success: true,
      mensagem: 'Compra finalizada com sucesso!',
      pedido,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
`;
    fs.writeFileSync(path.join(backendRoutesDir, 'carrinho.js'), carrinhoCode, 'utf-8');

    // 3. database/001_varejo_schema.sql
    const schemaCode = `-- Tabelas de Varejo & Catálogo
CREATE TABLE IF NOT EXISTS produtos_varejo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  estoque INTEGER DEFAULT 10,
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
`;
    fs.writeFileSync(path.join(dbDir, '001_varejo_schema.sql'), schemaCode, 'utf-8');
  } else {
    // 1. routes/servicos.js
    const servicosCode = `import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../validate.js';
import { getDbClient } from '../db.js';

const router = Router();

const servicoSchema = z.object({
  nome: z.string().min(2, 'Nome do serviço obrigatório'),
  duracao_minutos: z.number().int().positive().default(30),
  preco: z.number().positive('Preço deve ser positivo'),
  categoria: z.string().optional().default('Geral'),
});

// GET /api/servicos
router.get('/', async (req, res, next) => {
  try {
    const db = getDbClient();
    if (db) {
      const { data, error } = await db.from('servicos').select('*').order('nome');
      if (!error && data) return res.json({ success: true, servicos: data });
    }
    res.json({
      success: true,
      empresa: '${companyName}',
      servicos: [
        { id: 1, nome: 'Atendimento Especializado', duracao_minutos: 45, preco: 90.0 },
        { id: 2, nome: 'Consulta / Avaliação', duracao_minutos: 30, preco: 60.0 },
      ],
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/servicos
router.post('/', validateRequest({ body: servicoSchema }), async (req, res, next) => {
  try {
    const db = getDbClient();
    if (db) {
      const { data, error } = await db.from('servicos').insert([req.body]).select().single();
      if (!error) return res.status(201).json({ success: true, servico: data });
    }
    res.status(201).json({ success: true, servico: { id: Date.now(), ...req.body } });
  } catch (err) {
    next(err);
  }
});

export default router;
`;
    fs.writeFileSync(path.join(backendRoutesDir, 'servicos.js'), servicosCode, 'utf-8');

    // 2. routes/agendamentos.js
    const agendamentosCode = `import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../validate.js';
import { getDbClient } from '../db.js';

const router = Router();

const agendamentoSchema = z.object({
  cliente_nome: z.string().min(2, 'Nome do cliente obrigatório'),
  cliente_telefone: z.string().min(8, 'Telefone obrigatório'),
  servico_nome: z.string().min(2, 'Nome do serviço obrigatório'),
  data: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  horario: z.string().regex(/^\\d{2}:\\d{2}$/, 'Horário deve estar no formato HH:MM'),
  observacoes: z.string().optional(),
});

// POST /api/agendamentos
router.post('/', validateRequest({ body: agendamentoSchema }), async (req, res, next) => {
  try {
    const db = getDbClient();
    const novoAgendamento = {
      id: \`AG-\${Date.now()}\`,
      ...req.body,
      status: 'Confirmado',
      created_at: new Date().toISOString(),
    };
    if (db) {
      await db.from('agendamentos').insert([novoAgendamento]);
    }
    res.status(201).json({
      success: true,
      mensagem: 'Horário reservado com sucesso!',
      agendamento: novoAgendamento,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
`;
    fs.writeFileSync(path.join(backendRoutesDir, 'agendamentos.js'), agendamentosCode, 'utf-8');

    // 3. database/001_servicos_schema.sql
    const schemaCode = `-- Tabelas de Serviços & Agendamentos
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
`;
    fs.writeFileSync(path.join(dbDir, '001_servicos_schema.sql'), schemaCode, 'utf-8');
  }
}

/**
 * Orquestra o provisionamento completo da Modular Tenant Stack
 */
export async function orchestrateModularTenantStack(projectId, projectRecord) {
  const briefing = projectRecord?.resultado_json?.briefing_payload || projectRecord?.resultado_json || {};
  const dossie = projectRecord?.resultado_json?.dossie || projectRecord?.dossie || briefing?.dossie || null;

  const appName =
    briefing?.project_name ||
    projectRecord?.project_name ||
    dossie?.nome_verificado ||
    projectRecord?.mensagem_lead?.slice(0, 30) ||
    `AppTenant_${projectId}`;

  const rawNiche =
    dossie?.nicho_detectado ||
    projectRecord?.nicho_detectado ||
    briefing?.nicho_detectado ||
    projectRecord?.tipo_negocio ||
    '';

  const nicheFamily = normalizeNicheFamily(rawNiche);
  const slug = sanitizeSlug(appName);
  const projectPath = path.join(REPO_ROOT, 'workspace', slug);

  // Alocação de portas únicas e isoladas
  const numericId = parseInt(projectId, 10) || Math.floor(Math.random() * 100);
  const backendPort = 5050 + (numericId % 400);
  const frontendPort = 5173 + (numericId % 400);

  fs.mkdirSync(projectPath, { recursive: true });

  // 1. Copiar Composable Backend Blueprint
  const backendSrc = path.join(REPO_ROOT, 'gold_templates', 'composable_backend_blueprint');
  const backendDest = path.join(projectPath, 'backend');
  copyDirSync(backendSrc, backendDest);

  // 2. Copiar Frontend Modular Template
  const frontendSrc = path.join(REPO_ROOT, 'gold_templates', 'template_base_app', 'frontend');
  const frontendDest = path.join(projectPath, 'frontend');
  copyDirSync(frontendSrc, frontendDest);

  // 3. Sintetizar Rotas e Banco para o Nicho
  const backendRoutesDir = path.join(backendDest, 'routes');
  const dbDir = path.join(projectPath, 'database');
  synthesizeNicheRoutes(backendRoutesDir, dbDir, nicheFamily, appName);

  // 4. Configurar backend/.env
  const subUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
  const subAnon = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
  const backendEnv = `PORT=${backendPort}\nSUPABASE_URL=${subUrl}\nSUPABASE_ANON_KEY=${subAnon}\nNODE_ENV=production\n`;
  fs.writeFileSync(path.join(backendDest, '.env'), backendEnv, 'utf-8');

  // 5. Configurar frontend/.env e ai_config.json
  const frontendEnv = `VITE_BACKEND_URL=http://localhost:${backendPort}/api\nVITE_SUPABASE_URL=${subUrl}\nVITE_SUPABASE_ANON_KEY=${subAnon}\n`;
  fs.writeFileSync(path.join(frontendDest, '.env'), frontendEnv, 'utf-8');

  let moduleList = ['servicos', 'agendar'];
  if (nicheFamily === 'gastronomia') moduleList = ['cardapio', 'pedidos'];
  if (nicheFamily === 'varejo') moduleList = ['produtos', 'carrinho'];

  const branding = briefing?.branding || {};
  const aiConfig = {
    app_name: appName,
    nicho_detectado: nicheFamily,
    modules: moduleList,
    primary_color: branding.primary_color_hex || branding.primary_color || '#f59e0b',
    secondary_color: branding.secondary_color_hex || branding.secondary_color || '#10b981',
    bg_color: branding.bg_color_hex || branding.bg_color || '#09090b',
    font_heading: branding.font_heading || 'Plus Jakarta Sans',
    font_body: branding.font_body || 'Inter',
    layout_archetype: branding.layout_archetype || 'editorial_asymmetric',
    backend_port: backendPort,
    frontend_port: frontendPort,
    preview_url: `http://localhost:${frontendPort}`,
    backend_url: `http://localhost:${backendPort}`,
    updated_at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(frontendDest, 'ai_config.json'), JSON.stringify(aiConfig, null, 2), 'utf-8');

  // 6. Contexto de Arquitetura do Tenant
  const contextoArq = `# Contexto Arquitetural do Tenant: ${appName}

Este projeto utiliza a **Modular Tenant Stack**:
1. \`backend/\`: API Express rodando na porta ${backendPort} com guardrails congelados (\`security.js\`, \`validate.js\`, \`errorHandler.js\`).
2. \`frontend/\`: PWA React + Vite rodando na porta ${frontendPort} configurado com os módulos: ${moduleList.join(', ')}.
3. \`database/\`: Migrações SQL adaptadas ao nicho: ${nicheFamily}.
`;
  fs.writeFileSync(path.join(projectPath, 'contexto_arquitetura.md'), contextoArq, 'utf-8');

  const outcome = {
    success: true,
    status: 'concluido',
    modelo_utilizado: 'Gemini (gemini-3.8-flash)',
    target_project_path: `workspace/${slug}`,
    project_slug: slug,
    nicho_detectado: nicheFamily,
    backend_port: backendPort,
    frontend_port: frontendPort,
    backend_url: `http://localhost:${backendPort}`,
    preview_url: `http://localhost:${frontendPort}`,
    dossie,
    modules: moduleList,
    provisioned_at: new Date().toISOString(),
  };

  return outcome;
}
