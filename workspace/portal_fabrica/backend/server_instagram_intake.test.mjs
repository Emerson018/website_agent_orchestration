import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeSupabase } from './test_support/fake_supabase.mjs';

test('A @handle on the form is saved as the Instagram, not as the site, and reaches the Master Prompt', async () => {
  process.env.PORT = '5104';
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
  const { server, setSupabaseClientForTests } = await import('./server.js');
  const fake = createFakeSupabase({ profiles: [{ email: 'admin@wacrm.com', user_id: 'u1', account_id: 'a1' }] });
  setSupabaseClientForTests(fake);
  await new Promise((r) => setTimeout(r, 300));
  const post = (path, body) =>
    fetch(`http://localhost:5104${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  try {
    const res = await post('/api/leads', { name: 'Ana', email: 'ana@exemplo.com', phone: '(51) 98888-1111', website: '@cafe.aurora' });
    assert.equal(res.status, 201);
    const { contact_id } = await res.json();
    const contact = fake.tables.contacts.find((c) => c.id === contact_id);
    assert.equal(contact.additional_data.instagram, 'https://www.instagram.com/cafe.aurora');
    assert.equal(contact.website, null, 'the handle is not the site');
    assert.equal(contact.additional_data.links, undefined, 'no "Site Oficial" link is created');

    contact.additional_data.diagnostico_ia = { resumo_empresa: 'Cafeteria.' };
    const rebuilt = await (await post(`/api/leads/${contact_id}/master-prompts`, { tipo: 'site' })).json();
    assert.ok(rebuilt.prompts_mestre.site.texto.includes('**Instagram:** https://www.instagram.com/cafe.aurora'));

    const site = await post('/api/leads', { name: 'Bia', email: 'bia@exemplo.com', phone: '(51) 97777-2222', website: 'https://cafebia.com.br' });
    const { contact_id: siteId } = await site.json();
    const withSite = fake.tables.contacts.find((c) => c.id === siteId);
    assert.equal(withSite.website, 'https://cafebia.com.br', 'a real site stays the site');
    assert.equal(withSite.additional_data.instagram, undefined);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});
