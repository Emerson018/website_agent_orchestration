import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeSupabase } from './test_support/fake_supabase.mjs';

test('Intake de Lead sem campo Empresa (obtido posteriormente via Maps)', async () => {
  const testPort = '5098';
  process.env.PORT = testPort;
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
  const { server, setSupabaseClientForTests } = await import('./server.js');
  const fake = createFakeSupabase();
  setSupabaseClientForTests(fake);
  await new Promise((r) => setTimeout(r, 400));
  const baseUrl = `http://localhost:${testPort}`;

  try {
    const res = await fetch(`${baseUrl}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Roberto Alencar',
        email: 'roberto@exemplo.com',
        phone: '(11) 98888-1234',
        website: 'https://barbeariamodelo.com.br',
      }),
    });

    assert.equal(res.status, 201, 'Deve aceitar submissão mesmo sem o campo empresa');
    const data = await res.json();
    assert.ok(data.contact_id, 'Deve retornar o ID do contato registrado');
    assert.equal(fake.tables.contacts[0].name, 'Roberto Alencar');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
