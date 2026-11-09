import crypto from 'crypto';

// Arquivos aceitos para o Catálogo Extraído: imagens e PDF, que o Gemini lê nativamente
export const CATALOG_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// Limite por envio (soma dos arquivos), para caber na requisição ao Gemini
export const MAX_CATALOG_UPLOAD_BYTES = 15 * 1024 * 1024;

export const CATALOG_BUCKET = 'lead-documents';

/**
 * Valida um envio de arquivos do catálogo e decodifica o base64.
 * @returns {{ ok: true, files: Array<{name, mimeType, buffer}> } | { ok: false, status: number, error: string }}
 */
export function parseCatalogUpload(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return { ok: false, status: 400, error: 'Envie ao menos um arquivo (imagem JPG, PNG, WEBP ou PDF).' };
  }

  const parsed = [];
  let total = 0;
  for (const file of files) {
    const name = String(file?.fileName || '').trim() || 'arquivo';
    const mimeType = String(file?.mimeType || '').toLowerCase();
    if (!CATALOG_MIME_TYPES.includes(mimeType)) {
      return {
        ok: false,
        status: 400,
        error: `O arquivo "${name}" não é aceito. Use imagens JPG, PNG, WEBP ou PDF.`,
      };
    }
    const base64 = String(file?.base64Data || '').replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length === 0) {
      return { ok: false, status: 400, error: `O arquivo "${name}" está vazio.` };
    }
    total += buffer.length;
    parsed.push({ name, mimeType, buffer });
  }

  if (total > MAX_CATALOG_UPLOAD_BYTES) {
    return { ok: false, status: 413, error: 'O envio passa de 15 MB. Envie menos arquivos por vez ou arquivos menores.' };
  }

  return { ok: true, files: parsed };
}

/** Caminho do arquivo no Storage, sem caracteres problemáticos no nome. */
export function catalogStoragePath(contactId, fileName) {
  const safeName = fileName.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `leads/${contactId}/catalogo/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;
}

export function newCatalogFileId() {
  return crypto.randomUUID();
}
