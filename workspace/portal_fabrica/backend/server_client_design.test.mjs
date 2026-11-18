import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeSupabase } from './test_support/fake_supabase.mjs';

test('PUT /api/leads/:id/client-design saves, replaces and clears the Design do Cliente without touching other data', async () => {
  process.env.PORT = '5103';
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
  const { server, setSupabaseClientForTests } = await import('./server.js');
  const fake = createFakeSupabase({
    contacts: [
      {
        id: 'c-1',
        company: 'Pizzaria Bella',
        additional_data: { catalogo_extraido: { markdown: '## Pizzas' }, tipos_projeto: ['Site'] },
      },
    ],
  });
  setSupabaseClientForTests(fake);
  await new Promise((r) => setTimeout(r, 300));
  const put = (id, body) =>
    fetch(`http://localhost:5103/api/leads/${id}/client-design`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const saved = () => fake.tables.contacts[0].additional_data;

  try {
    const res = await put('c-1', { markdown: '  # DESIGN\n- primária: #1B4D3E  ' });
    assert.equal(res.status, 200);
    const { design_do_cliente } = await res.json();
    assert.equal(design_do_cliente.markdown, '# DESIGN\n- primária: #1B4D3E');
    assert.ok(Date.parse(design_do_cliente.salvo_em));
    assert.deepEqual(saved().design_do_cliente, design_do_cliente, 'saves what it returns');
    assert.deepEqual(saved().catalogo_extraido, { markdown: '## Pizzas' }, 'other data is kept');
    assert.deepEqual(saved().tipos_projeto, ['Site']);

    // Limpar: texto vazio guarda a data, para os prompts ficarem Desatualizados
    const cleared = await (await put('c-1', { markdown: '' })).json();
    assert.equal(cleared.design_do_cliente.markdown, '');
    assert.ok(Date.parse(saved().design_do_cliente.salvo_em));

    assert.equal((await put('c-1', { markdown: 42 })).status, 400);
    assert.equal((await put('c-404', { markdown: '# X' })).status, 404);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});
