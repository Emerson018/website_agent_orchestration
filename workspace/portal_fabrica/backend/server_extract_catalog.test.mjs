import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createFakeSupabase } from './test_support/fake_supabase.mjs';

const MARKDOWN = '## Informações Gerais\n- **Nome:** Pizzaria Bella\n\n## Pizzas\n### Margherita\n- **Preço:** R$ 48,00';

test('POST /api/leads/:id/extract-catalog turns stored files into the Catálogo Extraído', async () => {
  // Gemini falso que também serve os arquivos do Storage
  const geminiCalls = [];
  const fakeGemini = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (req.url === '/files/cardapio.png') {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        return res.end('PNG');
      }
      if (req.url === '/files/cardapio.pdf') {
        res.writeHead(200, { 'Content-Type': 'application/pdf' });
        return res.end('%PDF');
      }
      geminiCalls.push(JSON.parse(body));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: '```markdown\n' + MARKDOWN + '\n```' }] } }] }));
    });
  });
  await new Promise((r) => fakeGemini.listen(0, r));
  const geminiBase = `http://127.0.0.1:${fakeGemini.address().port}`;

  process.env.PORT = '5093';
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
  process.env.GEMINI_API_BASE_URL = geminiBase;
  process.env.GEMINI_MODEL = 'modelo-teste';
  const { server, setSupabaseClientForTests } = await import('./server.js');
  const fake = createFakeSupabase({
    contacts: [
      {
        id: 'c-files',
        company: 'Pizzaria Bella',
        additional_data: {
          prompt_mestre: 'existente',
          catalogo_arquivos: [
            { id: 'f1', name: 'cardapio.png', mime_type: 'image/png', size: 3, url: `${geminiBase}/files/cardapio.png` },
            { id: 'f2', name: 'cardapio.pdf', mime_type: 'application/pdf', size: 4, url: `${geminiBase}/files/cardapio.pdf` },
          ],
        },
      },
      { id: 'c-empty', company: 'Sem Arquivos', additional_data: {} },
    ],
  });
  setSupabaseClientForTests(fake);
  await new Promise((r) => setTimeout(r, 300));
  const extract = (id) => fetch(`http://localhost:5093/api/leads/${id}/extract-catalog`, { method: 'POST' });

  try {
    // Sem chave do Gemini: 412, e o Gemini não é chamado
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    const noKey = await extract('c-files');
    assert.equal(noKey.status, 412);
    assert.equal((await noKey.json()).code, 'MISSING_API_KEY');
    assert.equal(geminiCalls.length, 0);

    process.env.GEMINI_API_KEY = 'chave-teste';

    // Sem arquivos: recusa sem chamar o Gemini
    const empty = await extract('c-empty');
    assert.equal(empty.status, 400);
    assert.equal(geminiCalls.length, 0);

    // Lead inexistente
    assert.equal((await extract('c-404')).status, 404);

    // Com arquivos: todos vão para o Gemini e o markdown é salvo no contato
    const ok = await extract('c-files');
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.equal(body.success, true);
    assert.equal(body.catalogo_extraido.markdown, MARKDOWN, 'cercas de código removidas');
    assert.equal(body.catalogo_extraido.modelo_utilizado, 'modelo-teste');
    assert.equal(body.catalogo_extraido.arquivos_processados, 2);
    assert.equal(body.catalogo_extraido.editado_manualmente, false);

    assert.equal(geminiCalls.length, 1);
    const parts = geminiCalls[0].contents[0].parts;
    assert.ok(parts[0].text.includes('## Informações Gerais'), 'o prompt de extração vai primeiro');
    assert.deepEqual(parts.slice(1).map((p) => p.inlineData.mimeType), ['image/png', 'application/pdf']);

    const saved = fake.tables.contacts.find((c) => c.id === 'c-files').additional_data;
    assert.equal(saved.catalogo_extraido.markdown, MARKDOWN);
    assert.equal(saved.catalogo_arquivos.length, 2, 'os arquivos continuam guardados');
    assert.equal(saved.prompt_mestre, 'existente', 'o resto de additional_data é preservado');
  } finally {
    delete process.env.GEMINI_API_BASE_URL;
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_API_KEY;
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => fakeGemini.close(resolve));
  }
});
