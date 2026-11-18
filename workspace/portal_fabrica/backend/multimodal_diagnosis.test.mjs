import test from 'node:test';
import assert from 'node:assert/strict';
import { runMultimodalBusinessDiagnosis } from './multimodal_diagnosis_service.js';
import { buildMasterPrompt } from './master_prompt.js';

test('Multimodal Diagnosis - fail-fast when GEMINI_API_KEY is missing', async () => {
  const mockDossie = {
    nome_verificado: 'Pizzaria Bella Napoli',
    endereco_formatado: 'Rua das Flores, 123',
    nota: 4.8,
    total_avaliacoes: 140,
    fotos: [{ id: 1, photo_url: 'http://localhost/foto1.jpg' }],
  };

  const result = await runMultimodalBusinessDiagnosis({
    dossie: mockDossie,
    companyName: 'Pizzaria Bella Napoli',
    apiKey: '',
  });

  assert.equal(result.success, false);
  assert.equal(result.code, 'MISSING_API_KEY');
  assert.ok(result.error.includes('GEMINI_API_KEY'));
});

test('Multimodal Diagnosis - strips quotes and whitespace from apiKey properly', async () => {
  const mockDossie = {
    nome_verificado: 'Pizzaria Bella Napoli',
    endereco_formatado: 'Rua das Flores, 123',
    nota: 4.8,
    total_avaliacoes: 140,
  };

  // When only quotes/whitespace are provided, it must treat as missing/empty
  const resultQuotes = await runMultimodalBusinessDiagnosis({
    dossie: mockDossie,
    companyName: 'Pizzaria Bella Napoli',
    apiKey: "  ''  ",
  });

  assert.equal(resultQuotes.success, false);
  assert.equal(resultQuotes.code, 'MISSING_API_KEY');
});

test('Master Prompt Synthesizer - structures 4 blocks and real client assets', () => {
  const mockDossie = {
    nome_verificado: 'Café & Coworking Aurora',
    endereco_formatado: 'Av. Ipiranga, 500 - Porto Alegre, RS',
    telefone: '(51) 99888-1122',
    nota: 4.9,
    total_avaliacoes: 85,
    nicho_detectado: 'cafe',
    google_maps_url: 'https://maps.app.goo.gl/aurora123',
    horarios_funcionamento: ['Segunda a Sexta: 08:00 - 20:00', 'Sábado: 09:00 - 18:00'],
    elogios_destaque: [
      { author: 'Camila R.', rating: 5, text: 'Melhor café filtrado da cidade e internet super rápida!' },
    ],
  };

  const mockDiagnostico = {
    resumo_empresa: 'Cafeteria de cafés especiais com estações silenciosas para coworking e reuniões.',
    estilo_visual_vibe: 'Estética escandinava minimalista, com madeira clara, plantas e iluminação natural.',
    publico_alvo: 'Profissionais remotos, freelancers e entusiastas de café de alta qualidade.',
    diferenciais_unicos: [
      'Grãos especiais de torra própria',
      'Mesas ergonômicas com tomadas individuais',
    ],
    paleta_cores_sugerida: 'Verde sálvia #8A9A86, Caramelo torrado #C68B59 e Off-white #FAF9F6',
  };

  const prompt = buildMasterPrompt({
    companyName: 'Café & Coworking Aurora',
    dossie: mockDossie,
    diagnostico: mockDiagnostico,
  });

  // Briefing do Negócio + módulo Site + fim no modo especificar
  assert.ok(prompt.includes('## Briefing do Negócio: Café & Coworking Aurora'));
  assert.ok(prompt.includes('## O que construir: Site'));
  assert.ok(prompt.includes('## Antes de construir'));

  // Verify real client data
  assert.ok(prompt.includes('Café & Coworking Aurora'));
  assert.ok(prompt.includes('Av. Ipiranga, 500'));
  assert.ok(prompt.includes('(51) 99888-1122'));
  assert.ok(prompt.includes('4.9★ em 85 avaliações'));
  assert.ok(prompt.includes('Melhor café filtrado da cidade'));
  assert.ok(prompt.includes('Verde sálvia'));
  assert.ok(prompt.includes('React, Vite, TypeScript e Tailwind CSS'));
  assert.ok(prompt.includes('https://maps.app.goo.gl/aurora123'));
});

test('Master Prompt - every map action uses the client Maps link, never a text address or generic search', () => {
  const prompt = buildMasterPrompt({
    companyName: 'Studio Bella',
    dossie: {
      nome_verificado: 'Studio Bella',
      endereco_formatado: 'Rua Bela Vista, 100',
      google_maps_url: 'https://maps.app.goo.gl/studiobella99',
    },
    diagnostico: { resumo_empresa: 'Studio de beleza' },
  });

  const rule = prompt.split('\n').find((line) => line.includes('Toda ação de mapa'));
  assert.ok(rule, 'the map rule exists');
  assert.ok(rule.includes('https://maps.app.goo.gl/studiobella99'));
  assert.ok(!prompt.includes('google.com/maps/search'));
});

test('Multimodal Diagnosis - returns the diagnosis and Master Prompt from a Gemini answer', async () => {
  const http = await import('node:http');
  let sentParts = null;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (req.url === '/foto.jpg') {
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        return res.end('JPEG');
      }
      sentParts = JSON.parse(body).contents[0].parts;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '```json\n{"resumo_empresa":"Pizzaria de bairro com forno a lenha.","diferenciais_unicos":["Massa de fermentação natural"]}\n```' }] } }],
      }));
    });
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  process.env.GEMINI_API_BASE_URL = base;
  try {
    const result = await runMultimodalBusinessDiagnosis({
      dossie: { nome_verificado: 'Pizzaria Bella', nota: 4.8, fotos: [{ id: 1, photo_url: `${base}/foto.jpg` }] },
      companyName: 'Pizzaria Bella',
      apiKey: 'chave',
      models: ['modelo-teste'],
    });
    assert.equal(result.success, true);
    assert.equal(result.diagnostico.resumo_empresa, 'Pizzaria de bairro com forno a lenha.');
    assert.equal(result.diagnostico.modelo_utilizado, 'modelo-teste');
    assert.equal(result.diagnostico.fotos_analisadas, 1);
    assert.ok(result.prompts_mestre.site.includes('Pizzaria de bairro com forno a lenha.'));
    assert.ok(result.prompts_mestre.agenda.includes('Massa de fermentação natural'));
    assert.equal(sentParts[1].inlineData.mimeType, 'image/jpeg', 'a foto do dossiê vai como inlineData');
  } finally {
    delete process.env.GEMINI_API_BASE_URL;
    await new Promise((r) => server.close(r));
  }
});
