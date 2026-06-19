import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Carrega as variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const SOFTWARE_FACTORY_API_URL = process.env.SOFTWARE_FACTORY_API_URL || 'http://localhost:8000';

app.use(cors());
app.use(express.json());

// Inicializa o cliente do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no arquivo .env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Cliente Supabase inicializado com sucesso para:', supabaseUrl);

// Rota de Teste de Saúde
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
});

// 1. Criar novo projeto (Lead) no Supabase
app.post('/api/projetos', async (req, res) => {
  try {
    const { project_name, branding, modules, reference_links, client_info, ai_analysis } = req.body;

    if (!project_name) {
      return res.status(400).json({ error: 'O nome do projeto (project_name) é obrigatório.' });
    }

    // Formata os links de referência de forma amigável para a LLM
    let linksStr = 'Nenhum link fornecido.';
    if (reference_links && reference_links.length > 0) {
      linksStr = reference_links
        .map((l, i) => `${i + 1}. Tipo: ${l.type} - URL: ${l.url} ${l.notes ? `(Notas: ${l.notes})` : ''}`)
        .join('\n');
    }

    // Formata os módulos
    const modulosStr = modules && modules.length > 0 ? modules.join(', ') : 'site';

    // Cria a mensagem estruturada do lead, incluindo a análise de referências e UX da IA
    const mensagem_lead = `Olá! Quero criar um site/app para meu negócio chamado '${project_name}'.
Identidade visual recomendada:
- Paleta sugerida: ${branding?.palette_name || 'Personalizada'}
- Cor principal: ${branding?.primary_color_hex || '#D4AF37'}
- Cor secundária: ${branding?.primary_color_hex === '#FFFFFF' ? '#000000' : '#FFFFFF'} (Branco/Preto complementar)

Módulos solicitados: [${modulosStr}]

Análise de Referências e Proposta de Design da IA:
${ai_analysis || 'Nenhuma análise de referência disponível.'}

Links de inspiração e referências do cliente:
${linksStr}

Informações do cliente:
- E-mail: ${client_info?.email || 'Não informado'}
- Telefone: ${client_info?.phone || 'Não informado'}
`;

    // Insere no Supabase na tabela fila_projetos
    const { data, error } = await supabase
      .from('fila_projetos')
      .insert([
        {
          mensagem_lead,
          status: 'pendente',
          resultado_json: null
        }
      ])
      .select();

    if (error) {
      console.error('Erro ao salvar no Supabase:', error);
      return res.status(500).json({ error: 'Erro ao salvar projeto no banco de dados.', details: error.message });
    }

    console.log(`Projeto criado com sucesso! ID: ${data[0].id}`);
    res.status(201).json(data[0]);
  } catch (err) {
    console.error('Erro na rota POST /api/projetos:', err);
    res.status(500).json({ error: 'Erro interno do servidor.', details: err.message });
  }
});

// 2. Listar todos os projetos salvos
app.get('/api/projetos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fila_projetos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar projetos:', error);
      return res.status(500).json({ error: 'Erro ao buscar projetos no banco de dados.', details: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('Erro na rota GET /api/projetos:', err);
    res.status(500).json({ error: 'Erro interno do servidor.', details: err.message });
  }
});

// 3. Obter status de um projeto específico
app.get('/api/projetos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('fila_projetos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Erro ao buscar projeto ${id}:`, error);
      return res.status(500).json({ error: 'Erro ao buscar projeto no banco de dados.', details: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error(`Erro na rota GET /api/projetos/${req.params.id}:`, err);
    res.status(500).json({ error: 'Erro interno do servidor.', details: err.message });
  }
});

// 4. Disparar processamento da fila (Fábrica de IA)
app.post('/api/projetos/:id/processar', async (req, res) => {
  const { id } = req.params;
  console.log(`Recebida solicitação de compilação para o projeto ID: ${id}`);
  
  // Executa o processamento em segundo plano para liberar o cliente Express imediatamente
  // e permitir o acompanhamento por polling
  res.json({ status: 'processando', mensagem: 'Compilação iniciada no orquestrador da Fábrica de IA.' });

  try {
    // Faz a chamada ao endpoint FastAPI da Fábrica de Software
    const response = await fetch(`${SOFTWARE_FACTORY_API_URL}/processar-fila`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log(`Resultado do processamento da fila disparado pelo projeto ${id}:`, result);
  } catch (err) {
    console.error(`Erro ao disparar processamento da fábrica para projeto ${id}:`, err.message);
  }
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Servidor Backend rodando com sucesso na porta ${PORT}`);
  console.log(`URL base da API: http://localhost:${PORT}`);
  console.log(`Fábrica de IA conectada em: ${SOFTWARE_FACTORY_API_URL}`);
  console.log(`==================================================`);
});
