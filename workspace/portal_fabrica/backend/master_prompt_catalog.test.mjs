import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMasterPrompt } from './master_prompt.js';

const base = { companyName: 'Pizzaria Bella', dossie: { nota: 4.8, total_avaliacoes: 10 }, diagnostico: {} };

const CATALOG_WITH_ITEMS = `## Informações Gerais
- **Formas de pagamento:** Pix e cartão

## Pizzas
### Margherita
- **Preço:** R$ 48,00`;

const CATALOG_WITHOUT_ITEMS = `## Informações Gerais
- **Horários:** Ter a Dom, 18h às 23h

Nenhum item de catálogo encontrado nos arquivos.`;

const SCRAPED = { cardapio: [{ nome: 'Calabresa', preco: 'R$ 45,00' }] };

const PLACEHOLDER = '[Nome do item — inserir aqui]';

test('Master Prompt includes the Catálogo Extraído items', () => {
  const prompt = buildMasterPrompt({ ...base, catalogoExtraido: { markdown: CATALOG_WITH_ITEMS } });
  assert.ok(prompt.includes('### Margherita'));
  assert.ok(prompt.includes('R$ 48,00'));
  assert.ok(prompt.includes('Pix e cartão'));
  assert.ok(!prompt.includes(PLACEHOLDER));
});

test('Master Prompt includes both the Catálogo Extraído and the scraped items', () => {
  const prompt = buildMasterPrompt({ ...base, catalogoExtraido: { markdown: CATALOG_WITH_ITEMS }, scrapedData: SCRAPED });
  assert.ok(prompt.includes('### Margherita'));
  assert.ok(prompt.includes('**Calabresa**'));
  assert.ok(!prompt.includes(PLACEHOLDER));
});

test('Master Prompt uses scraped items alone without placeholders', () => {
  const prompt = buildMasterPrompt({ ...base, scrapedData: SCRAPED });
  assert.ok(prompt.includes('**Calabresa**'));
  assert.ok(!prompt.includes(PLACEHOLDER));
});

test('Without any catalog source the Master Prompt has no catalog section and lists it in the Pendências', () => {
  const prompt = buildMasterPrompt({ ...base });
  assert.ok(!prompt.includes('### Catálogo'));
  assert.ok(!prompt.includes(PLACEHOLDER));
  assert.match(prompt.slice(prompt.indexOf('## Pendências do Prompt')), /Catálogo/);
});

test('When the extraction found no items the Informações Gerais stay and the catalog is a Pendência', () => {
  const prompt = buildMasterPrompt({ ...base, catalogoExtraido: { markdown: CATALOG_WITHOUT_ITEMS } });
  assert.ok(!prompt.includes(PLACEHOLDER));
  assert.ok(prompt.includes('Ter a Dom, 18h às 23h'), 'Informações Gerais aparecem mesmo sem itens');
  assert.ok(!prompt.includes('Nenhum item de catálogo encontrado'), 'a linha de controle não vai para o prompt');
  assert.match(prompt.slice(prompt.indexOf('## Pendências do Prompt')), /Catálogo/);
});
