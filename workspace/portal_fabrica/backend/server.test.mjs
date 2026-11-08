import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeSupabase } from './test_support/fake_supabase.mjs';

test('Lead intake: offline guard, validation and CRM-only persistence', async () => {
  process.env.PORT = '5003';
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-key';

  const { server, setSupabaseClientForTests } = await import('./server.js');
  await new Promise((r) => setTimeout(r, 200));
  const baseUrl = 'http://localhost:5003';
  const post = (body) =>
    fetch(`${baseUrl}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  try {
    const health = await (await fetch(`${baseUrl}/api/health`)).json();
    assert.equal(health.status, 'ok');
    assert.equal(health.database, 'not_configured');

    // Sem Supabase não há onde registrar o lead
    const offline = await post({ name: 'Carlos', company: 'Barbearia Teste', phone: '11999999999' });
    assert.equal(offline.status, 503);

    const fake = createFakeSupabase({ profiles: [{ email: 'admin@wacrm.com', user_id: 'u1', account_id: 'a1' }] });
    setSupabaseClientForTests(fake);

    const missingName = await post({ phone: '11999999999' });
    assert.equal(missingName.status, 400);

    const created = await post({
      name: 'Carlos',
      company: 'Barbearia Teste',
      email: 'carlos@barbearia.com',
      phone: '(11) 99999-9999',
      website: 'https://barbeariateste.com.br',
    });
    assert.equal(created.status, 201);
    const body = await created.json();
    assert.equal(body.success, true);
    assert.ok(body.contact_id);

    const contact = fake.tables.contacts.find((c) => c.id === body.contact_id);
    assert.equal(contact.company, 'Barbearia Teste');
    assert.equal(contact.website, 'https://barbeariateste.com.br');
    assert.equal(fake.tables.deals.length, 1);
    assert.equal(fake.tables.deals[0].contact_id, body.contact_id);
    assert.equal(fake.tables.fila_projetos, undefined, 'A captação não usa mais a fila de projetos');

    const legacy = await fetch(`${baseUrl}/api/projetos`, { method: 'POST' });
    assert.equal(legacy.status, 404, 'A rota antiga /api/projetos foi removida');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
