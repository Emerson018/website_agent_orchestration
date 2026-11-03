import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { orchestrateModularTenantStack } from './modular_orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../');

test('End-to-End Decision Gate - Lead Intake to Modular Stack Provisioning', async () => {
  process.env.PORT = '5095';
  const { server } = await import('./server.js');
  await new Promise((r) => setTimeout(r, 400));
  const baseUrl = `http://localhost:5095`;

  const testProjectId = '88801';
  const testSlug = 'pizzaria_nonna_e2e';
  const targetWorkspaceDir = path.join(REPO_ROOT, 'workspace', testSlug);

  try {
    // 1. Lead Intake & Enrichment Mock
    const mockLeadDossier = {
      place_id: 'ChIJTESTE2E99',
      nome_verificado: 'Pizzaria da Nonna E2E',
      nicho_detectado: 'restaurant',
      rating_score: 4.8,
      total_reviews: 120,
      pitch_comercial_sugerido: 'Proposta digital para pizzaria',
    };

    const mockProject = {
      id: testProjectId,
      mensagem_lead: 'Gostaria de um cardápio digital para a Pizzaria Nonna',
      status: 'aguardando_decisao',
      resultado_json: {
        project_name: 'Pizzaria Nonna E2E',
        dossie: mockLeadDossier,
      },
      is_local: true,
    };

    // Ensure local project is registered
    const localDataPath = path.join(__dirname, 'data', 'local_projetos.json');
    let localProjects = [];
    if (fs.existsSync(localDataPath)) {
      try {
        localProjects = JSON.parse(fs.readFileSync(localDataPath, 'utf-8'));
      } catch {
        localProjects = [];
      }
    }
    localProjects = localProjects.filter((p) => String(p.id) !== testProjectId);
    localProjects.unshift(mockProject);
    fs.writeFileSync(localDataPath, JSON.stringify(localProjects, null, 2), 'utf-8');

    // 2. Decision Gate Operator Approval: POST /api/projetos/:id/processar
    const processRes = await fetch(`${baseUrl}/api/projetos/${testProjectId}/processar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    assert.equal(processRes.status, 200, 'Decision gate must return 200 OK');
    const processData = await processRes.json();

    assert.equal(processData.success, true);
    assert.equal(processData.status, 'concluido');
    assert.ok(processData.resultado, 'Outcome must be present');

    // 3. Verify Two-Tier Workspace Structure
    assert.ok(fs.existsSync(targetWorkspaceDir), 'Workspace folder must be created');
    assert.ok(fs.existsSync(path.join(targetWorkspaceDir, 'frontend')), 'frontend/ tier must exist');
    assert.ok(fs.existsSync(path.join(targetWorkspaceDir, 'backend')), 'backend/ tier must exist');
    assert.ok(fs.existsSync(path.join(targetWorkspaceDir, 'database')), 'database/ tier must exist');

    // 4. Verify Synthesized Niche Routes (Gastronomia)
    const cardapioRoute = path.join(targetWorkspaceDir, 'backend', 'routes', 'cardapio.js');
    const pedidosRoute = path.join(targetWorkspaceDir, 'backend', 'routes', 'pedidos.js');
    const gastroSchema = path.join(targetWorkspaceDir, 'database', '001_gastronomia_schema.sql');

    assert.ok(fs.existsSync(cardapioRoute), 'routes/cardapio.js must be synthesized');
    assert.ok(fs.existsSync(pedidosRoute), 'routes/pedidos.js must be synthesized');
    assert.ok(fs.existsSync(gastroSchema), 'database/001_gastronomia_schema.sql must be synthesized');

    // 5. Verify Frontend Configuration and Assigned Ports
    const aiConfigFile = path.join(targetWorkspaceDir, 'frontend', 'ai_config.json');
    assert.ok(fs.existsSync(aiConfigFile), 'ai_config.json must exist');
    const aiConfig = JSON.parse(fs.readFileSync(aiConfigFile, 'utf-8'));

    assert.equal(aiConfig.nicho_detectado, 'gastronomia');
    assert.deepEqual(aiConfig.modules, ['cardapio', 'pedidos']);
    assert.ok(aiConfig.backend_port > 0, 'Unique backend port must be allocated');
    assert.ok(aiConfig.frontend_port > 0, 'Unique frontend port must be allocated');

    // 6. Verify Environment Credentials
    const backendEnv = fs.readFileSync(path.join(targetWorkspaceDir, 'backend', '.env'), 'utf-8');
    const frontendEnv = fs.readFileSync(path.join(targetWorkspaceDir, 'frontend', '.env'), 'utf-8');

    assert.ok(backendEnv.includes(`PORT=${aiConfig.backend_port}`));
    assert.ok(frontendEnv.includes(`VITE_BACKEND_URL=http://localhost:${aiConfig.backend_port}/api`));
  } finally {
    if (server) {
      server.closeAllConnections?.();
      server.close();
    }
    if (fs.existsSync(targetWorkspaceDir)) {
      try {
        fs.rmSync(targetWorkspaceDir, { recursive: true, force: true });
      } catch {}
    }
  }
});

test('Modular Orchestrator - direct orchestration of Servicos and Varejo', async () => {
  // 1. Serviços
  const servicosOutcome = await orchestrateModularTenantStack('99901', {
    project_name: 'Barbearia Dom E2E',
    nicho_detectado: 'barbershop',
  });
  assert.equal(servicosOutcome.nicho_detectado, 'servicos');
  assert.deepEqual(servicosOutcome.modules, ['servicos', 'agendar']);

  const servicosDir = path.join(REPO_ROOT, servicosOutcome.target_project_path);
  assert.ok(fs.existsSync(path.join(servicosDir, 'backend', 'routes', 'servicos.js')));
  assert.ok(fs.existsSync(path.join(servicosDir, 'backend', 'routes', 'agendamentos.js')));
  fs.rmSync(servicosDir, { recursive: true, force: true });

  // 2. Varejo
  const varejoOutcome = await orchestrateModularTenantStack('99902', {
    project_name: 'Pet Shop Mania E2E',
    nicho_detectado: 'pet_shop',
  });
  assert.equal(varejoOutcome.nicho_detectado, 'varejo');
  assert.deepEqual(varejoOutcome.modules, ['produtos', 'carrinho']);

  const varejoDir = path.join(REPO_ROOT, varejoOutcome.target_project_path);
  assert.ok(fs.existsSync(path.join(varejoDir, 'backend', 'routes', 'produtos.js')));
  assert.ok(fs.existsSync(path.join(varejoDir, 'backend', 'routes', 'carrinho.js')));
  fs.rmSync(varejoDir, { recursive: true, force: true });
});
