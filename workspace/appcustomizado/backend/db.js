import { createClient } from '@supabase/supabase-js';

let dbClient = null;

/**
 * Initializes and manages single-tenant or shared database client connection.
 *
 * @param {Object} [config] - Database configuration credentials
 * @param {string} [config.supabaseUrl]
 * @param {string} [config.supabaseKey]
 */
export function getDbClient(config = {}) {
  if (dbClient) return dbClient;

  const url = config.supabaseUrl || process.env.SUPABASE_URL || '';
  const key = config.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!url || !key || url.includes('placeholder')) {
    console.warn('[DB] Supabase não configurado ou offline. Operando em modo desacoplado.');
    return null;
  }

  try {
    dbClient = createClient(url, key, {
      auth: { persistSession: false },
    });
    console.log('[DB] Cliente Supabase conectado com sucesso a:', url);
    return dbClient;
  } catch (err) {
    console.error('[DB] Erro ao instanciar cliente do banco:', err.message);
    return null;
  }
}

/**
 * Checks connection health to database.
 */
export async function checkDbHealth() {
  const client = getDbClient();
  if (!client) {
    return { status: 'disconnected', details: 'Credenciais de banco ausentes.' };
  }
  try {
    // Health check via root rest endpoint
    const url = process.env.SUPABASE_URL;
    if (url) {
      const pingRes = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '' },
      });
      return { status: pingRes.ok ? 'connected' : 'degraded', latencyMs: 0 };
    }
    return { status: 'connected', latencyMs: 0 };
  } catch (err) {
    return { status: 'degraded', error: err.message };
  }
}
