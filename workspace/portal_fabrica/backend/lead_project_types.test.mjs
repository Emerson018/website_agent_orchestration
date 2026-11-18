import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeSupabase } from './test_support/fake_supabase.mjs';
import { normalizeProjectTypes } from './project_types.js';

test('normalizeProjectTypes keeps known types as labels, in a fixed order, without duplicates', () => {
  assert.deepEqual(normalizeProjectTypes(['agenda', 'site']), ['Site', 'Agenda']);
  assert.deepEqual(normalizeProjectTypes(['dashboard', 'dashboard', 'hacker', 42, null]), ['Dashboard']);
  assert.deepEqual(normalizeProjectTypes(['dashboard', 'site', 'agenda']), ['Site', 'Agenda', 'Dashboard']);
  // App mobile está desligado por enquanto
  assert.deepEqual(normalizeProjectTypes(['app_mobile', 'site']), ['Site']);
  assert.deepEqual(normalizeProjectTypes(undefined), []);
  assert.deepEqual(normalizeProjectTypes('site'), []);
});

test('Lead intake stores the chosen project types on the CRM contact', async () => {
  process.env.PORT = '5093';
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';

  const { server, setSupabaseClientForTests } = await import('./server.js');
  const fake = createFakeSupabase({ profiles: [{ email: 'admin@wacrm.com', user_id: 'u1', account_id: 'a1' }] });
  setSupabaseClientForTests(fake);
  await new Promise((r) => setTimeout(r, 400));

  const post = (body) =>
    fetch('http://localhost:5093/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  try {
    const withTypes = await post({
      name: 'Ana Lima',
      email: 'ana@exemplo.com.br',
      phone: '(51) 98888-1111',
      project_types: ['dashboard', 'site', 'desconhecido'],
    });
    assert.equal(withTypes.status, 201);
    const { contact_id } = await withTypes.json();
    const contact = fake.tables.contacts.find((c) => c.id === contact_id);
    assert.deepEqual(contact.additional_data.tipos_projeto, ['Site', 'Dashboard']);

    const withoutTypes = await post({ name: 'Bruno Reis', email: 'bruno@exemplo.com.br', phone: '(51) 97777-2222' });
    assert.equal(withoutTypes.status, 201);
    const { contact_id: otherId } = await withoutTypes.json();
    const other = fake.tables.contacts.find((c) => c.id === otherId);
    assert.equal(other.additional_data.tipos_projeto, undefined);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});
