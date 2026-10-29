const DEFAULT_FALLBACK_BASES = [
  'http://localhost:5000/api',
  'http://127.0.0.1:5000/api'
];

const DEFAULT_RETRY_DELAYS_MS = [400, 900, 1600];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isTransientProxyOrGatewayError(res) {
  if ([502, 503, 504].includes(res.status)) {
    return true;
  }
  if (res.status === 500) {
    try {
      const cloned = res.clone();
      const text = await cloned.text();
      if (
        text.includes('ECONNRESET') ||
        text.includes('ECONNREFUSED') ||
        text.includes('socket hang up') ||
        text.includes('http proxy error')
      ) {
        return true;
      }
    } catch {
      // Ignore clone/read errors
    }
  }
  return false;
}

export async function apiFetch(endpoint, options = {}, config = {}) {
  const primaryBase = config.primaryBase ?? '/api';
  const fallbackBases = config.fallbackBases ?? DEFAULT_FALLBACK_BASES;
  const retryDelaysMs = config.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;

  const candidateBases = [primaryBase, ...fallbackBases];
  const totalRounds = retryDelaysMs.length + 1;
  let lastError = null;
  let lastResponse = null;

  for (let round = 0; round < totalRounds; round++) {
    for (const base of candidateBases) {
      try {
        const res = await fetch(`${base}${endpoint}`, { ...options });
        if (res.ok) {
          return res;
        }
        lastResponse = res;
        const transient = await isTransientProxyOrGatewayError(res);
        if (!transient) {
          // Genuine application error (e.g. 400 validation or 500 database JSON error)
          return res;
        }
        console.warn(
          `[apiFetch] Falha transitória (${res.status}) em ${base}${endpoint} (tentativa ${round + 1}/${totalRounds}).`
        );
      } catch (err) {
        lastError = err;
        console.warn(
          `[apiFetch] Erro de conexão em ${base}${endpoint} (tentativa ${round + 1}/${totalRounds}): ${err.message}`
        );
      }
    }

    if (round < retryDelaysMs.length) {
      await sleep(retryDelaysMs[round]);
    }
  }

  if (lastResponse) {
    return lastResponse;
  }
  throw lastError || new Error(`Não foi possível conectar ao servidor para ${endpoint}.`);
}

export function formatBrazilianPhone(rawValue = '') {
  const digits = String(rawValue).replace(/\D/g, '').slice(0, 11);

  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function isValidBrazilianPhone(value = '') {
  const digits = String(value).replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11;
}
