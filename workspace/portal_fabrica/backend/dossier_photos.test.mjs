import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDossierPhotosZip, downloadDossierPhoto, withGooglePhotoKey, zipFileName } from './dossier_photos.js';

/** Lê o diretório central de um ZIP sem compressão e devolve { nome: conteúdo }. */
function readStoredZip(zip) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end >= 0, 'has the end-of-central-directory record');
  const total = zip.readUInt16LE(end + 10);
  let at = zip.readUInt32LE(end + 16);
  const files = {};
  for (let i = 0; i < total; i++) {
    assert.equal(zip.readUInt32LE(at), 0x02014b50);
    const size = zip.readUInt32LE(at + 24);
    const nameLength = zip.readUInt16LE(at + 28);
    const localAt = zip.readUInt32LE(at + 42);
    const name = zip.toString('utf8', at + 46, at + 46 + nameLength);
    const dataAt = localAt + 30 + zip.readUInt16LE(localAt + 26) + zip.readUInt16LE(localAt + 28);
    files[name] = zip.toString('utf8', dataAt, dataAt + size);
    at += 46 + nameLength;
  }
  return files;
}

const image = (body, type = 'image/jpeg') => async () => new Response(body, { headers: { 'content-type': type } });
const place = (n) => `https://places.googleapis.com/v1/places/x/photos/${n}/media?maxWidthPx=1200&key=abc`;

test('packs every photo, naming the files by order and kind', async () => {
  const { zip, included, skipped } = await buildDossierPhotosZip({
    fotos: [
      { photo_url: place(1), tipo: 'foto_normal' },
      { photo_url: place(2), tipo: 'cardapio' },
      { photo_url: place(3) },
    ],
    fetchImpl: async (url) => (String(url).includes('/2/') ? image('menu', 'image/png')() : image(`img-${String(url).match(/photos\/(\d)/)[1]}`)()),
  });
  assert.equal(included, 3);
  assert.equal(skipped, 0);
  assert.deepEqual(readStoredZip(zip), { '01-foto.jpg': 'img-1', '02-cardapio.png': 'menu', '03-foto.jpg': 'img-3' });
});

test('skips photos that fail and never fetches hosts outside Google', async () => {
  const requested = [];
  const { zip, included, skipped } = await buildDossierPhotosZip({
    fotos: [
      { photo_url: place(1) },
      { photo_url: place(2) },
      { photo_url: 'http://169.254.169.254/latest/meta-data' },
      { photo_url: 'https://evil.example/places.googleapis.com/x.jpg' },
      { photo_url: 'https://places.googleapis.com.evil.example/x.jpg' },
    ],
    fetchImpl: async (url) => {
      requested.push(String(url));
      if (String(url).includes('/2/')) return new Response('nope', { status: 403 });
      return image('ok')();
    },
  });
  assert.equal(included, 1);
  assert.equal(skipped, 4);
  assert.deepEqual(Object.keys(readStoredZip(zip)), ['01-foto.jpg']);
  assert.equal(requested.length, 2, 'only Google hosts are requested');
});

test('a response that is not an image is skipped, and no usable photo means no zip', async () => {
  const result = await buildDossierPhotosZip({
    fotos: [{ photo_url: place(1) }],
    fetchImpl: async () => new Response('<html>', { headers: { 'content-type': 'text/html' } }),
  });
  assert.equal(result.zip, null);
  assert.equal(result.included, 0);
  assert.equal(result.skipped, 1);
});

test('the Google key is added only on the server, and only to Google photo links', async () => {
  const keyless = 'https://places.googleapis.com/v1/places/x/photos/1/media?maxWidthPx=1200';
  assert.equal(withGooglePhotoKey(keyless, 'SEGREDO'), `${keyless}&key=SEGREDO`);
  assert.equal(withGooglePhotoKey('https://evil.example/a.jpg', 'SEGREDO'), 'https://evil.example/a.jpg');

  process.env.GOOGLE_MAPS_API_KEY = 'CHAVE-DO-SERVIDOR';
  let requested = '';
  const photo = await downloadDossierPhoto(keyless, async (url) => {
    requested = String(url);
    return new Response('img', { headers: { 'content-type': 'image/jpeg; charset=binary' } });
  });
  assert.ok(requested.includes('key=CHAVE-DO-SERVIDOR'));
  assert.equal(photo.contentType, 'image/jpeg');
  assert.ok(!JSON.stringify(photo).includes('CHAVE-DO-SERVIDOR'), 'the key never comes back with the photo');
});

test('zipFileName makes a safe file name from the business name', () => {
  assert.equal(zipFileName('Pizzaria Bélla & Cia.'), 'fotos-pizzaria-bella-cia.zip');
  assert.equal(zipFileName(''), 'fotos-do-lead.zip');
});
