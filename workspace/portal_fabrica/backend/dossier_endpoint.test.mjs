import test from 'node:test';
import assert from 'node:assert/strict';

test('dossier endpoints - POST /api/dossie/consultar gracefully validates input and API key', async () => {
  process.env.PORT = '5092';
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
  const { server } = await import('./server.js');
  await new Promise((r) => setTimeout(r, 400));

  // 1. Without target
  const badRes = await fetch('http://localhost:5092/api/dossie/consultar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(badRes.status, 400);

  // 2. With target
  const res = await fetch('http://localhost:5092/api/dossie/consultar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'Barbearia Modelo' }),
  });

  const data = await res.json();
  if (res.status === 412) {
    assert.equal(data.success, false);
    assert.equal(data.code, 'MISSING_API_KEY');
    assert.ok(data.error.includes('GOOGLE_MAPS_API_KEY'));
  } else {
    // If API key is present in environment, it succeeds
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.dossie);
  }

  server.close();
});
