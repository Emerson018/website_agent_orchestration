import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeSupabase } from './test_support/fake_supabase.mjs';

test('Lead 5-fields intake registers Contact with website and tag, Deal, without Inbox conversation or queue', async () => {
  process.env.PORT = '5091';
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';

  const { server, setSupabaseClientForTests } = await import('./server.js');
  const fake = createFakeSupabase({ profiles: [{ email: 'admin@wacrm.com', user_id: 'u1', account_id: 'a1' }] });
  setSupabaseClientForTests(fake);
  await new Promise((r) => setTimeout(r, 400));

  const testCompany = 'Estética Renascer';
  const testWebsite = 'https://esteticarenascer.com.br';

  try {
    const postRes = await fetch('http://localhost:5091/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Maria Souza',
        company: testCompany,
        email: 'maria@esteticarenascer.com.br',
        phone: '(51) 91234-5678',
        website: testWebsite,
      }),
    });
    assert.equal(postRes.status, 201, 'Should return 201 Created');
    const { contact_id } = await postRes.json();

    const contact = fake.tables.contacts.find((c) => c.id === contact_id);
    assert.ok(contact, 'Contact was not created in CRM contacts table');
    assert.equal(contact.name, 'Maria Souza');
    assert.equal(contact.company, testCompany);
    assert.equal(contact.email, 'maria@esteticarenascer.com.br');
    assert.equal(contact.website, testWebsite);
    assert.ok(contact.additional_data.links.some((l) => l.url === testWebsite));

    const tag = fake.tables.tags.find((t) => t.name === 'Fábrica de Sites');
    assert.ok(tag, 'Tag "Fábrica de Sites" was not created');
    assert.ok(
      fake.tables.contact_tags.some((ct) => ct.contact_id === contact_id && ct.tag_id === tag.id),
      'Tag "Fábrica de Sites" was not associated to contact'
    );

    const deal = fake.tables.deals.find((d) => d.contact_id === contact_id);
    assert.ok(deal, 'Deal was not created in CRM deals table');
    assert.ok(deal.title.includes(testCompany), 'Deal title should contain company name');

    assert.equal(fake.tables.conversations, undefined, 'Conversations should NOT be created for web leads');
    assert.equal(fake.tables.messages, undefined, 'Messages should NOT be created for web leads');
    assert.equal(fake.tables.fila_projetos, undefined, 'Intake no longer writes to the project queue');
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});
