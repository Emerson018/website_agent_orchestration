// Instagram do Negócio (GLOSSARY.md). O Google não informa o perfil, e ele nunca é adivinhado pelo nome.

const NOT_PROFILES = new Set(['p', 'reel', 'reels', 'tv', 'stories', 'explore', 'accounts', 'direct']);

/** Link do perfil a partir de "@perfil" ou de um link do Instagram; null para qualquer outra coisa. */
export function parseInstagram(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const match =
    text.match(/^@([a-z0-9._]{1,30})$/i) ||
    text.match(/^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\/([a-z0-9._]{1,30})\/?(?:[?#].*)?$/i);
  if (!match || NOT_PROFILES.has(match[1].toLowerCase())) return null;
  return `https://www.instagram.com/${match[1]}`;
}

/** Prioridade: o que o cliente digitou no formulário, os links do lead e, por fim, o site do negócio. */
export function resolveInstagram({ instagram, website, links, resultadosWeb } = {}) {
  const urls = (items) => (Array.isArray(items) ? items.map((item) => (typeof item === 'string' ? item : item?.url)) : []);
  const fromSite = Array.isArray(resultadosWeb) ? resultadosWeb.filter((r) => r?.tipo === 'instagram') : [];
  for (const candidate of [instagram, website, ...urls(links), ...urls(fromSite)]) {
    const profile = parseInstagram(candidate);
    if (profile) return profile;
  }
  return '';
}
