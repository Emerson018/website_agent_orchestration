import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Server Diagnose API - POST /api/leads/:id/diagnose enforces preconditions and fail-fast', async () => {
  process.env.PORT = '5096';
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;

  const { server } = await import('./server.js');
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  await new Promise((r) => setTimeout(r, 400));
  const baseUrl = 'http://localhost:5096';

  const testIdNoDossier = '77701';
  const testIdWithDossier = '77702';

  // Seed local projects
  const localDataPath = path.join(__dirname, 'data', 'local_projetos.json');
  let localProjects = [];
  if (fs.existsSync(localDataPath)) {
    try {
      localProjects = JSON.parse(fs.readFileSync(localDataPath, 'utf-8'));
    } catch {
      localProjects = [];
    }
  }

  localProjects = localProjects.filter((p) => p.id !== testIdNoDossier && p.id !== testIdWithDossier);

  localProjects.unshift(
    {
      id: testIdNoDossier,
      mensagem_lead: 'Cliente sem dossiê',
      resultado_json: {},
      is_local: true,
    },
    {
      id: testIdWithDossier,
      mensagem_lead: 'Cliente com dossiê',
      resultado_json: {
        project_name: 'Studio Estética Bella',
        dossie: {
          nome_verificado: 'Studio Estética Bella',
          endereco_formatado: 'Rua Bela Vista, 200',
          nota: 4.9,
          total_avaliacoes: 30,
          fotos: [{ id: 1, photo_url: 'http://localhost/test.jpg' }],
        },
      },
      is_local: true,
    }
  );

  fs.writeFileSync(localDataPath, JSON.stringify(localProjects, null, 2), 'utf-8');

  try {
    // 1. Calling diagnose on a lead without Google Maps dossier -> 400
    const noDossierRes = await fetch(`${baseUrl}/api/leads/${testIdNoDossier}/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(noDossierRes.status, 400);
    const noDossierData = await noDossierRes.json();
    assert.ok(noDossierData.error.includes('Dossiê do Google Maps'));

    // 2. Calling diagnose with dossier but without GEMINI_API_KEY -> 412 (Precondition Failed)
    const withDossierRes = await fetch(`${baseUrl}/api/leads/${testIdWithDossier}/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(withDossierRes.status, 412);
    const withDossierData = await withDossierRes.json();
    assert.equal(withDossierData.code, 'MISSING_API_KEY');
    assert.ok(withDossierData.error.includes('GEMINI_API_KEY'));
  } finally {
    if (server) {
      server.closeAllConnections?.();
      server.close();
    }
  }
});
