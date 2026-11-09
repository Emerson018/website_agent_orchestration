import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeSupabase } from './test_support/fake_supabase.mjs';

const b64 = (s) => Buffer.from(s, 'binary').toString('base64');
// Primeiros bytes reais de cada formato
const PNG = '\x89PNG\r\n\x1a\n1234';
const PDF = '%PDF-1.4';
const WEBP = 'RIFF\x00\x00\x00\x00WEBPVP8 ';

test('Catálogo Extraído files: upload, list, validate and remove', async () => {
  process.env.PORT = '5094';
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
  const { server, setSupabaseClientForTests } = await import('./server.js');
  const fake = createFakeSupabase({
    contacts: [{ id: 'c-1', company: 'Pizzaria Bella', additional_data: { dossie: { nota: 4.8 } } }],
  });
  setSupabaseClientForTests(fake);
  await new Promise((r) => setTimeout(r, 300));
  const baseUrl = 'http://localhost:5094';
  const post = (id, files) =>
    fetch(`${baseUrl}/api/leads/${id}/catalog-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
    });
  const contact = () => fake.tables.contacts.find((c) => c.id === 'c-1');

  try {
    // Envio de vários arquivos de uma vez
    const res = await post('c-1', [
      { fileName: 'cardapio-1.png', mimeType: 'image/png', base64Data: b64(PNG) },
      { fileName: 'cardapio.pdf', mimeType: 'application/pdf', base64Data: `data:application/pdf;base64,${b64(PDF)}` },
    ]);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.files.length, 2);
    assert.deepEqual(body.files.map((f) => [f.name, f.mime_type, f.size]), [
      ['cardapio-1.png', 'image/png', 12],
      ['cardapio.pdf', 'application/pdf', 8],
    ]);
    assert.ok(body.files.every((f) => f.id && f.url.startsWith('https://fake.storage/lead-documents/')));
    assert.equal(Object.keys(fake.objects['lead-documents']).length, 2);

    // Os arquivos ficam no contato, sem apagar o que já existia em additional_data
    assert.equal(contact().additional_data.catalogo_arquivos.length, 2);
    assert.equal(contact().additional_data.dossie.nota, 4.8);

    // Um novo envio acrescenta à lista
    const more = await post('c-1', [{ fileName: 'bebidas.webp', mimeType: 'image/webp', base64Data: b64(WEBP) }]);
    assert.equal(more.status, 201);
    assert.equal((await more.json()).files.length, 3);

    // Tipo não aceito: nada é guardado
    const badType = await post('c-1', [{ fileName: 'notas.txt', mimeType: 'text/plain', base64Data: b64('oi') }]);
    assert.equal(badType.status, 400);
    assert.ok((await badType.json()).error.includes('notas.txt'));

    // Conteúdo que não bate com o tipo declarado: nada é guardado
    const fakePng = await post('c-1', [{ fileName: 'falso.png', mimeType: 'image/png', base64Data: b64('<html>oi</html>') }]);
    assert.equal(fakePng.status, 400);
    assert.ok((await fakePng.json()).error.includes('falso.png'));

    // Acima de 15 MB no envio: nada é guardado
    const big = Buffer.alloc(15 * 1024 * 1024 + 1).toString('base64');
    const tooBig = await post('c-1', [{ fileName: 'enorme.jpg', mimeType: 'image/jpeg', base64Data: big }]);
    assert.equal(tooBig.status, 413);
    assert.equal(contact().additional_data.catalogo_arquivos.length, 3);
    assert.equal(Object.keys(fake.objects['lead-documents']).length, 3);

    // Envio vazio
    assert.equal((await post('c-1', [])).status, 400);

    // Lead inexistente
    assert.equal((await post('c-404', [{ fileName: 'a.png', mimeType: 'image/png', base64Data: b64('x') }])).status, 404);

    // Remover um arquivo tira da lista e do Storage
    const [first] = contact().additional_data.catalogo_arquivos;
    const del = await fetch(`${baseUrl}/api/leads/c-1/catalog-files/${first.id}`, { method: 'DELETE' });
    assert.equal(del.status, 200);
    const afterDelete = await del.json();
    assert.equal(afterDelete.files.length, 2);
    assert.ok(!afterDelete.files.some((f) => f.id === first.id));
    assert.equal(Object.keys(fake.objects['lead-documents']).length, 2);

    // Falha no Storage ao remover: o arquivo continua na lista
    fake.storageErrors.remove = 'storage fora do ar';
    const [second] = contact().additional_data.catalogo_arquivos;
    const delFail = await fetch(`${baseUrl}/api/leads/c-1/catalog-files/${second.id}`, { method: 'DELETE' });
    assert.equal(delFail.status, 502);
    assert.equal(contact().additional_data.catalogo_arquivos.length, 2);
    delete fake.storageErrors.remove;

    const delMissing = await fetch(`${baseUrl}/api/leads/c-1/catalog-files/nao-existe`, { method: 'DELETE' });
    assert.equal(delMissing.status, 404);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});
