import { describe, it, expect } from 'vitest';
import {
  validateCatalogSelection,
  MAX_CATALOG_UPLOAD_BYTES,
  needsReextractConfirmation,
  hasUnsavedCatalogEdit,
} from './extracted-catalog';

describe('Catálogo Extraído: re-extraction and editing', () => {
  it('asks for confirmation only when the saved catalog has manual edits', () => {
    expect(needsReextractConfirmation(null)).toBe(false);
    expect(needsReextractConfirmation({ markdown: '## A', editado_manualmente: false })).toBe(false);
    expect(needsReextractConfirmation({ markdown: '## A' })).toBe(false);
    expect(needsReextractConfirmation({ markdown: '## A', editado_manualmente: true })).toBe(true);
  });

  it('detects a draft that differs from the saved catalog', () => {
    expect(hasUnsavedCatalogEdit('## A', { markdown: '## A' })).toBe(false);
    expect(hasUnsavedCatalogEdit('## A\n- novo', { markdown: '## A' })).toBe(true);
    expect(hasUnsavedCatalogEdit('', null)).toBe(false);
  });
});

const file = (name: string, type: string, size = 1000) => ({ name, type, size });

describe('Catálogo Extraído: file selection', () => {
  it('accepts several images and PDFs within the limit', () => {
    expect(
      validateCatalogSelection([
        file('cardapio-1.jpg', 'image/jpeg'),
        file('cardapio-2.png', 'image/png'),
        file('bebidas.webp', 'image/webp'),
        file('cardapio.pdf', 'application/pdf'),
      ])
    ).toBeNull();
  });

  it('rejects an empty selection', () => {
    expect(validateCatalogSelection([])).toMatch(/ao menos um arquivo/i);
  });

  it('names the file whose type is not accepted', () => {
    expect(validateCatalogSelection([file('ok.png', 'image/png'), file('notas.txt', 'text/plain')])).toMatch(
      /notas\.txt/
    );
  });

  it('rejects a selection that adds up to more than 15 MB', () => {
    const half = MAX_CATALOG_UPLOAD_BYTES / 2;
    expect(validateCatalogSelection([file('a.jpg', 'image/jpeg', half), file('b.jpg', 'image/jpeg', half)])).toBeNull();
    expect(
      validateCatalogSelection([file('a.jpg', 'image/jpeg', half), file('b.jpg', 'image/jpeg', half + 1)])
    ).toMatch(/15 MB/);
  });
});
