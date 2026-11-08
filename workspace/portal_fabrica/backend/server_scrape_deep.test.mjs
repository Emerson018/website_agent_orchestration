import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createFakeSupabase } from './test_support/fake_supabase.mjs';


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

  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
  const { server, setSupabaseClientForTests } = await import('./server.js');
  const fake = createFakeSupabase({
    contacts: [
      { id: 'c-no-url', name: 'Lead sem url', additional_data: {} },
      { id: 'c-with-url', company: 'Pizzaria Bella', additional_data: { website: 'https://pizzariabella.com.br' } },
    ],
  });
  setSupabaseClientForTests(fake);
  await new Promise((r) => setTimeout(r, 400));
  const baseUrl = 'http://localhost:5099';
  const testIdNoUrl = 'c-no-url';
  const testIdWithUrl = 'c-with-url';

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
    const saved = fake.tables.contacts.find((c) => c.id === testIdWithUrl);
    assert.equal(saved.additional_data.scraped_data.cardapio[0].nome, 'Pizza Margherita');
  });

  // Limpeza
  await new Promise((resolve) => server.close(resolve));
  mockScraperServer.close();
});
