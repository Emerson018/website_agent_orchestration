// Baixa as fotos do dossiê e as junta num ZIP. As fotos já vêm comprimidas (JPEG/PNG/WebP),
// então o ZIP só as guarda, sem compressão e sem depender de biblioteca.

const PHOTO_HOSTS = new Set(['places.googleapis.com', 'maps.googleapis.com']);
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const PHOTO_TIMEOUT_MS = 15_000;

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** ZIP sem compressão (método "stored"), com nomes em UTF-8. */
function storedZip(files) {
  const VERSION = 20;
  const UTF8_FLAG = 0x0800;
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBytes = Buffer.from(name, 'utf8');
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(VERSION, 4);
    local.writeUInt16LE(UTF8_FLAG, 6);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    locals.push(local, nameBytes, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(VERSION, 4);
    central.writeUInt16LE(VERSION, 6);
    central.writeUInt16LE(UTF8_FLAG, 8);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);

    offset += local.length + nameBytes.length + data.length;
  }

  const centralDirectory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDirectory, end]);
}

/** Só busca endereços de fotos do Google: o link vem de dados salvos no contato. */
function isGooglePhoto(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && PHOTO_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Os links salvos no dossiê não levam a chave do Google, que nunca deve chegar ao navegador:
 * ela só entra aqui, no servidor, na hora de buscar a foto.
 */
export function withGooglePhotoKey(url, apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY) {
  const key = (apiKey || '').trim();
  if (!key || !isGooglePhoto(url)) return url;
  const keyed = new URL(url);
  keyed.searchParams.set('key', key);
  return keyed.toString();
}

/** Baixa uma foto do dossiê; null se o link não for do Google, falhar ou não for imagem. */
export async function downloadDossierPhoto(url, fetchImpl = fetch) {
  if (!isGooglePhoto(url)) return null;
  try {
    const res = await fetchImpl(withGooglePhotoKey(url), { signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS) });
    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const extension = EXTENSIONS[contentType];
    if (!extension) return null;
    return { contentType, extension, data: Buffer.from(await res.arrayBuffer()) };
  } catch {
    return null;
  }
}

/** Monta o ZIP com as fotos que puderam ser baixadas; `zip` é null quando nenhuma veio. */
export async function buildDossierPhotosZip({ fotos, fetchImpl = fetch }) {
  const list = Array.isArray(fotos) ? fotos : [];
  const photos = await Promise.all(list.map((foto) => downloadDossierPhoto(foto?.photo_url, fetchImpl)));

  const files = [];
  photos.forEach((photo, index) => {
    if (!photo) return;
    const order = String(files.length + 1).padStart(2, '0');
    const kind = list[index].tipo === 'cardapio' ? 'cardapio' : 'foto';
    files.push({ name: `${order}-${kind}.${photo.extension}`, data: photo.data });
  });

  return {
    zip: files.length > 0 ? storedZip(files) : null,
    included: files.length,
    skipped: list.length - files.length,
  };
}

export function zipFileName(companyName) {
  const slug = String(companyName || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `fotos-${slug || 'do-lead'}.zip`;
}
