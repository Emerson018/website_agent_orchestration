import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runMultimodalBusinessDiagnosis,
  buildMasterPrompt,
} from './multimodal_diagnosis_service.js';

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

  // Verify all 4 blocks exist
  assert.ok(prompt.includes('BLOCO 1: IDENTIDADE, POSICIONAMENTO & ESSÊNCIA DO NEGÓCIO'), 'Must contain Block 1');
  assert.ok(prompt.includes('BLOCO 2: DADOS & ATIVOS VERIFICADOS (GOOGLE MAPS) — REGRAS ESTRITAS'), 'Must contain Block 2');
  assert.ok(prompt.includes('BLOCO 3: INSUMOS CRIATIVOS (DELEGAÇÃO PARA AS SKILLS DE DESIGN & MOTION)'), 'Must contain Block 3');
  assert.ok(prompt.includes('BLOCO 4: DIRETRIZES TÉCNICAS E METODOLOGIA DE CONSTRUÇÃO'), 'Must contain Block 4');

  // Verify real client data
  assert.ok(prompt.includes('Café & Coworking Aurora'));
  assert.ok(prompt.includes('Av. Ipiranga, 500'));
  assert.ok(prompt.includes('(51) 99888-1122'));
  assert.ok(prompt.includes('4.9★ (85 avaliações)'));
  assert.ok(prompt.includes('Melhor café filtrado da cidade'));
  assert.ok(prompt.includes('Verde sálvia'));
  assert.ok(prompt.includes('React (Vite), Tailwind CSS, Lucide Icons e Framer Motion'));
  assert.ok(prompt.includes('Link Oficial do Google Maps (Perfil do Cliente)'));
  assert.ok(prompt.includes('https://maps.app.goo.gl/aurora123'));
  assert.ok(prompt.includes('e NUNCA para o endereço em texto'));
});

test('Master Prompt Synthesizer - Block 2 strictly directs Google Maps links to client maps URL rather than text address', () => {
  const prompt = buildMasterPrompt({
    companyName: 'Studio Bella',
    dossie: {
      nome_verificado: 'Studio Bella',
      endereco_formatado: 'Rua Bela Vista, 100',
      google_maps_url: 'https://maps.app.goo.gl/studiobella99',
    },
    diagnostico: { resumo_empresa: 'Studio de beleza' },
  });

  const bloco2Match = prompt.match(/### BLOCO 2: DADOS & ATIVOS VERIFICADOS \(GOOGLE MAPS\)[\s\S]*?(?=### BLOCO 3)/);
  assert.ok(bloco2Match, 'Bloco 2 must exist');
  const bloco2Text = bloco2Match[0];

  assert.ok(bloco2Text.includes('https://maps.app.goo.gl/studiobella99'));
  assert.ok(bloco2Text.includes('e NUNCA para o endereço em texto ou buscas genéricas'));
  assert.ok(bloco2Text.includes('Regra Inegociável para Links de Mapas'));
});
