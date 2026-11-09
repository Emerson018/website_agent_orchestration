import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogExtractionPrompt, NO_CATALOG_ITEMS_LINE } from './catalog_extraction.js';

test('extraction prompt asks for the fixed, generic catalog structure', () => {
  const prompt = buildCatalogExtractionPrompt({ companyName: 'Pizzaria Bella' });

  assert.ok(prompt.includes('Pizzaria Bella'));
  for (const piece of ['## Informações Gerais', '## <Categoria>', '### <Item>']) {
    assert.ok(prompt.includes(piece), `estrutura: ${piece}`);
  }
  for (const field of ['**Descrição:**', '**Preço:**', '**Variações/Tamanhos:**', '**Adicionais:**', '**Observações:**']) {
    assert.ok(prompt.includes(field), `campo: ${field}`);
  }
  // Serve para qualquer tipo de negócio, não só cardápio
  assert.match(prompt, /qualquer tipo de negócio/i);
});

test('extraction prompt carries the no-invention rules and the no-items line', () => {
  const prompt = buildCatalogExtractionPrompt({ companyName: 'Loja X' });

  assert.match(prompt, /nunca invente/i);
  assert.match(prompt, /omita o campo/i);
  assert.ok(prompt.includes('[ilegível]'));
  assert.ok(prompt.includes('R$ 48,00'), 'preços mantidos como escritos');
  assert.equal(NO_CATALOG_ITEMS_LINE, 'Nenhum item de catálogo encontrado nos arquivos.');
  assert.ok(prompt.includes(NO_CATALOG_ITEMS_LINE));
});
