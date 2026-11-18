import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeSupabase } from './test_support/fake_supabase.mjs';

test('POST /api/leads/:id/master-prompts rebuilds one Tipo de Projeto from saved data, without Gemini', async () => {
  process.env.PORT = '5101';
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
  const { server, setSupabaseClientForTests } = await import('./server.js');
  const OLD_SITE = { texto: 'site antigo', gerado_em: '2026-01-01T00:00:00.000Z' };
  const fake = createFakeSupabase({
    contacts: [
      {
        id: 'c-1',
        company: 'Pizzaria Bella',
        additional_data: {
          diagnostico_ia: { resumo_empresa: 'Pizzaria de bairro.' },
          dossie: { telefone: '(51) 99999-0000' },
          prompts_mestre: { site: OLD_SITE },
        },
      },
      { id: 'c-sem-diagnostico', company: 'Sem Diagnóstico', additional_data: {} },
    ],
  });
  setSupabaseClientForTests(fake);
  await new Promise((r) => setTimeout(r, 300));
  const post = (id, body) =>
    fetch(`http://localhost:5101/api/leads/${id}/master-prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  try {
    const res = await post('c-1', { tipo: 'agenda' });
    assert.equal(res.status, 200);
    const { prompts_mestre } = await res.json();
    assert.ok(prompts_mestre.agenda.texto.includes('## O que construir: Agenda'));
    assert.ok(prompts_mestre.agenda.texto.includes('Pizzaria de bairro.'));
    assert.ok(Date.parse(prompts_mestre.agenda.gerado_em));
    assert.deepEqual(prompts_mestre.site, OLD_SITE, 'only the requested tab is rebuilt');
    assert.deepEqual(fake.tables.contacts[0].additional_data.prompts_mestre, prompts_mestre, 'saves what it returns');

    // Design do Cliente salvo no contato entra no prompt refeito
    fake.tables.contacts[0].additional_data.design_do_cliente = { markdown: '## Cores\n- primária: #1B4D3E', salvo_em: '2026-03-01T00:00:00.000Z' };
    const withDesign = await (await post('c-1', { tipo: 'site' })).json();
    assert.ok(withDesign.prompts_mestre.site.texto.includes('- primária: #1B4D3E'));
    assert.match(withDesign.prompts_mestre.site.texto, /siga este design à risca/i);

    assert.equal((await post('c-1', { tipo: 'app_mobile' })).status, 400, 'unknown type');
    assert.equal((await post('c-sem-diagnostico', { tipo: 'site' })).status, 409, 'needs the diagnosis first');
    assert.equal((await post('c-404', { tipo: 'site' })).status, 404);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});
