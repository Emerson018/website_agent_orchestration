import test from 'node:test';
import assert from 'node:assert/strict';

test('Server Enrich API - POST /api/leads/:id/enrich-dossier supports contact ID lookup and graceful validation', async () => {
  process.env.PORT = '5097';
  const { server } = await import('./server.js');
  await new Promise((r) => setTimeout(r, 400));
  const baseUrl = 'http://localhost:5097';

  try {
    // 1. Non-existent ID -> 404
    const notFoundRes = await fetch(`${baseUrl}/api/leads/non-existent-uuid-999/enrich-dossier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(notFoundRes.status, 404);
    const notFoundData = await notFoundRes.json();
    assert.ok(notFoundData.error.includes('não encontrado'));

    // 2. Query provided directly in body for an unqueued lead/contact with no API key
    // Save original key and temporarily delete
    const origKey = process.env.GOOGLE_MAPS_API_KEY;
    const origGKey = process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    try {
      // With local project seeded
      const localDataPath = './data/local_projetos.json';
      const noKeyRes = await fetch(`${baseUrl}/api/leads/77701/enrich-dossier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'Padaria Central' }),
      });
      assert.equal(noKeyRes.status, 412);
      const noKeyData = await noKeyRes.json();
      assert.equal(noKeyData.code, 'MISSING_API_KEY');
    } finally {
      if (origKey) process.env.GOOGLE_MAPS_API_KEY = origKey;
      if (origGKey) process.env.GOOGLE_API_KEY = origGKey;
    }
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
});
