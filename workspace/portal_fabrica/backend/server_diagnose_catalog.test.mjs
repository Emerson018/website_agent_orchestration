import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createFakeSupabase } from './test_support/fake_supabase.mjs';

test('POST /api/leads/:id/diagnose puts the stored Catálogo Extraído into the Master Prompt', async () => {
  const fakeGemini = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"resumo_empresa":"Pizzaria de bairro."}' }] } }] }));
    });
  });
  await new Promise((r) => fakeGemini.listen(0, r));

  process.env.PORT = '5089';
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
  process.env.GEMINI_API_BASE_URL = `http://127.0.0.1:${fakeGemini.address().port}`;
  process.env.GEMINI_API_KEY = 'chave-teste';
  const { server, setSupabaseClientForTests } = await import('./server.js');
  const fake = createFakeSupabase({
    contacts: [
      {
        id: 'c-1',
        company: 'Pizzaria Bella',
        additional_data: {
          dossie: { nome_verificado: 'Pizzaria Bella', nota: 4.8 },
          catalogo_extraido: { markdown: '## Pizzas\n### Margherita\n- **Preço:** R$ 48,00' },
        },
      },
    ],
  });
  setSupabaseClientForTests(fake);
  await new Promise((r) => setTimeout(r, 300));

  try {
    const res = await fetch('http://localhost:5089/api/leads/c-1/diagnose', { method: 'POST' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.prompt_mestre.includes('### Margherita'));
    assert.ok(fake.tables.contacts[0].additional_data.prompt_mestre.includes('R$ 48,00'));
    assert.ok(Date.parse(fake.tables.contacts[0].additional_data.prompt_mestre_gerado_em), 'grava quando o prompt foi gerado');
  } finally {
    delete process.env.GEMINI_API_BASE_URL;
    delete process.env.GEMINI_API_KEY;
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => fakeGemini.close(resolve));
  }
});
