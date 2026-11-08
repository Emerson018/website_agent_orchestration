import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeSupabase } from './test_support/fake_supabase.mjs';

test('Server Diagnose API - POST /api/leads/:id/diagnose enforces preconditions and fail-fast', async () => {
  process.env.PORT = '5096';
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;

  const { server, setSupabaseClientForTests } = await import('./server.js');
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  setSupabaseClientForTests(
    createFakeSupabase({
      contacts: [
        { id: 'c-no-dossier', name: 'Cliente sem dossiê', additional_data: {} },
        {
          id: 'c-with-dossier',
          company: 'Studio Estética Bella',
          additional_data: {
            dossie: {
              nome_verificado: 'Studio Estética Bella',
              endereco_formatado: 'Rua Bela Vista, 200',
              nota: 4.9,
              total_avaliacoes: 30,
              fotos: [{ id: 1, photo_url: 'http://localhost/test.jpg' }],
            },
          },
        },
      ],
    })
  );
  await new Promise((r) => setTimeout(r, 400));
  const baseUrl = 'http://localhost:5096';
  const diagnose = (id) =>
    fetch(`${baseUrl}/api/leads/${id}/diagnose`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });

  try {
    const missing = await diagnose('c-unknown');
    assert.equal(missing.status, 404);

    const noDossierRes = await diagnose('c-no-dossier');
    assert.equal(noDossierRes.status, 400);
    assert.ok((await noDossierRes.json()).error.includes('Dossiê do Google Maps'));

    const withDossierRes = await diagnose('c-with-dossier');
    assert.equal(withDossierRes.status, 412);
    const withDossierData = await withDossierRes.json();
    assert.equal(withDossierData.code, 'MISSING_API_KEY');
    assert.ok(withDossierData.error.includes('GEMINI_API_KEY'));
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});
