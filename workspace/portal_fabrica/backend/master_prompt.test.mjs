import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMasterPrompt, buildMasterPrompts } from './master_prompt.js';

// O Briefing do Negócio é tudo entre o título e o módulo do tipo
const briefingOf = (prompt) => prompt.slice(prompt.indexOf('## Briefing do Negócio'), prompt.indexOf('## O que construir'));

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

test('buildMasterPrompts makes one prompt per Tipo de Projeto sharing the same Briefing do Negócio', () => {
  const prompts = buildMasterPrompts(FULL);
  assert.ok(prompts.site.includes('## O que construir: Site'));
  assert.ok(prompts.agenda.includes('## O que construir: Agenda'));
  assert.ok(briefingOf(prompts.site).length > 200);
  assert.equal(briefingOf(prompts.agenda), briefingOf(prompts.site));
  assert.equal(prompts.site, buildMasterPrompt(FULL), 'the Site prompt is the default Master Prompt');
});

test('The Agenda module: booking, owner panel with login, WhatsApp confirmation, shared Supabase, durations as a gap', () => {
  const agenda = buildMasterPrompts(FULL).agenda;
  const module = agenda.slice(agenda.indexOf('## O que construir: Agenda'), agenda.indexOf('## Antes de construir'));
  assert.match(module, /serviço, o dia e um horário livre/);
  assert.match(module, /painel com login/);
  assert.match(module, /link do WhatsApp/);
  assert.match(module, /Supabase/);
  assert.match(module, /mesmo projeto Supabase/);
  assert.match(module, /sem pagamento online/i);
  assert.ok(!/(anon|service_role|supabase\.co)/i.test(agenda), 'no Supabase URL or key in the prompt');

  const gaps = agenda.slice(agenda.indexOf('## Pendências do Prompt'));
  assert.match(gaps, /Duração de cada serviço/);
  assert.ok(!buildMasterPrompts(FULL).site.includes('Duração de cada serviço'), 'durations are an Agenda gap only');
});

test('With a Design do Cliente every prompt embeds it verbatim and must follow it', () => {
  const DESIGN = '# DESIGN.md\n\n## Cores\n- primária: #1B4D3E\n\n## Tipografia\n- títulos: Fraunces';
  const prompts = buildMasterPrompts({ ...FULL, designDoCliente: DESIGN });
  for (const prompt of Object.values(prompts)) {
    assert.ok(prompt.includes(DESIGN), 'the design is embedded verbatim');
    assert.match(prompt, /siga este design à risca/i);
    assert.ok(!prompt.includes('Antes de codar, decida o design system'), 'no new design is decided');
    assert.ok(!prompt.includes('Verde sálvia'), 'the diagnosis palette gives way to the client design');
  }
});

test('Without a Design do Cliente the prompt asks to decide the design and deliver the DESIGN.md', () => {
  const prompt = buildMasterPrompt(FULL);
  assert.ok(prompt.includes('Antes de codar, decida o design system'));
  assert.match(prompt, /entregue esse arquivo no fim/);
  assert.ok(!/siga este design à risca/i.test(prompt));
});

const moduleOf = (prompt) => prompt.slice(prompt.indexOf('## O que construir'), prompt.indexOf('## Antes de construir'));

test('The Dashboard prompt shares the Briefing do Negócio exactly with Site and Agenda', () => {
  const prompts = buildMasterPrompts(FULL);
  assert.ok(prompts.dashboard.includes('## O que construir: Dashboard'));
  assert.equal(briefingOf(prompts.dashboard), briefingOf(prompts.site));
  assert.equal(briefingOf(prompts.dashboard), briefingOf(prompts.agenda));
});

test('The Dashboard module: owner-only login shared with the Agenda, shared Supabase, metrics left to the interview', () => {
  const module = moduleOf(buildMasterPrompts({ ...FULL, tiposProjeto: ['Agenda', 'Dashboard'] }).dashboard);
  assert.match(module, /só para o dono/i);
  assert.match(module, /mesmo login do painel da Agenda/);
  assert.match(module, /mesmo projeto Supabase/);
  assert.match(module, /agendamentos/);
  assert.match(module, /planilha/i);
  assert.match(module, /decididos na entrevista/);
  assert.ok(!/(anon|service_role|supabase\.co)/i.test(module), 'no Supabase URL or key');
});

test('Without an Agenda the Dashboard starts from imported spreadsheets and the data source is a Pendência', () => {
  const withAgenda = buildMasterPrompts({ ...FULL, tiposProjeto: ['Agenda', 'Dashboard'] }).dashboard;
  const withoutAgenda = buildMasterPrompts({ ...FULL, tiposProjeto: ['Dashboard'] }).dashboard;

  assert.match(moduleOf(withAgenda), /lê os agendamentos da Agenda/i);
  assert.ok(!withAgenda.includes('Fonte dos dados do Dashboard'));

  assert.match(moduleOf(withoutAgenda), /começa pela importação/);
  assert.match(withoutAgenda.slice(withoutAgenda.indexOf('## Pendências do Prompt')), /Fonte dos dados do Dashboard/);
});

test('Every Tipo de Projeto has a module, from the single list in project_types.js', async () => {
  const { PROJECT_TYPES } = await import('./project_types.js');
  const prompts = buildMasterPrompts(FULL);
  assert.deepEqual(Object.keys(prompts), PROJECT_TYPES.map((t) => t.key));
  for (const { key, label } of PROJECT_TYPES) assert.ok(prompts[key].includes(`## O que construir: ${label}`));
});

test('The Agenda gap names the services whose duration is unknown, from the catalog and the site', () => {
  const agenda = buildMasterPrompts({
    ...FULL,
    catalogoExtraido: { markdown: '## Cortes\n### Corte masculino\n- **Preço:** R$ 40,00\n### Barba\n- **Preço:** R$ 30,00' },
    scrapedData: { cardapio: [{ nome: 'Sobrancelha' }], institucional: { servicos: ['Pigmentação'] } },
  }).agenda;
  const gap = agenda.slice(agenda.indexOf('## Pendências do Prompt')).split('\n').find((l) => l.includes('Duração'));
  assert.match(gap, /Corte masculino/);
  assert.match(gap, /Barba/);
  assert.match(gap, /Sobrancelha/);
  assert.match(gap, /Pigmentação/);

  const semCatalogo = buildMasterPrompts(EMPTY).agenda;
  assert.match(semCatalogo, /Duração de cada serviço/);
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
