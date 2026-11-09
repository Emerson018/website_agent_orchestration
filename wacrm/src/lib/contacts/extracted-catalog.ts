// Regras do Catálogo Extraído compartilhadas pelo card do perfil do lead.
// Os mesmos limites são validados de novo no backend do Portal.

export const CATALOG_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;

/** Valor para o atributo `accept` do input de arquivos. */
export const CATALOG_ACCEPT = CATALOG_MIME_TYPES.join(',');

/** Limite por envio (soma dos arquivos selecionados). */
export const MAX_CATALOG_UPLOAD_BYTES = 15 * 1024 * 1024;

export interface CatalogFile {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  url: string;
  path?: string;
  enviado_em?: string;
}

/** O Catálogo Extraído salvo em `contacts.additional_data.catalogo_extraido`. */
export interface ExtractedCatalog {
  markdown: string;
  gerado_em?: string;
  modelo_utilizado?: string;
  arquivos_processados?: number;
  editado_manualmente?: boolean;
}

interface SelectedFile {
  name: string;
  type: string;
  size: number;
}

/** Retorna a mensagem de erro da seleção, ou null quando ela pode ser enviada. */
export function validateCatalogSelection(files: SelectedFile[]): string | null {
  if (files.length === 0) return 'Selecione ao menos um arquivo.';

  const invalid = files.find((f) => !(CATALOG_MIME_TYPES as readonly string[]).includes(f.type));
  if (invalid) return `O arquivo "${invalid.name}" não é aceito. Use imagens JPG, PNG, WEBP ou PDF.`;

  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_CATALOG_UPLOAD_BYTES) {
    return 'A seleção passa de 15 MB. Envie menos arquivos por vez ou arquivos menores.';
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Reextrair substitui o catálogo; pede confirmação quando há edições manuais salvas. */
export function needsReextractConfirmation(catalog: ExtractedCatalog | null): boolean {
  return Boolean(catalog?.editado_manualmente);
}

/** O rascunho da área de texto difere do catálogo salvo. */
export function hasUnsavedCatalogEdit(draft: string, catalog: ExtractedCatalog | null): boolean {
  return draft !== (catalog?.markdown ?? '');
}

// Mesma regra do backend do Portal (catalog_extraction.js): ao menos um "### <Item>"
// e não ser a resposta "sem itens".
export const NO_CATALOG_ITEMS_LINE = 'Nenhum item de catálogo encontrado nos arquivos.';

export function catalogHasItems(markdown?: string | null): boolean {
  const text = markdown || '';
  return /^###\s+\S/m.test(text) && !text.includes(NO_CATALOG_ITEMS_LINE);
}
