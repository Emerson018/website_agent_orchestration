import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Lead submission saves into Supabase CRM (contacts, deals, fila_projetos)', async (t) => {
  // Use port 5088 to avoid port conflicts
  process.env.PORT = '5088';

  const { server } = await import('./server.js');
  await new Promise((r) => setTimeout(r, 400));

  const testEmail = `lead_diag_${Date.now()}@test.com`;
  const randDigits = Math.floor(10000000 + Math.random() * 90000000);
  const testPhone = `(11) 9${randDigits}`;
  const testProjectName = `Lead Teste Diag ${Date.now()}`;

  const postRes = await fetch('http://localhost:5088/api/projetos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_name: testProjectName,
      client_info: { email: testEmail, phone: testPhone },
      modules: ['agendador_pwa', 'site'],
      summary: { total_setup_price: 1590, monthly_maintenance: 88 },
      reference_links: [{ url: 'https://example.com', type: 'site' }],
      auto_process: false,
    }),
  });

  assert.equal(postRes.status, 201, 'Should return 201 Created');
  const responseData = await postRes.json();

  try {
    // Assert user symptom: the app must NOT fall back to local-only storage
    assert.equal(
      responseData.is_local,
      undefined,
      'Lead was saved as local-only instead of being saved to the app (Supabase CRM)'
    );

    // Verify directly in Supabase that the lead reached CRM
    const wacrmEnv = dotenv.config({ path: path.resolve(__dirname, '../../wacrm/.env.local') });
    const targetUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const targetKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const sbClient = createClient(targetUrl, targetKey);

    const { data: contact } = await sbClient
      .from('contacts')
      .select('id, email, phone')
      .eq('email', testEmail)
      .maybeSingle();

    assert.ok(contact, 'Contact was not created in CRM contacts table');

    const { data: deal } = await sbClient
      .from('deals')
      .select('id, title, value')
      .eq('contact_id', contact.id)
      .maybeSingle();

    assert.ok(deal, 'Deal was not created in CRM deals table');

    const { data: queueItem } = await sbClient
      .from('fila_projetos')
      .select('id')
      .eq('id', responseData.id)
      .maybeSingle();

    assert.ok(queueItem, 'Project was not recorded in Supabase fila_projetos');

    // Cleanup created test records
    if (deal) await sbClient.from('deals').delete().eq('id', deal.id);
    if (queueItem) await sbClient.from('fila_projetos').delete().eq('id', queueItem.id);
    if (contact) await sbClient.from('contacts').delete().eq('id', contact.id);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
