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
 * O limite de tempo vale até o arquivo terminar de chegar, não só os cabeçalhos.
 * Retorna null quando o download falha.
 */
export async function fileUrlToInlinePart(fileUrl, { timeoutMs = 2500, fallbackMimeType = 'image/jpeg' } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(fileUrl, { signal: controller.signal });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const mimeType = (res.headers.get('content-type') || fallbackMimeType).split(';')[0].trim();
    return { inlineData: { mimeType, data: buffer.toString('base64') } };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Mensagens para o operador quando o problema é da conta do Google, não do pedido
const BILLING_ERROR =
  'Os créditos da API do Google Gemini acabaram. Recarregue o projeto em https://ai.studio/projects ou troque a GEMINI_API_KEY por uma chave com saldo.';
const QUOTA_ERROR =
  'A cota da API do Google Gemini foi atingida em todos os modelos. Tente de novo em alguns minutos ou aumente a cota no Google AI Studio.';

/** Status HTTP para cada código de falha do Gemini (o resto vira `fallback`). */
const GEMINI_ERROR_STATUS = {
  MISSING_API_KEY: 412,
  GEMINI_BILLING: 402,
  GEMINI_QUOTA: 429,
  GEMINI_BLOCKED: 422,
  GEMINI_TIMEOUT: 504,
};

export function geminiErrorStatus(code, fallback = 502) {
  return GEMINI_ERROR_STATUS[code] || fallback;
}

/** Tira a chave de qualquer texto que vá para logs ou para o navegador. */
function redactKey(text, key) {
  return key ? String(text).split(key).join('[chave oculta]') : String(text);
}

/** Lê o corpo de erro do Google ({ error: { status, message } }) sem quebrar se não for JSON. */
function parseGoogleError(bodyText) {
  try {
    const { error } = JSON.parse(bodyText);
    return { status: error?.status || '', message: error?.message || '' };
  } catch {
    return { status: '', message: '' };
  }
}

// 429/RESOURCE_EXHAUSTED que fala de cobrança ou créditos é da conta inteira: outro modelo não ajuda
const BILLING_HINT = /billing|prepay|credit|payment/i;

/**
 * Envia `parts` ao Gemini tentando cada modelo em ordem.
 * - Modelo indisponível (503, 404), sem cota própria (429) ou lento passa para o próximo.
 * - Falta de créditos (402, ou 429 que fala de cobrança) para na hora: vale para todos os modelos.
 * - `timeoutMs` é o limite de cada tentativa; `totalTimeoutMs` é o limite somado de todas.
 * - Resposta bloqueada ou vazia (segurança, recitação) é falha, com o motivo.
 *
 * @returns {{success: true, text: string, model: string} | {success: false, code: 'MISSING_API_KEY' | 'GEMINI_BILLING' | 'GEMINI_QUOTA' | 'GEMINI_BLOCKED' | 'GEMINI_TIMEOUT' | 'GEMINI_FAILED', error: string}}
 */
export async function generateGeminiContent({
  parts,
  apiKey = defaultGeminiApiKey(),
  models = defaultGeminiModels(),
  generationConfig = { temperature: 0.2 },
  baseUrl = process.env.GEMINI_API_BASE_URL || DEFAULT_BASE_URL,
  timeoutMs = 20000,
  totalTimeoutMs = timeoutMs * 1.5,
  retryDelayMs = 800,
}) {
  const key = cleanApiKey(apiKey);
  if (!key) {
    return { success: false, code: 'MISSING_API_KEY', error: 'Chave GEMINI_API_KEY não configurada no ambiente.' };
  }

  const candidateModels = Array.from(new Set(models.length > 0 ? models : defaultGeminiModels()));
  const deadline = Date.now() + totalTimeoutMs;
  let failure = { code: 'GEMINI_FAILED', error: 'A API do Google Gemini não pôde processar a requisição.' };
  let allQuota = true;

  for (const model of candidateModels) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      failure = { code: 'GEMINI_TIMEOUT', error: 'A API do Google Gemini demorou demais para responder. Tente de novo.' };
      allQuota = false;
      break;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(timeoutMs, remaining));
    try {
      // A chave vai no cabeçalho, nunca na URL: assim não aparece em mensagens de erro nem em logs
      const res = await fetch(`${baseUrl}/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig }),
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json();
        const candidate = data?.candidates?.[0];
        const text = (candidate?.content?.parts || []).map((p) => p?.text || '').join('');
        if (!text) {
          const reason = data?.promptFeedback?.blockReason || candidate?.finishReason || 'resposta vazia';
          return {
            success: false,
            code: 'GEMINI_BLOCKED',
            error: `O Gemini não devolveu conteúdo (motivo: ${reason}). Revise os arquivos enviados e tente de novo.`,
          };
        }
        return { success: true, text, model };
      }

      const errBody = await res.text().catch(() => '');
      const googleError = parseGoogleError(errBody);

      if (res.status === 402 || (res.status === 429 && BILLING_HINT.test(googleError.message))) {
        return { success: false, code: 'GEMINI_BILLING', error: BILLING_ERROR };
      }

      failure = {
        code: 'GEMINI_FAILED',
        error: redactKey(
          `A API do Google Gemini retornou erro (${res.status}): ${googleError.message || errBody || res.statusText}`,
          key
        ),
      };
      if (res.status !== 429) allQuota = false;
      if (res.status === 503 || res.status === 429 || res.status === 404) {
        if (retryDelayMs > 0) await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }
      break;
    } catch (err) {
      allQuota = false;
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        failure = { code: 'GEMINI_TIMEOUT', error: 'A API do Google Gemini demorou demais para responder. Tente de novo.' };
        continue;
      }
      failure = { code: 'GEMINI_FAILED', error: redactKey(`Falha ao chamar a API do Google Gemini: ${err.message}`, key) };
      break;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (allQuota && failure.code === 'GEMINI_FAILED') {
    return { success: false, code: 'GEMINI_QUOTA', error: QUOTA_ERROR };
  }
  return { success: false, ...failure };
}
