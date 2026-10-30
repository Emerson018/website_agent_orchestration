import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega as variáveis de ambiente com prioridade e fallback
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../wacrm/.env.local') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const SOFTWARE_FACTORY_API_URL = process.env.SOFTWARE_FACTORY_API_URL || 'http://localhost:8000';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Diretório de dados e uploads locais resilientes
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const LOCAL_PROJECTS_FILE = path.join(DATA_DIR, 'local_projetos.json');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_PROJECTS_FILE)) {
    fs.writeFileSync(LOCAL_PROJECTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

ensureDirectories();
app.use('/uploads', express.static(UPLOADS_DIR));

function getLocalProjects() {
  ensureDirectories();
  try {
    const raw = fs.readFileSync(LOCAL_PROJECTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalProject(project) {
  ensureDirectories();
  const projects = getLocalProjects();
  projects.unshift(project);
  fs.writeFileSync(LOCAL_PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
  return project;
}

function updateLocalProject(id, patch) {
  ensureDirectories();
  const projects = getLocalProjects();
  const idx = projects.findIndex((p) => String(p.id) === String(id));
  if (idx !== -1) {
    projects[idx] = { ...projects[idx], ...patch };
    if (patch.resultado_json) {
      projects[idx].resultado_json = {
        ...(projects[idx].resultado_json || {}),
        ...patch.resultado_json,
      };
    }
    fs.writeFileSync(LOCAL_PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
    return projects[idx];
  }
  return null;
}

function getLocalProjectById(id) {
  const projects = getLocalProjects();
  return projects.find((p) => String(p.id) === String(id)) || null;
}

// Inicializa o cliente do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isPlaceholderUrl =
  !supabaseUrl ||
  supabaseUrl.includes('placeholder') ||
  supabaseUrl.includes('your-project') ||
  supabaseUrl.includes('seu-projeto');

let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Cliente Supabase inicializado para:', supabaseUrl);
  } catch (initErr) {
    console.warn('[Backend] Aviso ao instanciar Supabase:', initErr.message);
  }
}

const isSupabaseActive = Boolean(supabase && !isPlaceholderUrl);
if (!isSupabaseActive) {
  console.log('[Backend] Modo Fila Resiliente Local ATIVO (Supabase offline ou não configurado).');
}

// Rota de Teste de Saúde
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: isSupabaseActive ? 'supabase_connected' : 'local_file_queue',
    timestamp: new Date().toISOString(),
  });
});

// Endpoint de Upload
app.post('/api/upload', async (req, res) => {
  try {
    const { base64Data, fileName, mimeType } = req.body;
    if (!base64Data || !fileName) {
      return res.status(400).json({ error: 'Os campos base64Data e fileName são obrigatórios.' });
    }

    const cleanBase64 = base64Data.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const uniqueFileName = `${Date.now()}-${fileName}`;

    if (isSupabaseActive) {
      try {
        const filePath = `leads/${uniqueFileName}`;
        const { data, error } = await supabase.storage
          .from('lead-documents')
          .upload(filePath, buffer, {
            contentType: mimeType || 'application/octet-stream',
            upsert: true,
          });

        if (!error) {
          const { data: publicUrlData } = supabase.storage
            .from('lead-documents')
            .getPublicUrl(filePath);

          return res.json({
            name: fileName,
            url: publicUrlData.publicUrl,
            path: filePath,
          });
        }
      } catch (storageErr) {
        console.warn('[Backend] Falha ao enviar para Supabase Storage, gravando localmente:', storageErr.message);
      }
    }

    // Armazenamento local
    const localFilePath = path.join(UPLOADS_DIR, uniqueFileName);
    fs.writeFileSync(localFilePath, buffer);
    const localUrl = `http://localhost:${PORT}/uploads/${uniqueFileName}`;

    console.log(`[Upload] Arquivo salvo no disco local: ${localFilePath}`);
    res.json({
      name: fileName,
      url: localUrl,
      path: `uploads/${uniqueFileName}`,
    });
  } catch (err) {
    console.error('Erro na rota POST /api/upload:', err);
    res.status(500).json({ error: 'Erro interno no upload.', details: err.message });
  }
});

// Helper para despachar projeto para o Agente Antigravity no Chat ou Fábrica
async function dispatchProjectToFactory(projectId, projectRecord = null) {
  try {
    const targetProject = projectRecord || getLocalProjectById(projectId);
    console.log(`[Backend] Despachando projeto #${projectId} para o Agente Antigravity no chat...`);

    // 1. Marca status local como 'aguardando_agente'
    if (targetProject?.is_local) {
      updateLocalProject(projectId, { status: 'aguardando_agente' });
    }

    if (isSupabaseActive) {
      try {
        await supabase
          .from('fila_projetos')
          .update({ status: 'aguardando_agente' })
          .eq('id', projectId);
      } catch (sbErr) {
        console.warn('[Backend] Aviso ao atualizar status no Supabase:', sbErr.message);
      }
    }

    // 2. Grava o job em .agents/queue/pending_job.json para o watcher do chat
    try {
      const queueDir = path.resolve(__dirname, '../../../.agents/queue');
      if (!fs.existsSync(queueDir)) {
        fs.mkdirSync(queueDir, { recursive: true });
      }
      const pendingFile = path.join(queueDir, 'pending_job.json');
      fs.writeFileSync(pendingFile, JSON.stringify(targetProject, null, 2), 'utf-8');
      console.log(`[Backend] Job gravado em ${pendingFile} para o Agente Antigravity.`);
    } catch (fsErr) {
      console.warn('[Backend] Aviso ao gravar arquivo de fila do agente:', fsErr.message);
    }

    // 3. Notifica a Fábrica de IA assincronamente (se conectada)
    if (targetProject?.mensagem_lead) {
      const payload = {
        mensagem: targetProject.mensagem_lead,
        briefing_payload: targetProject.resultado_json?.briefing_payload || null,
        project_id: parseInt(projectId, 10),
      };

      fetch(`${SOFTWARE_FACTORY_API_URL}/gerar-site`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Fábrica desacoplada: processamento ativo pelo Agente Antigravity no chat
      });
    }

    return { status: 'aguardando_agente', mensagem: 'Projeto encaminhado para o Agente Antigravity no chat' };
  } catch (err) {
    console.error(`Erro ao despachar projeto ${projectId}:`, err.message);
  }
}


async function attachTagToContact(contactId, tagName, accountId, userId) {
  if (!supabase || !isSupabaseActive || !contactId) return;
  try {
    let { data: tag } = await supabase
      .from('tags')
      .select('id')
      .eq('account_id', accountId)
      .eq('name', tagName)
      .maybeSingle();

    if (!tag) {
      const { data: newTag, error: tagErr } = await supabase
        .from('tags')
        .insert([{
          user_id: userId,
          account_id: accountId,
          name: tagName,
          color: '#10b981'
        }])
        .select('id')
        .maybeSingle();
      if (!tagErr && newTag) tag = newTag;
    }

    if (tag?.id) {
      const { data: existingLink } = await supabase
        .from('contact_tags')
        .select('id')
        .eq('contact_id', contactId)
        .eq('tag_id', tag.id)
        .maybeSingle();

      if (!existingLink) {
        await supabase
          .from('contact_tags')
          .insert([{ contact_id: contactId, tag_id: tag.id }]);
      }
    }
  } catch (err) {
    console.warn('[Backend] Falha ao associar tag ao contato:', err.message);
  }
}

// 1. Criar novo projeto (Lead) no Supabase ou Fila Local Resiliente
app.post('/api/projetos', async (req, res) => {
  try {
    const {
      project_name: raw_project_name,
      name,
      contact_name,
      company,
      company_name,
      website: raw_website,
      site,
      contact_id: incomingContactId,
      branding,
      modules,
      reference_links,
      client_info,
      summary,
      ai_analysis,
      additional_data,
      supabase_url,
      supabase_anon_key,
      supabase_service_role_key,
      auto_process,
    } = req.body;

    const contactName =
      name ||
      contact_name ||
      client_info?.name ||
      raw_project_name ||
      'Novo Contato';

    const companyName =
      company ||
      company_name ||
      raw_project_name ||
      'Projeto Fábrica';

    const project_name = companyName;

    if (!raw_project_name && !company && !name && !contact_name) {
      return res.status(400).json({ error: 'Informe ao menos o nome do responsável ou da empresa.' });
    }

    const phone = req.body.phone || client_info?.phone || 'Não informado';
    const email = req.body.email || client_info?.email || 'Não informado';
    const website = raw_website || site || (reference_links?.[0]?.url) || null;

    let finalAdditionalData = additional_data ? { ...additional_data } : {};
    if (website) {
      const existingLinks = Array.isArray(finalAdditionalData.links) ? [...finalAdditionalData.links] : [];
      if (!existingLinks.some((l) => l.url === website)) {
        existingLinks.push({ label: 'Site Oficial', url: website });
      }
      finalAdditionalData.links = existingLinks;
    }

    let linksStr = 'Nenhum link fornecido.';
    if (reference_links && reference_links.length > 0) {
      linksStr = reference_links
        .map((l, i) => `${i + 1}. Tipo: ${l.type} - URL: ${l.url} ${l.notes ? `(Notas: ${l.notes})` : ''}`)
        .join('\n');
    } else if (website) {
      linksStr = `1. Tipo: site - URL: ${website} (Site Oficial do Lead)`;
    }

    const modulosStr = modules && modules.length > 0 ? modules.join(', ') : 'site_institucional';

    const mensagem_lead = `### BRIEFING DO PROJETO DE CLIENTE
- **Responsável / Contato**: ${contactName}
- **Empresa / Marca**: '${companyName}'
- **WhatsApp/Tel**: ${phone}
- **E-mail**: ${email}
- **Site Oficial**: ${website || 'Nenhum site informado'}
- **Módulos Solicitados**: [${modulosStr}]

${ai_analysis ? `### ANÁLISE DE MARCA & ARQUITETURA DA IA:\n${ai_analysis}\n` : ''}${linksStr !== 'Nenhum link fornecido.' ? `### LINKS DE REFERÊNCIA:\n${linksStr}\n` : ''}`;

    let defaultUserId = '2b66650c-a300-4239-b922-2aab9bccac6f';
    let defaultAccountId = '98006e91-88b1-44ea-9178-50c257cd973f';
    let contactId = incomingContactId || null;

    if (isSupabaseActive) {
      try {
        let { data: profile } = await supabase
          .from('profiles')
          .select('user_id, account_id')
          .eq('email', 'admin@wacrm.com')
          .maybeSingle();

        if (!profile) {
          const { data: fallbackProfile } = await supabase
            .from('profiles')
            .select('user_id, account_id')
            .limit(1)
            .maybeSingle();
          profile = fallbackProfile;
        }

        if (profile?.user_id) defaultUserId = profile.user_id;
        if (profile?.account_id) defaultAccountId = profile.account_id;

        const phone_normalized = phone.replace(/\D/g, '');

        // 1. Busca ou cria Contato no WACRM
        if (!contactId && phone_normalized) {
          const { data: existingContact } = await supabase
            .from('contacts')
            .select('id')
            .eq('account_id', defaultAccountId)
            .eq('phone_normalized', phone_normalized)
            .limit(1)
            .maybeSingle();

          if (existingContact) {
            contactId = existingContact.id;
          }
        }

        if (contactId) {
          const contactUpdatePayload = {
            name: contactName,
            company: companyName,
            additional_data: finalAdditionalData,
            updated_at: new Date().toISOString()
          };
          if (!incomingContactId && !ai_analysis) {
            contactUpdatePayload.rag_status = 'idle';
          }
          if (email && email !== 'Não informado') {
            contactUpdatePayload.email = email;
          }
          if (website) {
            contactUpdatePayload.website = website;
          }
          let { error: updateError } = await supabase
            .from('contacts')
            .update(contactUpdatePayload)
            .eq('id', contactId);

          if (updateError && updateError.message && updateError.message.includes("'website' column")) {
            delete contactUpdatePayload.website;
            await supabase
              .from('contacts')
              .update(contactUpdatePayload)
              .eq('id', contactId);
          }
        } else {
          const newContactPayload = {
            user_id: defaultUserId,
            account_id: defaultAccountId,
            phone: phone,
            name: contactName,
            company: companyName,
            email: email,
            website: website || null,
            additional_data: finalAdditionalData,
            rag_status: 'idle',
          };

          let { data: newContact, error: contactError } = await supabase
            .from('contacts')
            .insert([newContactPayload])
            .select('id')
            .single();

          if (contactError && contactError.message && contactError.message.includes("'website' column")) {
            delete newContactPayload.website;
            const retry = await supabase
              .from('contacts')
              .insert([newContactPayload])
              .select('id')
              .single();
            newContact = retry.data;
            contactError = retry.error;
          }

          if (!contactError && newContact) {
            contactId = newContact.id;
            console.log(`[Backend] Contato registrado no CRM com sucesso! ID: ${contactId}`);
          } else if (contactError) {
            console.warn('[Backend] Erro ao criar contato no CRM:', contactError.message);
          }
        }

        // 2. Associa tag 'Fábrica de Sites' ao contato
        if (contactId) {
          await attachTagToContact(contactId, 'Fábrica de Sites', defaultAccountId, defaultUserId);
        }

        // 3. Cria Oportunidade (Deal) no Funil de Vendas do WACRM (Sem conversa no Inbox)
        if (contactId) {
          let pipelineId = '0a1969dd-bc7e-4a99-a854-a925f32ad923';
          let stageId = 'e15c3092-f3f9-4550-baa4-88a6f27b6eaa';

          try {
            const { data: stages } = await supabase
              .from('pipeline_stages')
              .select('id, pipeline_id, position, pipelines!inner(account_id)')
              .eq('pipelines.account_id', defaultAccountId)
              .order('position', { ascending: true })
              .limit(1);

            if (stages && stages.length > 0) {
              stageId = stages[0].id;
              pipelineId = stages[0].pipeline_id;
            }
          } catch (stageErr) {
            console.warn('[Backend] Falha ao consultar pipeline stages:', stageErr.message);
          }

          const dealValue = summary?.total_setup_price || 0;

          const { data: existingDeal } = await supabase
            .from('deals')
            .select('id')
            .eq('account_id', defaultAccountId)
            .eq('contact_id', contactId)
            .eq('title', `Projeto - ${companyName}`)
            .limit(1)
            .maybeSingle();

          if (!existingDeal) {
            const { error: dealError } = await supabase
              .from('deals')
              .insert([
                {
                  user_id: defaultUserId,
                  account_id: defaultAccountId,
                  pipeline_id: pipelineId,
                  stage_id: stageId,
                  contact_id: contactId,
                  title: `Projeto - ${companyName}`,
                  value: dealValue,
                  currency: 'BRL',
                  notes: `Responsável: ${contactName} | Site: ${website || 'Não informado'}`,
                  status: 'open'
                }
              ]);

            if (dealError) {
              console.warn('[Backend] Erro ao criar Oportunidade (Deal) no CRM:', dealError.message);
            } else {
              console.log(`[Backend] Oportunidade (Deal) criada com sucesso no funil do CRM no valor de R$ ${dealValue}!`);
            }
          } else {
            console.log(`[Backend] Oportunidade (Deal) já existente no CRM para ${companyName} (ID: ${existingDeal.id}).`);
          }
        }
      } catch (crmResolveErr) {
        console.warn('[Backend] Aviso ao sincronizar CRM com Supabase:', crmResolveErr.message);
      }
    }

    const { supabase_service_role_key: _srk, supabase_anon_key: _sak, ...cleanBriefing } = req.body;

    let data = null;

    // Tentativa no Supabase se ativo
    if (isSupabaseActive) {
      try {
        const { data: inserted, error: insertError } = await supabase
          .from('fila_projetos')
          .insert([
            {
              mensagem_lead,
              status: 'pendente',
              resultado_json: {
                account_id: defaultAccountId,
                user_id: defaultUserId,
                ...(contactId ? { contact_id: contactId } : {}),
                contact_name: contactName,
                company: companyName,
                email: email,
                phone: phone,
                website: website || null,
                project_name: companyName,
                briefing_payload: cleanBriefing,
                supabase_service_role_key: supabase_service_role_key || null,
              },
              supabase_url: supabase_url || null,
              supabase_anon_key: supabase_anon_key || null,
            },
          ])
          .select();

        if (insertError) {
          console.warn('[Backend] Erro no Supabase fila_projetos (' + insertError.message + '). Ativando fila local resiliente...');
        } else {
          data = inserted;
          // Salva também na cópia local para consistência e inspeção offline
          try {
            const localMirror = {
              ...inserted[0],
              is_local: false,
              supabase_synced: true,
            };
            saveLocalProject(localMirror);
          } catch {}
        }
      } catch (insertEx) {
        console.warn('[Backend] Exceção ao gravar no Supabase (' + insertEx.message + '). Ativando fila local resiliente...');
      }
    }

    // Se Supabase for offline/placeholder ou falhar (ex: fetch failed), armazena na fila local resiliente
    if (!data || data.length === 0) {
      const localProject = {
        id: Date.now(),
        mensagem_lead,
        status: 'pendente',
        resultado_json: {
          account_id: defaultAccountId,
          user_id: defaultUserId,
          ...(contactId ? { contact_id: contactId } : {}),
          project_name: project_name,
          briefing_payload: cleanBriefing,
          supabase_service_role_key: supabase_service_role_key || null,
        },
        supabase_url: supabase_url || null,
        supabase_anon_key: supabase_anon_key || null,
        created_at: new Date().toISOString(),
        is_local: true,
      };
      saveLocalProject(localProject);
      data = [localProject];
      console.log(`[Backend] Projeto registrado com sucesso na fila local! ID: #${localProject.id}`);
    } else {
      console.log(`Projeto criado com sucesso no Supabase! ID: ${data[0].id}`);
    }

    const createdProject = {
      ...data[0],
      auto_dispatched: Boolean(auto_process),
    };

    res.status(201).json(createdProject);

    if (auto_process) {
      dispatchProjectToFactory(data[0].id, data[0]);
    }
  } catch (err) {
    console.error('Erro na rota POST /api/projetos:', err);
    res.status(500).json({ error: 'Erro interno do servidor.', details: err.message });
  }
});

// 2. Listar todos os projetos salvos
app.get('/api/projetos', async (req, res) => {
  try {
    let supabaseProjects = [];
    if (isSupabaseActive) {
      try {
        const { data, error } = await supabase
          .from('fila_projetos')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          supabaseProjects = data;
        }
      } catch (err) {
        console.warn('[Backend] Falha ao consultar Supabase /api/projetos:', err.message);
      }
    }

    const localProjects = getLocalProjects();
    const seenIds = new Set();
    const merged = [];

    for (const p of [...localProjects, ...supabaseProjects]) {
      const key = String(p.id);
      if (!seenIds.has(key)) {
        seenIds.add(key);
        merged.push(p);
      }
    }

    res.json(merged);
  } catch (err) {
    console.error('Erro na rota GET /api/projetos:', err);
    res.json(getLocalProjects());
  }
});

// 3. Obter status de um projeto específico
app.get('/api/projetos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const local = getLocalProjectById(id);
    if (local) {
      return res.json(local);
    }

    if (isSupabaseActive) {
      const { data, error } = await supabase
        .from('fila_projetos')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return res.json(data);
      }
    }

    return res.status(404).json({ error: 'Projeto não encontrado na fila.' });
  } catch (err) {
    console.error(`Erro na rota GET /api/projetos/${req.params.id}:`, err);
    const local = getLocalProjectById(req.params.id);
    if (local) return res.json(local);
    res.status(500).json({ error: 'Erro interno do servidor.', details: err.message });
  }
});

// 4. Disparar processamento da fila (Fábrica de IA)
app.post('/api/projetos/:id/processar', async (req, res) => {
  const { id } = req.params;
  console.log(`Recebida solicitação de compilação para o projeto ID: ${id}`);

  try {
    const local = getLocalProjectById(id);
    let projeto = local;

    if (!projeto && isSupabaseActive) {
      const { data, error: fetchErr } = await supabase
        .from('fila_projetos')
        .select('*')
        .eq('id', id)
        .single();

      if (!fetchErr && data) {
        projeto = data;
      }
    }

    if (!projeto) {
      return res.status(404).json({ error: 'Projeto não encontrado na fila.' });
    }

    if (local) {
      updateLocalProject(id, { status: 'aguardando_agente' });
    }

    if (isSupabaseActive) {
      try {
        await supabase
          .from('fila_projetos')
          .update({ status: 'aguardando_agente' })
          .eq('id', id);
      } catch (sbUpdateErr) {
        console.warn('[Backend] Erro ao atualizar status no Supabase /processar:', sbUpdateErr.message);
      }
    }

    res.json({ status: 'aguardando_agente', mensagem: 'Compilação iniciada no Agente Antigravity no chat.' });

    // Executa em segundo plano
    dispatchProjectToFactory(id, projeto);
  } catch (err) {
    console.error(`Erro ao disparar processamento da fábrica para projeto ${id}:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro ao disparar processamento da fábrica de IA.', details: err.message });
    }
  }
});

// Sincroniza projetos acumulados localmente com o Supabase ao iniciar
async function syncUnsyncedLocalProjects() {
  if (!isSupabaseActive) return;
  const localProjects = getLocalProjects();
  let modified = false;

  for (let i = 0; i < localProjects.length; i++) {
    const p = localProjects[i];
    if (p.is_local && !p.supabase_synced && p.mensagem_lead) {
      try {
        const payload = p.resultado_json?.briefing_payload || {};
        const projectName = payload.project_name || p.resultado_json?.project_name;
        if (!projectName) continue;

        console.log(`[Sync] Sincronizando projeto local acumulado #${p.id} ("${projectName}") para o Supabase...`);

        let defaultUserId = '2b66650c-a300-4239-b922-2aab9bccac6f';
        let defaultAccountId = '98006e91-88b1-44ea-9178-50c257cd973f';

        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, account_id')
          .eq('email', 'admin@wacrm.com')
          .maybeSingle();

        if (profile?.user_id) defaultUserId = profile.user_id;
        if (profile?.account_id) defaultAccountId = profile.account_id;

        const phone = payload.client_info?.phone || 'Não informado';
        const phone_normalized = phone.replace(/\D/g, '');
        const email = payload.client_info?.email || 'Não informado';

        let contactId = null;
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
          }
        }

        if (!contactId && phone !== 'Não informado') {
          const { data: newContact } = await supabase
            .from('contacts')
            .insert([{
              user_id: defaultUserId,
              account_id: defaultAccountId,
              phone: phone,
              name: projectName,
              email: email,
              additional_data: payload.additional_data || {},
              rag_status: 'idle',
            }])
            .select('id')
            .single();

          if (newContact) contactId = newContact.id;
        }

        // Não criamos conversas/mensagens no Inbox para leads web
        if (contactId) {
          await attachTagToContact(contactId, 'Fábrica de Sites', defaultAccountId, defaultUserId);
        }

        if (contactId) {
          let pipelineId = '0a1969dd-bc7e-4a99-a854-a925f32ad923';
          let stageId = 'e15c3092-f3f9-4550-baa4-88a6f27b6eaa';
          try {
            const { data: stages } = await supabase
              .from('pipeline_stages')
              .select('id, pipeline_id, position, pipelines!inner(account_id)')
              .eq('pipelines.account_id', defaultAccountId)
              .order('position', { ascending: true })
              .limit(1);

            if (stages && stages.length > 0) {
              stageId = stages[0].id;
              pipelineId = stages[0].pipeline_id;
            }
          } catch {}

          const dealVal = payload.summary?.total_setup_price || 0;
          const { data: existingDeal } = await supabase
            .from('deals')
            .select('id')
            .eq('account_id', defaultAccountId)
            .eq('contact_id', contactId)
            .eq('title', `Projeto - ${projectName}`)
            .limit(1)
            .maybeSingle();

          if (!existingDeal) {
            await supabase.from('deals').insert([{
              user_id: defaultUserId,
              account_id: defaultAccountId,
              pipeline_id: pipelineId,
              stage_id: stageId,
              contact_id: contactId,
              title: `Projeto - ${projectName}`,
              value: dealVal,
              currency: 'BRL',
              notes: `Módulos: ${payload.modules?.join(', ') || 'site'}`,
              status: 'open',
            }]);
          }
        }

        // Insere na fila_projetos
        const { data: insertedFila } = await supabase
          .from('fila_projetos')
          .insert([{
            mensagem_lead: p.mensagem_lead,
            status: p.status || 'pendente',
            resultado_json: {
              ...(p.resultado_json || {}),
              account_id: defaultAccountId,
              user_id: defaultUserId,
              ...(contactId ? { contact_id: contactId } : {}),
            },
            supabase_url: p.supabase_url || null,
            supabase_anon_key: p.supabase_anon_key || null,
          }])
          .select('id')
          .single();

        localProjects[i] = {
          ...p,
          is_local: false,
          supabase_synced: true,
          supabase_id: insertedFila?.id || null,
        };
        modified = true;
        console.log(`[Sync] Projeto #${p.id} sincronizado com sucesso no Supabase! ID Fila: #${insertedFila?.id}`);
      } catch (syncErr) {
        console.warn(`[Sync] Falha ao sincronizar projeto #${p.id}:`, syncErr.message);
      }
    }
  }

  if (modified) {
    fs.writeFileSync(LOCAL_PROJECTS_FILE, JSON.stringify(localProjects, null, 2), 'utf-8');
  }
}

const server = app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Servidor Backend rodando com sucesso na porta ${PORT}`);
  console.log(`URL base da API: http://localhost:${PORT}`);
  console.log(`Fábrica de IA conectada em: ${SOFTWARE_FACTORY_API_URL}`);
  console.log(`Status Supabase: ${isSupabaseActive ? supabaseUrl : 'Modo Fila Local Resiliente'}`);
  console.log(`==================================================`);
  syncUnsyncedLocalProjects().catch((err) =>
    console.warn('[Backend] Erro ao sincronizar projetos locais:', err.message)
  );
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

process.on('unhandledRejection', (reason) => {
  console.error('[Backend] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Backend] Uncaught Exception:', err);
});

export { server, app };
