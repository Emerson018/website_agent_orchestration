import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeSupabase } from './test_support/fake_supabase.mjs';

test('Desqualificação: disqualify and reopen a lead', async () => {
  process.env.PORT = '5087';
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
  const { server, setSupabaseClientForTests } = await import('./server.js');
  const fake = createFakeSupabase({
    contacts: [
      { id: 'c-1', company: 'Estética Renascer', additional_data: { dossie: { nota: 4.6 } } },
      { id: 'c-2', company: 'Sem Deal', additional_data: {} },
    ],
    deals: [
      { id: 'd-open', contact_id: 'c-1', status: 'open' },
      { id: 'd-won', contact_id: 'c-1', status: 'won' },
      { id: 'd-old-lost', contact_id: 'c-1', status: 'lost' },
    ],
  });
  setSupabaseClientForTests(fake);
  await new Promise((r) => setTimeout(r, 300));
  const base = 'http://localhost:5087/api/leads';
  const post = (path, body) =>
    fetch(`${base}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const contact = (id) => fake.tables.contacts.find((c) => c.id === id);
  const deal = (id) => fake.tables.deals.find((d) => d.id === id);

  try {
    // Motivo fora da lista
    assert.equal((await post('c-1/disqualify', { motivo: 'Porque sim' })).status, 400);
    assert.equal(contact('c-1').additional_data.desqualificacao, undefined);

    // Desqualificar: só os Deals abertos viram perdidos, e o registro guarda quais foram
    const res = await post('c-1/disqualify', { motivo: 'Já tem site', detalhe: 'Site novo de outra agência.' });
    assert.equal(res.status, 200);
    const { desqualificacao } = await res.json();
    assert.equal(desqualificacao.motivo, 'Já tem site');
    assert.equal(desqualificacao.detalhe, 'Site novo de outra agência.');
    assert.ok(Date.parse(desqualificacao.em));
    assert.deepEqual(desqualificacao.deals_fechados, ['d-open']);
    assert.equal(deal('d-open').status, 'lost');
    assert.equal(deal('d-won').status, 'won');
    assert.deepEqual(contact('c-1').additional_data.desqualificacao, desqualificacao);
    assert.equal(contact('c-1').additional_data.dossie.nota, 4.6, 'o resto de additional_data é preservado');

    // Reabrir: só os Deals fechados pela desqualificação voltam a abrir
    const reopen = await post('c-1/reopen');
    assert.equal(reopen.status, 200);
    assert.equal(deal('d-open').status, 'open');
    assert.equal(deal('d-old-lost').status, 'lost');
    assert.equal(contact('c-1').additional_data.desqualificacao, undefined);

    // Reabrir um lead que não está desqualificado
    assert.equal((await post('c-1/reopen')).status, 409);

    // Lead sem Deal: só o registro
    const noDeal = await post('c-2/disqualify', { motivo: 'Outro' });
    assert.equal(noDeal.status, 200);
    assert.deepEqual((await noDeal.json()).desqualificacao.deals_fechados, []);

    // Lead inexistente
    assert.equal((await post('c-404/disqualify', { motivo: 'Outro' })).status, 404);
    assert.equal((await post('c-404/reopen')).status, 404);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});
