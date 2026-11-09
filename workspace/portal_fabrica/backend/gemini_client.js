import fetch from 'node-fetch';

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';

/** Modelos tentados em ordem; GEMINI_MODEL, quando definido, vem primeiro. */
export function defaultGeminiModels() {
  return [
    process.env.GEMINI_MODEL,
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
  ].filter(Boolean);
}

/** Chave do ambiente (GEMINI_API_KEY ou GOOGLE_API_KEY). */
export function defaultGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
}

export function cleanApiKey(apiKey) {
  return (apiKey || '').trim().replace(/^['"]|['"]$/g, '').trim();
}

/**
 * Baixa um arquivo (imagem ou PDF) e o converte em parte `inlineData` para o Gemini.
 * Retorna null quando o download falha.
 */
export async function fileUrlToInlinePart(fileUrl, { timeoutMs = 2500, fallbackMimeType = 'image/jpeg' } = {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(fileUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const mimeType = (res.headers.get('content-type') || fallbackMimeType).split(';')[0].trim();
    return { inlineData: { mimeType, data: buffer.toString('base64') } };
  } catch {
    return null;
  }
}

/**
 * Envia `parts` ao Gemini tentando cada modelo em ordem.
 * Modelos indisponíveis (503, 429, 404) ou que estouram o tempo passam para o próximo;
 * qualquer outro erro interrompe.
 *
 * @returns {{success: true, text: string, model: string} | {success: false, code: 'MISSING_API_KEY' | 'GEMINI_FAILED', error: string}}
 */
export async function generateGeminiContent({
  parts,
  apiKey = defaultGeminiApiKey(),
  models = defaultGeminiModels(),
  generationConfig = { temperature: 0.2 },
  baseUrl = process.env.GEMINI_API_BASE_URL || DEFAULT_BASE_URL,
  timeoutMs = 20000,
  retryDelayMs = 800,
}) {
  const key = cleanApiKey(apiKey);
  if (!key) {
    return { success: false, code: 'MISSING_API_KEY', error: 'Chave GEMINI_API_KEY não configurada no ambiente.' };
  }

  const candidateModels = Array.from(new Set(models.length > 0 ? models : defaultGeminiModels()));
  let lastError = 'A API do Google Gemini não pôde processar a requisição.';

  for (const model of candidateModels) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${baseUrl}/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const text = (data?.candidates?.[0]?.content?.parts || [])
          .map((p) => p?.text || '')
          .join('');
        return { success: true, text, model };
      }

      const errBody = await res.text().catch(() => '');
      lastError = `A API do Google Gemini retornou erro (${res.status}): ${errBody || res.statusText}`;
      if (res.status === 503 || res.status === 429 || res.status === 404) {
        if (retryDelayMs > 0) await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }
      break;
    } catch (err) {
      lastError = `Falha ao chamar a API do Google Gemini: ${err.message}`;
      if (err.name === 'AbortError' || err.message?.includes('aborted')) continue;
      break;
    }
  }

  return { success: false, code: 'GEMINI_FAILED', error: lastError };
}
