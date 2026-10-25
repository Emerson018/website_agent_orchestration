import test from 'node:test';
import assert from 'node:assert/strict';

test('Server backend operates with local resilient queue when Supabase is offline/placeholder', async (t) => {
  process.env.PORT = '5003';
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-key';

  const { server } = await import('./server.js');

  await new Promise(r => setTimeout(r, 200));

  // 1. Test GET /api/health
  const healthRes = await fetch('http://localhost:5003/api/health');
  assert.equal(healthRes.status, 200);
  const healthData = await healthRes.json();
  assert.equal(healthData.status, 'ok');
  assert.equal(healthData.database, 'local_file_queue');

  // 2. Test POST /api/projetos with placeholder Supabase
  const postRes = await fetch('http://localhost:5003/api/projetos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_name: 'Barbearia Teste Resiliente',
      client_info: { email: 'teste@barbearia.com', phone: '11999999999' },
      modules: ['agendador_pwa', 'site'],
      auto_process: false,
    })
  });

  assert.equal(postRes.status, 201);
  const created = await postRes.json();
  assert.ok(created.id);
  assert.equal(created.status, 'pendente');
  assert.equal(created.is_local, true);

  // 3. Test GET /api/projetos
  const listRes = await fetch('http://localhost:5003/api/projetos');
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.ok(Array.isArray(listData));
  const found = listData.find(p => String(p.id) === String(created.id));
  assert.ok(found);
  assert.equal(found.resultado_json.project_name, 'Barbearia Teste Resiliente');

  await new Promise((resolve) => server.close(resolve));
});
