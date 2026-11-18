import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMasterPrompt } from './master_prompt.js';

// Lead completo: dossiê do Google Maps, diagnóstico e catálogo
const FULL = {
  companyName: 'Café Aurora',
  dossie: {
    nota: 4.9,
    total_avaliacoes: 85,
    endereco_formatado: 'Av. Ipiranga, 500 - Porto Alegre',
    telefone: '(51) 99888-1122',
    google_maps_url: 'https://maps.app.goo.gl/aurora123',
    horarios_funcionamento: ['Segunda: 08:00–18:00', 'Sábado: 09:00–14:00'],
    elogios_destaque: [{ text: 'Melhor café filtrado da cidade', author: 'Ana' }],
  },
  diagnostico: {
    resumo_empresa: 'Cafeteria de cafés especiais com coworking.',
    estilo_visual_vibe: 'Escandinavo minimalista, madeira clara.',
    publico_alvo: 'Profissionais remotos.',
    diferenciais_unicos: ['Torra própria'],
    paleta_cores_sugerida: 'Verde sálvia #8A9A86',
  },
  catalogoExtraido: { markdown: '## Cafés\n### Coado\n- **Preço:** R$ 12,00' },
};

// Lead quase vazio: só o nome
const EMPTY = { companyName: 'Studio Novo', dossie: {}, diagnostico: {} };

const FORBIDDEN = ['Antigravity', 'mattpocock', 'impeccable', 'emilkowalski', 'emil-design', 'inserir aqui'];

test('Master Prompt names no tool or skill and has no placeholders', () => {
  for (const input of [FULL, EMPTY]) {
    const prompt = buildMasterPrompt(input);
    for (const word of FORBIDDEN) {
      assert.ok(!prompt.toLowerCase().includes(word.toLowerCase()), `prompt must not contain "${word}"`);
    }
  }
});

test('Missing facts leave their sections out and are listed in the Pendências do Prompt, never invented', () => {
  const prompt = buildMasterPrompt(EMPTY);
  assert.ok(!prompt.includes('### Catálogo'), 'no catalog section without catalog data');
  assert.ok(!prompt.includes('**Horários:**'), 'no hours without hours');
  assert.ok(!prompt.includes('**Avaliação:**'), 'no rating without rating');

  const gaps = prompt.slice(prompt.indexOf('## Pendências do Prompt'));
  assert.ok(prompt.includes('## Pendências do Prompt'));
  assert.match(gaps, /Catálogo/);
  assert.match(gaps, /Horários/);
  assert.match(gaps, /Nota/);
  assert.match(gaps, /WhatsApp/);

  // os textos genéricos que o prompt antigo inventava não aparecem mais
  for (const invented of ['Excelente reputação', 'Segunda a Sábado', 'Atendimento de alto padrão', 'Especialistas em', 'Clientes locais que valorizam']) {
    assert.ok(!prompt.includes(invented), `must not invent "${invented}"`);
  }
});

test('With full data every fact appears once and map actions use the official Maps link', () => {
  const prompt = buildMasterPrompt(FULL);
  const count = (s) => prompt.split(s).length - 1;

  assert.equal(count('(51) 99888-1122'), 2, 'WhatsApp in the data and in the CTA rule');
  assert.equal(count('Av. Ipiranga, 500'), 1);
  assert.equal(count('Melhor café filtrado da cidade'), 1);
  assert.equal(count('### Coado'), 1);
  assert.ok(prompt.includes('4.9★ em 85 avaliações'));
  assert.ok(prompt.includes('Sábado: 09:00–14:00'));
  assert.ok(prompt.includes('Toda ação de mapa'));
  assert.equal(count('https://maps.app.goo.gl/aurora123'), 2, 'Maps link in the data and in the map rule');
  assert.ok(!prompt.includes('google.com/maps/search'), 'never a generic Maps search');
  assert.ok(prompt.includes('Verde sálvia #8A9A86') && prompt.includes('só referência'), 'palette is a reference only');
  assert.ok(!prompt.includes('## Pendências do Prompt'), 'nothing missing, no gaps section');
});

test('The Site module asks for a single landing page with WhatsApp as the main action', () => {
  const prompt = buildMasterPrompt(FULL);
  assert.ok(prompt.includes('## O que construir: Site'));
  assert.match(prompt, /landing page, uma página só/);
  assert.ok(prompt.includes('src/data/business.json'), 'business data kept apart from code');
  assert.ok(prompt.includes('React, Vite, TypeScript e Tailwind CSS') && prompt.includes('Motion'));
  assert.ok(prompt.includes('DESIGN.md'));
});

test('Master Prompt ends as a Prompt de Especificação: interview, specify, split, do not build yet', () => {
  const prompt = buildMasterPrompt(FULL);
  const lastPart = prompt.slice(prompt.lastIndexOf('## Antes de construir'));
  assert.ok(prompt.includes('## Antes de construir'), 'has the specification section');
  assert.match(lastPart, /não comece a construir/i);
  assert.match(lastPart, /entreviste o operador/i);
  assert.match(lastPart, /especificação/i);
  assert.match(lastPart, /tarefas/i);
});
