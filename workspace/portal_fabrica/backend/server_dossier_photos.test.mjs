import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeSupabase } from './test_support/fake_supabase.mjs';

test('GET /api/leads/:id/photos.zip explains when there is nothing to download', async () => {
  process.env.PORT = '5105';
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
  const { server, setSupabaseClientForTests } = await import('./server.js');
  const fake = createFakeSupabase({
    contacts: [
      { id: 'sem-fotos', company: 'Sem Fotos', additional_data: { dossie: { fotos: [] } } },
      { id: 'links-invalidos', company: 'Links', additional_data: { dossie: { fotos: [{ photo_url: 'https://evil.example/a.jpg' }] } } },
    ],
  });
  setSupabaseClientForTests(fake);
  await new Promise((r) => setTimeout(r, 300));
  const get = (id) => fetch(`http://localhost:5105/api/leads/${id}/photos.zip`);

  try {
    assert.equal((await get('c-404')).status, 404);

    // Foto individual: só pela posição, nunca por um link enviado pelo navegador
    const photo = (id, index) => fetch(`http://localhost:5105/api/leads/${id}/photos/${index}`);
    assert.equal((await photo('links-invalidos', 9)).status, 404);
    assert.equal((await photo('links-invalidos', 'abc')).status, 404);
    assert.equal((await photo('c-404', 0)).status, 404);
    assert.equal((await photo('links-invalidos', 0)).status, 502, 'a link outside Google is never fetched');

    const empty = await get('sem-fotos');
    assert.equal(empty.status, 404);
    assert.match((await empty.json()).error, /não tem fotos/);

    const failed = await get('links-invalidos');
    assert.equal(failed.status, 502);
    assert.match((await failed.json()).error, /Não foi possível baixar/);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});
