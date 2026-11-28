import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeSupabase } from './test_support/fake_supabase.mjs';

test('Lead intake stores the quote computed on the server and ignores prices sent by the browser', async () => {
  process.env.PORT = '5106';
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';

  const { server, setSupabaseClientForTests } = await import('./server.js');
  const fake = createFakeSupabase({ profiles: [{ email: 'admin@wacrm.com', user_id: 'u1', account_id: 'a1' }] });
  setSupabaseClientForTests(fake);
  await new Promise((r) => setTimeout(r, 400));

  const post = async (body) => {
    const res = await fetch('http://localhost:5106/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'lead@exemplo.com.br', ...body }),
    });
    assert.equal(res.status, 201);
    const { contact_id } = await res.json();
    return fake.tables.contacts.find((c) => c.id === contact_id).additional_data;
  };

  try {
    const forged = await post({
      name: 'Ana Lima',
      phone: '(51) 98888-1111',
      project_types: ['site', 'agenda'],
      summary: { total_setup_price: 1 },
      additional_data: { orcamento: { valor: 1, moeda: 'BRL' } },
    });
    // Valores da ADR 0013: Site + Agenda, Agenda com 1 profissional
    assert.deepEqual(forged.orcamento, {
      valor: 2990,
      moeda: 'BRL',
      tipos: ['site', 'agenda'],
      profissionais: 1,
      mensalidade: 148,
      mensalidade_por_dia_menos_de: 5,
      economia: 490,
      prazo_dias_uteis: 15,
      entregas: { site: 6, agenda: 15 },
      mensalidade_a_partir_de: true,
      parcelas: 10,
      parcela_10x: 299,
      pix: 2840.5,
    });

    const noTypes = await post({
      name: 'Bruno Reis',
      phone: '(51) 97777-2222',
      summary: { total_setup_price: 5000 },
      additional_data: { orcamento: { valor: 5000, moeda: 'BRL' } },
    });
    assert.equal(noTypes.orcamento, undefined);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});
