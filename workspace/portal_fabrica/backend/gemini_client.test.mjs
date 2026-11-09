import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { generateGeminiContent, fileUrlToInlinePart } from './gemini_client.js';

// Servidor HTTP local que faz o papel da API do Gemini e de um host de arquivos
async function startFakeServer(handler) {
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      calls.push({ url: req.url, body: body ? JSON.parse(body) : null });
      handler(req, res);
    });
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, calls, close: () => new Promise((r) => server.close(r)) };
}

const geminiReply = (text) => JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] });

test('generateGeminiContent falls back to the next model when the first one is unavailable', async () => {
  const fake = await startFakeServer((req, res) => {
    if (req.url.includes('/models/modelo-lotado:')) {
      res.writeHead(503);
      return res.end('busy');
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(geminiReply('resposta do segundo modelo'));
  });
  try {
    const result = await generateGeminiContent({
      apiKey: '  "chave-teste"  ',
      parts: [{ text: 'olá' }],
      models: ['modelo-lotado', 'modelo-ok'],
      baseUrl: fake.base,
      retryDelayMs: 0,
    });
    assert.deepEqual(result, { success: true, text: 'resposta do segundo modelo', model: 'modelo-ok' });
    assert.equal(fake.calls.length, 2);
    assert.ok(fake.calls[1].url.includes('key=chave-teste'), 'a chave chega sem aspas nem espaços');
    assert.deepEqual(fake.calls[1].body.contents[0].parts, [{ text: 'olá' }]);
  } finally {
    await fake.close();
  }
});

test('generateGeminiContent reports a missing key without calling Gemini', async () => {
  const fake = await startFakeServer((req, res) => {
    res.writeHead(200);
    res.end(geminiReply('nunca'));
  });
  try {
    const result = await generateGeminiContent({ apiKey: ' "" ', parts: [{ text: 'x' }], models: ['m'], baseUrl: fake.base });
    assert.equal(result.success, false);
    assert.equal(result.code, 'MISSING_API_KEY');
    assert.equal(fake.calls.length, 0);
  } finally {
    await fake.close();
  }
});

test('generateGeminiContent stops on a fatal error and reports it', async () => {
  const fake = await startFakeServer((req, res) => {
    res.writeHead(403);
    res.end('API_KEY_SERVICE_BLOCKED');
  });
  try {
    const result = await generateGeminiContent({ apiKey: 'k', parts: [{ text: 'x' }], models: ['a', 'b'], baseUrl: fake.base, retryDelayMs: 0 });
    assert.equal(result.success, false);
    assert.equal(result.code, 'GEMINI_FAILED');
    assert.ok(result.error.includes('403'));
    assert.equal(fake.calls.length, 1, 'erro fatal não tenta o próximo modelo');
  } finally {
    await fake.close();
  }
});

test('fileUrlToInlinePart turns images and PDFs into inlineData and skips failed downloads', async () => {
  const fake = await startFakeServer((req, res) => {
    if (req.url === '/cardapio.pdf') {
      res.writeHead(200, { 'Content-Type': 'application/pdf' });
      return res.end('%PDF-1.4 fake');
    }
    if (req.url === '/foto.png') {
      res.writeHead(200, { 'Content-Type': 'image/png; charset=binary' });
      return res.end('PNGDATA');
    }
    res.writeHead(404);
    res.end();
  });
  try {
    const pdf = await fileUrlToInlinePart(`${fake.base}/cardapio.pdf`);
    assert.deepEqual(pdf, { inlineData: { mimeType: 'application/pdf', data: Buffer.from('%PDF-1.4 fake').toString('base64') } });

    const png = await fileUrlToInlinePart(`${fake.base}/foto.png`);
    assert.equal(png.inlineData.mimeType, 'image/png');
    assert.equal(png.inlineData.data, Buffer.from('PNGDATA').toString('base64'));

    assert.equal(await fileUrlToInlinePart(`${fake.base}/sumiu.jpg`), null);
  } finally {
    await fake.close();
  }
});
