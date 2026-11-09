import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeSupabase } from './test_support/fake_supabase.mjs';

test('PUT /api/leads/:id/extracted-catalog saves the operator edit and marks it as manual', async () => {
  process.env.PORT = '5095';
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
  const { server, setSupabaseClientForTests } = await import('./server.js');
  const fake = createFakeSupabase({
    contacts: [
      {
        id: 'c-1',
        company: 'Pizzaria Bella',
        additional_data: {
          catalogo_arquivos: [{ id: 'f1', name: 'a.png' }],
          catalogo_extraido: { markdown: '## Pizzas', modelo_utilizado: 'm', editado_manualmente: false },
          diagnostico_ia: { resumo_empresa: 'Pizzaria de bairro.' },
          prompt_mestre: 'antigo',
        },
      },
    ],
  });
  setSupabaseClientForTests(fake);
  await new Promise((r) => setTimeout(r, 300));
  const put = (id, body) =>
    fetch(`http://localhost:5095/api/leads/${id}/extracted-catalog`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  try {
    const res = await put('c-1', { markdown: '## Pizzas\n### Margherita\n- **Preço:** R$ 50,00' });
    assert.equal(res.status, 200);
    const { catalogo_extraido, prompt_mestre, prompt_mestre_gerado_em } = await res.json();
    assert.ok(prompt_mestre.includes('### Margherita'));
    assert.equal(catalogo_extraido.markdown, '## Pizzas\n### Margherita\n- **Preço:** R$ 50,00');
    assert.equal(catalogo_extraido.editado_manualmente, true);
    assert.ok(catalogo_extraido.editado_em);
    assert.equal(catalogo_extraido.modelo_utilizado, 'm', 'metadados da extração são mantidos');

    const saved = fake.tables.contacts[0].additional_data;
    assert.ok(saved.prompt_mestre.includes('R$ 50,00'), 'o Prompt Mestre é refeito com a edição');
    assert.ok(Date.parse(saved.prompt_mestre_gerado_em), 'grava quando o prompt foi refeito');
    assert.equal(prompt_mestre_gerado_em, saved.prompt_mestre_gerado_em, 'devolve a data que gravou');
    assert.equal(saved.catalogo_extraido.editado_manualmente, true);
    assert.equal(saved.catalogo_arquivos.length, 1, 'os arquivos continuam guardados');

    assert.equal((await put('c-1', { markdown: '   ' })).status, 400);
    assert.equal((await put('c-404', { markdown: '## X' })).status, 404);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});
