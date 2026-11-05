import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Server Scrape Deep API - POST /api/leads/:id/scrape-deep', async (t) => {
  // 1. Inicia um servidor HTTP mock simulando o FastAPI Scrapling
  const mockScraperServer = http.createServer((req, res) => {
    if (req.url === '/api/scrape/deep' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const parsed = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          sucesso: true,
          urls: parsed.urls,
          metodo_utilizado: 'stealth_browser',
          cardapio: [
            { nome: 'Pizza Margherita', preco: 'R$ 48,00', descricao: 'Molho e manjericão fresco' }
          ],
          institucional: {
            titulo: 'Pizzaria Bella',
            sobre: 'Tradição italiana desde 1990',
            contato: { telefones: ['(11) 99999-8888'], emails: [], enderecos: [] }
          },
          markdown_resumo: '### Pizzaria Bella\n- Pizza Margherita: R$ 48,00'
        }));
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise((resolve) => mockScraperServer.listen(8099, resolve));

  process.env.PORT = '5099';
  process.env.AI_FACTORY_URL = 'http://localhost:8099';

  const { server } = await import('./server.js');
  await new Promise((r) => setTimeout(r, 400));
  const baseUrl = 'http://localhost:5099';

  const testIdNoUrl = '88801';
  const testIdWithUrl = '88802';

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

  localProjects = localProjects.filter((p) => p.id !== testIdNoUrl && p.id !== testIdWithUrl);
  localProjects.unshift(
    {
      id: testIdNoUrl,
      mensagem_lead: 'Lead sem url',
      resultado_json: {},
      is_local: true,
    },
    {
      id: testIdWithUrl,
      mensagem_lead: 'Lead com url de site',
      resultado_json: {
        project_name: 'Pizzaria Bella',
        additional_data: {
          website: 'https://pizzariabella.com.br'
        }
      },
      is_local: true,
    }
  );

  fs.mkdirSync(path.dirname(localDataPath), { recursive: true });
  fs.writeFileSync(localDataPath, JSON.stringify(localProjects, null, 2), 'utf-8');

  // Teste 1: Falha amigável 400 quando não há nenhuma URL fornecida
  await t.test('Retorna 400 quando lead não possui URLs', async () => {
    const res = await fetch(`${baseUrl}/api/leads/${testIdNoUrl}/scrape-deep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: [] }),
    });
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.ok(data.error.includes('Nenhuma URL'));
  });

  // Teste 2: Sucesso quando URLs são enviadas no body
  await t.test('Executa raspagem e retorna dados estruturados quando enviadas URLs no body', async () => {
    const res = await fetch(`${baseUrl}/api/leads/${testIdNoUrl}/scrape-deep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: ['https://pizzariabella.com.br/cardapio'] }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.scraped_data.metodo_utilizado, 'stealth_browser');
    assert.equal(data.scraped_data.cardapio[0].nome, 'Pizza Margherita');
    assert.equal(data.urls[0], 'https://pizzariabella.com.br/cardapio');
  });

  // Teste 3: Sucesso quando URLs são herdadas do additional_data.website do lead
  await t.test('Recupera URL cadastrada no lead automaticamente', async () => {
    const res = await fetch(`${baseUrl}/api/leads/${testIdWithUrl}/scrape-deep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.urls[0], 'https://pizzariabella.com.br');
  });

  // Limpeza
  server.close();
  mockScraperServer.close();
});
