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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Endpoint de Upload para Supabase Storage
app.post('/api/upload', async (req, res) => {
  try {
    const { base64Data, fileName, mimeType } = req.body;
    if (!base64Data || !fileName) {
      return res.status(400).json({ error: 'Os campos base64Data e fileName são obrigatórios.' });
    }

    // Limpa o prefixo do base64 (ex: "data:application/pdf;base64,") se houver
    const cleanBase64 = base64Data.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Gera um nome de arquivo único para evitar colisões
    const uniqueFileName = `${Date.now()}-${fileName}`;
    const filePath = `leads/${uniqueFileName}`;

    console.log(`Fazendo upload do arquivo para o Supabase Storage: ${filePath}`);

    const { data, error } = await supabase.storage
      .from('lead-documents')
      .upload(filePath, buffer, {
        contentType: mimeType || 'application/octet-stream',
        upsert: true
      });

    if (error) {
      console.error('Erro no upload para o Supabase Storage:', error);
      return res.status(500).json({ error: 'Erro ao fazer upload do arquivo para o storage.', details: error.message });
    }

    // Obtém a URL pública do arquivo
    const { data: publicUrlData } = supabase.storage
      .from('lead-documents')
      .getPublicUrl(filePath);

    console.log(`Upload concluído. URL Pública: ${publicUrlData.publicUrl}`);

    res.json({
      name: fileName,
      url: publicUrlData.publicUrl,
      path: filePath
    });
  } catch (err) {
    console.error('Erro na rota POST /api/upload:', err);
    res.status(500).json({ error: 'Erro interno no upload.', details: err.message });
  }
});

// 1. Criar novo projeto (Lead) no Supabase e integrar com o CRM
app.post('/api/projetos', async (req, res) => {
  try {
    const { project_name, branding, modules, reference_links, client_info, summary, ai_analysis, additional_data, supabase_url, supabase_anon_key } = req.body;

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
    const modulosStr = modules && modules.length > 0 ? modules.join(', ') : 'agendador_pwa';

    // Formata os textos adicionais (RAG e agendamento) de forma amigável
    let textosStr = 'Nenhum material ou texto de apoio fornecido.';
    if (additional_data && additional_data.texts && additional_data.texts.length > 0) {
      textosStr = additional_data.texts
        .filter(t => t.text && t.text.trim() !== '')
        .map(t => `- **${t.label}**: ${t.text}`)
        .join('\n');
    }

    // Cria a mensagem estruturada do lead, incluindo a análise de referências e UX da IA
    const mensagem_lead = `Olá! Quero criar um site/app para meu negócio chamado '${project_name}'.
Identidade visual recomendada:
- Paleta sugerida: ${branding?.palette_name || 'Personalizada'}
- Cor principal: ${branding?.primary_color_hex || '#D4AF37'}
- Cor secundária: ${branding?.primary_color_hex === '#FFFFFF' ? '#000000' : '#FFFFFF'} (Branco/Preto complementar)

Módulos solicitados: [${modulosStr}]

Especificações e Textos Adicionais (RAG/Agendador):
${textosStr}

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
          resultado_json: null,
          supabase_url: supabase_url || null,
          supabase_anon_key: supabase_anon_key || null
        }
      ])
      .select();

    if (error) {
      console.error('Erro ao salvar no Supabase:', error);
      return res.status(500).json({ error: 'Erro ao salvar projeto no banco de dados.', details: error.message });
    }

    console.log(`Projeto criado com sucesso na fila_projetos! ID: ${data[0].id}`);

    // INTEGRACAO COM O CRM
    try {
      // 1. Busca dinâmica da primeira conta e usuário (agente) ativos no CRM
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('user_id, account_id')
        .limit(1)
        .maybeSingle();

      const defaultUserId = profile?.user_id || 'ea3ebc3a-054e-4a3c-985d-74f0b13d3789';
      const defaultAccountId = profile?.account_id || '44a33a6e-8254-4707-b70c-916672b2c36b';

      const phone = client_info?.phone || 'Não informado';
      const phone_normalized = phone.replace(/\D/g, '');
      const email = client_info?.email || 'Não informado';
      const contactName = project_name;

      let contactId;

      // 2. Busca contato existente por telefone normalizado no CRM
      if (phone_normalized) {
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('account_id', defaultAccountId)
          .eq('phone_normalized', phone_normalized)
          .limit(1)
          .maybeSingle();

        if (existingContact) {
          contactId = existingContact.id;
          console.log(`Contato existente encontrado no CRM. ID: ${contactId}`);
          
          // Atualiza o contato com os dados novos do RAG
          const { error: updateErr } = await supabase
            .from('contacts')
            .update({
              additional_data: additional_data || {},
              rag_status: 'idle',
              rag_report: null
            })
            .eq('id', contactId);
          if (updateErr) {
            console.error('Erro ao atualizar contato existente no CRM:', updateErr);
          }
        }
      }

      // Se não existir, cria o contato no CRM
      if (!contactId) {
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert([
            {
              user_id: defaultUserId,
              account_id: defaultAccountId,
              phone: phone,
              name: contactName,
              email: email,
              additional_data: additional_data || {},
              rag_status: 'idle'
            }
          ])
          .select('id')
          .single();

        if (contactError) {
          console.error('Erro ao criar contato no CRM:', contactError);
        } else {
          contactId = newContact.id;
          console.log(`Novo contato criado no CRM com sucesso! ID: ${contactId}`);
        }
      }

      // 3. Busca ou cria conversa aberta para o contato no CRM
      let conversationId;
      if (contactId) {
        const { data: existingConversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('account_id', defaultAccountId)
          .eq('contact_id', contactId)
          .eq('status', 'open')
          .limit(1)
          .maybeSingle();

        if (existingConversation) {
          conversationId = existingConversation.id;
          console.log(`Conversa aberta existente encontrada no CRM. ID: ${conversationId}`);
        } else {
          const { data: newConversation, error: convError } = await supabase
            .from('conversations')
            .insert([
              {
                user_id: defaultUserId,
                account_id: defaultAccountId,
                contact_id: contactId,
                status: 'open',
                last_message_text: `Projeto - ${project_name}`,
                last_message_at: new Date().toISOString()
              }
            ])
            .select('id')
            .single();

          if (convError) {
            console.error('Erro ao criar conversa no CRM:', convError);
          } else {
            conversationId = newConversation.id;
            console.log(`Nova conversa aberta criada no CRM! ID: ${conversationId}`);
          }
        }
      }

      // 4. Insere a mensagem detalhada do lead no chat no CRM
      if (conversationId) {
        const { error: msgError } = await supabase
          .from('messages')
          .insert([
            {
              conversation_id: conversationId,
              sender_type: 'customer',
              content_type: 'text',
              content_text: mensagem_lead,
              status: 'sent'
            }
          ]);

        if (msgError) {
          console.error('Erro ao inserir mensagem no CRM:', msgError);
        } else {
          console.log('Mensagem de lead inserida com sucesso no chat do CRM.');
        }
      }

      // 5. Cria uma oportunidade (Deal) no funil de vendas (Kanban) do CRM
      if (contactId && conversationId) {
        // Busca o primeiro estágio/pipeline existente
        const { data: stage } = await supabase
          .from('pipeline_stages')
          .select('id, pipeline_id')
          .limit(1)
          .maybeSingle();

        const pipeline_id = stage?.pipeline_id || '6f0d4f66-7a9f-4a2e-bc5c-605c6cc8105a';
        const stage_id = stage?.id || '1ba374d4-14a5-439f-8d02-84e8c557bbe6';
        const dealValue = summary?.total_setup_price || 0;

        const { error: dealError } = await supabase
          .from('deals')
          .insert([
            {
              user_id: defaultUserId,
              account_id: defaultAccountId,
              pipeline_id: pipeline_id,
              stage_id: stage_id,
              contact_id: contactId,
              conversation_id: conversationId,
              title: `Projeto - ${project_name}`,
              value: dealValue,
              currency: 'BRL',
              notes: `Módulos: ${modules?.join(', ') || 'site'}`
            }
          ]);

        if (dealError) {
          console.error('Erro ao criar deal (oportunidade) no CRM:', dealError);
        } else {
          console.log(`Oportunidade (Deal) criada com sucesso no funil do CRM no valor de R$ ${dealValue}!`);
        }
      }
    } catch (crmErr) {
      console.error('Erro no fluxo de integração automatizada com o CRM:', crmErr);
    }

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
  
  try {
    // 1. Busca os metadados do projeto na fila para validar
    const { data: projeto, error: fetchErr } = await supabase
      .from('fila_projetos')
      .select('supabase_url, supabase_anon_key')
      .eq('id', id)
      .single();

    if (fetchErr || !projeto) {
      return res.status(404).json({ error: 'Projeto não encontrado na fila.' });
    }

    if (!projeto.supabase_url || !projeto.supabase_anon_key || !projeto.supabase_url.trim() || !projeto.supabase_anon_key.trim()) {
      return res.status(400).json({ 
        error: 'Credenciais do Supabase ausentes.', 
        details: 'Os campos supabase_url e supabase_anon_key são obrigatórios para a geração do PWA (Single-Tenant).' 
      });
    }

    // 2. Libera o cliente Express com sucesso
    res.json({ status: 'processando', mensagem: 'Compilação iniciada no orquestrador da Fábrica de IA.' });

    // 3. Executa o processamento no orquestrador
    const response = await fetch(`${SOFTWARE_FACTORY_API_URL}/processar-fila`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ project_id: parseInt(id) })
    });

    const result = await response.json();
    console.log(`Resultado do processamento da fila disparado pelo projeto ${id}:`, result);
  } catch (err) {
    console.error(`Erro ao disparar processamento da fábrica para projeto ${id}:`, err.message);
    if (!res.headersSent) {
      res.status(550).json({ error: 'Erro ao disparar processamento da fábrica de IA.', details: err.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Servidor Backend rodando com sucesso na porta ${PORT}`);
  console.log(`URL base da API: http://localhost:${PORT}`);
  console.log(`Fábrica de IA conectada em: ${SOFTWARE_FACTORY_API_URL}`);
  console.log(`==================================================`);
});
