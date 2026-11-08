import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeSupabase } from './test_support/fake_supabase.mjs';

test('Server Enrich API - POST /api/leads/:id/enrich-dossier looks up contacts and validates gracefully', async () => {
  process.env.PORT = '5097';
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
  const { server, setSupabaseClientForTests } = await import('./server.js');
  setSupabaseClientForTests(
    createFakeSupabase({ contacts: [{ id: 'c-77701', name: 'Ana', company: 'Padaria Central', additional_data: {} }] })
  );
  await new Promise((r) => setTimeout(r, 400));
  const baseUrl = 'http://localhost:5097';

  try {
    const notFoundRes = await fetch(`${baseUrl}/api/leads/non-existent-uuid-999/enrich-dossier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(notFoundRes.status, 404);
    assert.ok((await notFoundRes.json()).error.includes('não encontrado'));

    const origKey = process.env.GOOGLE_MAPS_API_KEY;
    const origGKey = process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    try {
      const noKeyRes = await fetch(`${baseUrl}/api/leads/c-77701/enrich-dossier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'Padaria Central' }),
      });
      assert.equal(noKeyRes.status, 412);
      assert.equal((await noKeyRes.json()).code, 'MISSING_API_KEY');
    } finally {
      if (origKey) process.env.GOOGLE_MAPS_API_KEY = origKey;
      if (origGKey) process.env.GOOGLE_API_KEY = origGKey;
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
