import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildLeadDossier, extractPlaceQueryFromUrl } from './places_service.js';

import { runMultimodalBusinessDiagnosis, buildMasterPrompt } from './multimodal_diagnosis_service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega as variáveis de ambiente com prioridade e fallback
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../wacrm/.env.local') });
dotenv.config();

export function reloadEnv() {
  dotenv.config({ path: path.join(__dirname, '.env'), override: true });
  dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });
  dotenv.config({ path: path.resolve(__dirname, '../../../wacrm/.env.local'), override: true });
}

const app = express();
const PORT = process.env.PORT || 5000;
const AI_FACTORY_URL = process.env.AI_FACTORY_URL || 'http://localhost:8000';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Diretório de dados e uploads locais resilientes
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

ensureDirectories();
app.use('/uploads', express.static(UPLOADS_DIR));

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

let isSupabaseActive = Boolean(supabase && !isPlaceholderUrl);

// Permite que os testes troquem o Supabase real por um cliente em memória
export function setSupabaseClientForTests(client) {
  supabase = client;
  isSupabaseActive = Boolean(client);
}
if (!isSupabaseActive) {
  console.log('[Backend] Supabase não configurado: captação e enriquecimento de leads ficam indisponíveis.');
}

// Rota de Teste de Saúde
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: isSupabaseActive ? 'supabase_connected' : 'not_configured',
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

// Captação de Lead Briefing: cria ou atualiza o Contato e o Deal no CRM
app.post('/api/leads', async (req, res) => {
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
      reference_links,
      client_info,
      summary,
      additional_data,
    } = req.body;

    const contactName =
      name ||
      contact_name ||
      client_info?.name ||
      raw_project_name ||
      'Novo Contato';

    const phone = req.body.phone || client_info?.phone || 'Não informado';
    const email = req.body.email || client_info?.email || 'Não informado';
    const website = raw_website || site || (reference_links?.[0]?.url) || null;

    const companyName =
      company ||
      company_name ||
      raw_project_name ||
      null;

    if (!raw_project_name && !company && !name && !contact_name) {
      return res.status(400).json({ error: 'Informe ao menos o nome do responsável ou da empresa.' });
    }

    if (!isSupabaseActive) {
      return res.status(503).json({ error: 'Supabase não configurado: não é possível registrar o lead no CRM.' });
    }

    let finalAdditionalData = additional_data ? { ...additional_data } : {};
    if (website) {
      const existingLinks = Array.isArray(finalAdditionalData.links) ? [...finalAdditionalData.links] : [];
      if (!existingLinks.some((l) => l.url === website)) {
        existingLinks.push({ label: 'Site Oficial', url: website });
      }
      finalAdditionalData.links = existingLinks;
    }

    let defaultUserId = '2b66650c-a300-4239-b922-2aab9bccac6f';
    let defaultAccountId = '98006e91-88b1-44ea-9178-50c257cd973f';
    let contactId = incomingContactId || null;

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
          .eq('title', `Projeto - ${companyName || contactName}`)
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
                title: `Projeto - ${companyName || contactName}`,
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

    if (!contactId) {
      return res.status(502).json({ error: 'Não foi possível registrar o contato no CRM.' });
    }

    console.log(`[Backend] Lead registrado no CRM (contato ${contactId}), aguardando o Decision Gate.`);
    res.status(201).json({ success: true, contact_id: contactId });
  } catch (err) {
    console.error('Erro na rota POST /api/leads:', err);
    res.status(500).json({ error: 'Erro interno do servidor.', details: err.message });
  }
});

// Rota de consulta direta ao Google Places
app.post('/api/dossie/consultar', async (req, res) => {
  try {
    reloadEnv();
    const { query, url } = req.body;
    const target = url || query;
    if (!target) {
      return res.status(400).json({ error: 'Informe a URL ou nome do estabelecimento para consulta.' });
    }
    const result = await buildLeadDossier(target, process.env.GOOGLE_MAPS_API_KEY);
    if (!result.success) {
      return res.status(result.code === 'MISSING_API_KEY' ? 412 : 400).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('Erro na rota /api/dossie/consultar:', err.message);
    res.status(500).json({ error: 'Erro ao consultar Google Places.', details: err.message });
  }
});

// Rota de enriquecimento de Lead com Dossiê
app.post('/api/leads/:id/enrich-dossier', async (req, res) => {
  const { id } = req.params;
  try {
    let contactRecord = null;
    if (isSupabaseActive) {
      const { data: cData } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (cData) contactRecord = cData;
    }

    if (!contactRecord) {
      return res.status(404).json({ error: 'Lead ou contato não encontrado no sistema.' });
    }

    // Extrai possíveis links de Google Maps ou websites de additional_data.links se houver
    let linkFromAdditional = null;
    if (contactRecord?.additional_data?.links && Array.isArray(contactRecord.additional_data.links)) {
      const mapsLink = contactRecord.additional_data.links.find(
        (l) => l?.url && (l.url.includes('google.com/maps') || l.url.includes('maps.app.goo.gl') || l.url.includes('share.google'))
      );
      const siteLink = contactRecord.additional_data.links.find(
        (l) => l?.url && (l.label?.toLowerCase().includes('site') || l.url.startsWith('http'))
      );
      linkFromAdditional = mapsLink?.url || siteLink?.url || null;
    }

    const candidateQuery =
      req.body?.query ||
      linkFromAdditional ||
      contactRecord?.additional_data?.query ||
      contactRecord?.additional_data?.website ||
      contactRecord?.company ||
      contactRecord?.name ||
      '';

    if (!candidateQuery) {
      return res.status(400).json({ error: 'Lead não possui site, link do Google Maps ou nome de empresa para enriquecimento.' });
    }

    const mapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
    const fallbackName =
      contactRecord?.company ||
      contactRecord?.name ||
      '';

    const result = await buildLeadDossier(candidateQuery, mapsKey, {
      additionalLinks: contactRecord?.additional_data?.links || [],
      fallbackQuery: fallbackName,
    });
    if (!result.success) {
      return res.status(result.code === 'MISSING_API_KEY' ? 412 : 400).json(result);
    }

    const contactId = contactRecord.id;
    const { data: contact, error: getErr } = await supabase
      .from('contacts')
      .select('id, company, additional_data')
      .eq('id', contactId)
      .maybeSingle();

    if (getErr) {
      console.warn(`[GoogleMaps] Erro ao buscar contact(${contactId}):`, getErr.message);
    }

    const currentAddData = contact?.additional_data || {};
    const verifiedName = result.dossie?.nome_verificado;
    const verifiedWebsite = result.dossie?.site_oficial;

    const updateContactFields = {
      additional_data: {
        ...currentAddData,
        website: verifiedWebsite || currentAddData.website || '',
        maps_url: req.body?.query || currentAddData.maps_url || '',
        maps_search_link: req.body?.query || currentAddData.maps_search_link || '',
        dossie: result.dossie,
      },
    };

    // Preserva o nome do briefing anterior se for diferente do Maps
    if (contact?.company && verifiedName && contact.company !== verifiedName) {
      if (!currentAddData.nome_original_briefing) {
        updateContactFields.additional_data.nome_original_briefing = contact.company;
      }
    }

    // Atualiza company com o nome oficial verificado
    if (verifiedName) {
      updateContactFields.company = verifiedName;
    }

    // Importante: contacts.phone NUNCA é sobrescrito aqui! Permanece intacto como o WhatsApp do lead.
    const { error: updErr } = await supabase
      .from('contacts')
      .update(updateContactFields)
      .eq('id', contactId);

    if (updErr) {
      console.error(`[GoogleMaps] Erro ao salvar dossiê em contacts(${contactId}):`, updErr);
    } else {
      console.log(`[GoogleMaps] Dossiê salvo com sucesso em contacts(${contactId})!`);
    }

    return res.json({ success: true, dossie: result.dossie });
  } catch (err) {
    console.error(`Erro ao enriquecer dossiê do lead ${id}:`, err.message);
    res.status(500).json({ error: 'Erro ao gerar dossiê do lead.', details: err.message });
  }
});

app.post('/api/leads/:id/scrape-deep', async (req, res) => {
  const { id } = req.params;
  const reqUrls = req.body?.urls;

  try {
    let contactRecord = null;
    if (isSupabaseActive) {
      const { data: cData } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (cData) contactRecord = cData;
    }

    if (!contactRecord) {
      return res.status(404).json({ error: 'Lead ou contato não encontrado no sistema.' });
    }

    // Coleta URLs candidatas
    let candidateUrls = [];
    if (Array.isArray(reqUrls) && reqUrls.length > 0) {
      candidateUrls = reqUrls.filter((u) => typeof u === 'string' && u.trim().startsWith('http'));
    }

    const currentAddData = contactRecord.additional_data || {};

    if (candidateUrls.length === 0 && Array.isArray(currentAddData.scraping_urls)) {
      candidateUrls = currentAddData.scraping_urls.filter((u) => typeof u === 'string' && u.trim().startsWith('http'));
    }

    if (candidateUrls.length === 0 && Array.isArray(currentAddData.links)) {
      candidateUrls = currentAddData.links
        .map((l) => (typeof l === 'string' ? l : l?.url))
        .filter((u) => typeof u === 'string' && u.trim().startsWith('http'));
    }

    if (candidateUrls.length === 0 && currentAddData.website) {
      const w = currentAddData.website.trim();
      candidateUrls.push(w.startsWith('http') ? w : `https://${w}`);
    }

    if (candidateUrls.length === 0 && currentAddData.dossie?.site_oficial) {
      const s = currentAddData.dossie.site_oficial.trim();
      candidateUrls.push(s.startsWith('http') ? s : `https://${s}`);
    }

    // Deduplica URLs
    candidateUrls = Array.from(new Set(candidateUrls));

    if (candidateUrls.length === 0) {
      return res.status(400).json({ error: 'Nenhuma URL informada ou cadastrada para este lead para realizar a raspagem.' });
    }

    const pythonServiceUrl = AI_FACTORY_URL;
    console.log(`[ScrapeDeep] Disparando raspagem para ${candidateUrls.length} URLs do lead ${id} em ${pythonServiceUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    let scraperResponse;
    try {
      scraperResponse = await fetch(`${pythonServiceUrl}/api/scrape/deep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: candidateUrls, timeout: 25 }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!scraperResponse.ok) {
      const errText = await scraperResponse.text();
      return res.status(scraperResponse.status).json({
        error: `Falha no serviço de raspagem (${scraperResponse.status}): ${errText}`,
      });
    }

    const scrapedData = await scraperResponse.json();

    // Persistência no Supabase
    const contactId = contactRecord.id;

    if (isSupabaseActive && contactId) {
      const { data: freshContact } = await supabase
        .from('contacts')
        .select('additional_data')
        .eq('id', contactId)
        .maybeSingle();

      const baseAddData = freshContact?.additional_data || currentAddData || {};
      const updatedAddData = {
        ...baseAddData,
        scraping_urls: candidateUrls,
        scraped_data: scrapedData,
      };

      const { error: updErr } = await supabase
        .from('contacts')
        .update({ additional_data: updatedAddData })
        .eq('id', contactId);

      if (updErr) {
        console.warn(`[ScrapeDeep] Erro ao salvar scraped_data no contact(${contactId}):`, updErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      scraped_data: scrapedData,
      urls: candidateUrls,
    });
  } catch (error) {
    console.error(`[ScrapeDeep] Erro no endpoint para lead ${id}:`, error);
    return res.status(500).json({
      error: `Erro ao executar raspagem profunda: ${error.message}`,
    });
  }
});

app.post('/api/leads/:id/diagnose', async (req, res) => {
  const { id } = req.params;
  console.log(`[Diagnostico] Iniciando diagnóstico multimodal da IA para lead ID: ${id}`);

  try {
    let contactRecord = null;
    if (isSupabaseActive) {
      const { data: cData } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (cData) contactRecord = cData;
    }

    if (!contactRecord) {
      return res.status(404).json({ error: 'Lead ou contato não encontrado no sistema.' });
    }

    const dossie = contactRecord.additional_data?.dossie || null;
    const companyName =
      contactRecord.company ||
      contactRecord.name ||
      dossie?.nome_verificado ||
      'Empresa';

    if (!dossie) {
      return res.status(400).json({
        success: false,
        error: 'Lead não possui Dossiê do Google Maps. Consulte o Maps antes de gerar o diagnóstico.',
      });
    }

    const scrapedData = contactRecord.additional_data?.scraped_data || null;
    const mapsUrl =
      dossie?.google_maps_url ||
      contactRecord?.additional_data?.maps_url ||
      contactRecord?.additional_data?.maps_search_link ||
      '';

    const result = await runMultimodalBusinessDiagnosis({
      dossie,
      companyName,
      scrapedData,
      mapsUrl,
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    });

    if (!result.success) {
      const statusCode = result.code === 'MISSING_API_KEY' ? 412 : 502;
      return res.status(statusCode).json(result);
    }

    // Persistência em contacts.additional_data
    const { data: ct } = await supabase
      .from('contacts')
      .select('additional_data')
      .eq('id', contactRecord.id)
      .maybeSingle();

    const curAdd = ct?.additional_data || {};
    await supabase
      .from('contacts')
      .update({
        additional_data: {
          ...curAdd,
          diagnostico_ia: result.diagnostico,
          prompt_mestre: result.prompt_mestre,
        },
      })
      .eq('id', contactRecord.id);

    return res.json({
      success: true,
      diagnostico: result.diagnostico,
      prompt_mestre: result.prompt_mestre,
    });
  } catch (err) {
    console.error(`Erro ao gerar diagnóstico multimodal do lead ${id}:`, err.message);
    res.status(500).json({ error: 'Erro interno ao processar diagnóstico da IA.', details: err.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Servidor Backend rodando com sucesso na porta ${PORT}`);
  console.log(`URL base da API: http://localhost:${PORT}`);
  console.log(`Serviço de raspagem em: ${AI_FACTORY_URL}`);
  console.log(`Status Supabase: ${isSupabaseActive ? supabaseUrl : 'não configurado'}`);
  console.log(`==================================================`);
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
