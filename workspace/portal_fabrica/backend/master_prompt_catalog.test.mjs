import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMasterPrompt } from './multimodal_diagnosis_service.js';

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

test('Master Prompt gets the placeholder catalog when there is no catalog source', () => {
  const prompt = buildMasterPrompt({ ...base });
  assert.ok(prompt.includes('## Catálogo'));
  assert.ok(prompt.includes('### [Categoria — inserir aqui]'));
  assert.ok(prompt.includes('- **[Nome do item — inserir aqui]**: [descrição — inserir aqui] — [preço — inserir aqui]'));
});

test('Master Prompt gets placeholders but keeps Informações Gerais when the extraction found no items', () => {
  const prompt = buildMasterPrompt({ ...base, catalogoExtraido: { markdown: CATALOG_WITHOUT_ITEMS } });
  assert.ok(prompt.includes(PLACEHOLDER));
  assert.ok(prompt.includes('Ter a Dom, 18h às 23h'), 'Informações Gerais aparecem mesmo sem itens');
  assert.ok(!prompt.includes('Nenhum item de catálogo encontrado'), 'a linha de controle não vai para o prompt');
});
