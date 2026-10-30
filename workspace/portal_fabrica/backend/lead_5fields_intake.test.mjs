import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Lead 5-fields intake registers Contact with website and tag, Deal, Queue, without Inbox conversation/messages', async () => {
  process.env.PORT = '5091';

  const { server } = await import('./server.js');
  await new Promise((r) => setTimeout(r, 400));

  const testEmail = `lead_5f_${Date.now()}@test.com`;
  const randDigits = Math.floor(10000000 + Math.random() * 90000000);
  const testPhone = `(51) 9${randDigits}`;
  const testContactName = 'Maria Souza';
  const testCompany = `Estética Renascer ${Date.now()}`;
  const testWebsite = 'https://esteticarenascer.com.br';

  const payload = {
    name: testContactName,
    company: testCompany,
    email: testEmail,
    phone: testPhone,
    website: testWebsite,
  };

  const postRes = await fetch('http://localhost:5091/api/projetos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert.equal(postRes.status, 201, 'Should return 201 Created');
  const responseData = await postRes.json();

  try {
    dotenv.config({ path: path.resolve(__dirname, '../../wacrm/.env.local') });
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
    const targetUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const targetKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const sbClient = createClient(targetUrl, targetKey);

    // 1. Verify Contact has name, company, email, phone, and website (direct or mirrored in additional_data.links)
    const { data: contact } = await sbClient
      .from('contacts')
      .select('id, name, company, email, phone, additional_data')
      .eq('email', testEmail)
      .maybeSingle();

    assert.ok(contact, 'Contact was not created in CRM contacts table');
    assert.equal(contact.name, testContactName, 'Contact name does not match');
    assert.equal(contact.company, testCompany, 'Contact company does not match');

    const effectiveWebsite =
      contact.website ||
      contact.additional_data?.links?.find((l) => l.url === testWebsite)?.url;
    assert.equal(effectiveWebsite, testWebsite, 'Contact website was not saved in contact or additional_data.links');

    // 2. Verify Tag 'Fábrica de Sites' is attached
    const { data: contactTags } = await sbClient
      .from('contact_tags')
      .select('tag_id, tags(name)')
      .eq('contact_id', contact.id);

    const hasFabricaTag = contactTags?.some((ct) => ct.tags?.name === 'Fábrica de Sites');
    assert.ok(hasFabricaTag, 'Tag "Fábrica de Sites" was not associated to contact');

    // 3. Verify Deal has title with company name
    const { data: deal } = await sbClient
      .from('deals')
      .select('id, title')
      .eq('contact_id', contact.id)
      .maybeSingle();

    assert.ok(deal, 'Deal was not created in CRM deals table');
    assert.ok(deal.title.includes(testCompany), 'Deal title should contain company name');

    // 4. Verify Fila de Projetos item is 'pendente'
    const { data: queueItem } = await sbClient
      .from('fila_projetos')
      .select('id, status, mensagem_lead, resultado_json')
      .eq('id', responseData.id)
      .maybeSingle();

    assert.ok(queueItem, 'Project was not recorded in Supabase fila_projetos');
    assert.equal(queueItem.status, 'pendente', 'Initial status should be pendente');
    assert.equal(queueItem.resultado_json.company, testCompany);

    // 5. CRITICAL: Verify NO conversation or messages exist for this contact
    const { data: conversations } = await sbClient
      .from('conversations')
      .select('id')
      .eq('contact_id', contact.id);

    assert.equal(
      conversations?.length || 0,
      0,
      'Conversations should NOT be created in the Inbox for web leads'
    );

    // Cleanup
    if (deal) await sbClient.from('deals').delete().eq('id', deal.id);
    if (queueItem) await sbClient.from('fila_projetos').delete().eq('id', queueItem.id);
    if (contactTags) {
      await sbClient.from('contact_tags').delete().eq('contact_id', contact.id);
    }
    if (contact) await sbClient.from('contacts').delete().eq('id', contact.id);
  } finally {
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    await new Promise((resolve) => server.close(resolve));
  }
});
