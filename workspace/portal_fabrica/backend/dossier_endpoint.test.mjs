import test from 'node:test';
import assert from 'node:assert/strict';

test('dossier endpoints - POST /api/dossie/consultar gracefully validates input and API key', async () => {
  process.env.PORT = '5092';
  const { server } = await import('./server.js');
  await new Promise((r) => setTimeout(r, 400));

  // 1. Without target
  const badRes = await fetch('http://localhost:5092/api/dossie/consultar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(badRes.status, 400);

  // 2. With target but no API key configured
  const res = await fetch('http://localhost:5092/api/dossie/consultar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'Barbearia Modelo' }),
  });

  // Since GOOGLE_MAPS_API_KEY is not configured yet, it should return 412 (Precondition Failed) with clean error
  const data = await res.json();
  assert.equal(res.status, 412);
  assert.equal(data.success, false);
  assert.equal(data.code, 'MISSING_API_KEY');
  assert.ok(data.error.includes('GOOGLE_MAPS_API_KEY'));

  server.close();
});
