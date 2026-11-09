// Checklist de Dados do Site: os dados que o site do cliente precisa, presentes ou não, e de onde vieram.

import { catalogHasItems } from './extracted-catalog';

export type SiteChecklistKey =
  | 'nome'
  | 'telefone'
  | 'endereco'
  | 'maps'
  | 'horarios'
  | 'site'
  | 'fotos'
  | 'avaliacoes'
  | 'catalogo'
  | 'pagamento';

export interface SiteChecklistItem {
  key: SiteChecklistKey;
  label: string;
  present: boolean;
  /** De onde o dado veio; ausente quando o dado falta. */
  source?: string;
}

interface ChecklistAdditionalData {
  maps_url?: string;
  maps_search_link?: string;
  dossie?: {
    nome_verificado?: string;
    telefone_estabelecimento?: string;
    endereco_formatado?: string;
    google_maps_url?: string;
    horarios_funcionamento?: string[];
    site_oficial?: string;
    fotos?: unknown[];
    avaliacoes_positivas?: unknown[];
    informacoes_relevantes?: { comodidades?: string[] };
  } | null;
  scraped_data?: { cardapio?: unknown[] } | null;
  catalogo_extraido?: { markdown?: string } | null;
}

export interface SiteChecklistInput {
  company?: string | null;
  phone?: string | null;
  website?: string | null;
  additional_data?: object | null;
}

const filled = (v?: string | null) => Boolean(v && v.trim());
const isMapsUrl = (v: string) => /google\.[^/]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|share\.google/i.test(v);
const PAYMENT_WORDS = /pagamento|cart[aã]o|cart[oõ]es|pix|dinheiro|d[eé]bito|cr[eé]dito/i;

function item(key: SiteChecklistKey, label: string, source?: string | false | null): SiteChecklistItem {
  return source ? { key, label, present: true, source } : { key, label, present: false };
}

export function computeSiteChecklist(input: SiteChecklistInput): SiteChecklistItem[] {
  const ad = (input.additional_data || {}) as ChecklistAdditionalData;
  const d = ad.dossie || {};
  const catalogMd = ad.catalogo_extraido?.markdown || '';

  const fotos = Array.isArray(d.fotos) ? d.fotos.length : 0;
  const avaliacoes = Array.isArray(d.avaliacoes_positivas) ? d.avaliacoes_positivas.length : 0;
  const website = filled(input.website) && !isMapsUrl(input.website!) ? input.website : null;

  const catalogSources = [
    catalogHasItems(catalogMd) && 'Catálogo Extraído',
    Array.isArray(ad.scraped_data?.cardapio) && ad.scraped_data!.cardapio!.length > 0 && 'Raspagem',
  ].filter(Boolean);

  const paymentInCatalog = /\*\*Formas de pagamento:\*\*\s*\S/i.test(catalogMd);
  const paymentInMaps = (d.informacoes_relevantes?.comodidades || []).some((c) => PAYMENT_WORDS.test(c));

  return [
    item('nome', 'Nome do estabelecimento', filled(d.nome_verificado) ? 'Google Maps' : filled(input.company) && 'Briefing'),
    item('telefone', 'Telefone / WhatsApp', filled(input.phone) ? 'Briefing' : filled(d.telefone_estabelecimento) && 'Google Maps'),
    item('endereco', 'Endereço', filled(d.endereco_formatado) && 'Google Maps'),
    item(
      'maps',
      'Link do Google Maps',
      filled(d.google_maps_url) ? 'Google Maps' : (filled(ad.maps_url) || filled(ad.maps_search_link)) && 'Link cadastrado'
    ),
    item('horarios', 'Horários', Array.isArray(d.horarios_funcionamento) && d.horarios_funcionamento.length > 0 && 'Google Maps'),
    item('site', 'Site oficial', website ? 'Briefing' : filled(d.site_oficial) && 'Google Maps'),
    item('fotos', 'Fotos', fotos > 0 && `${fotos} do Google Maps`),
    item('avaliacoes', 'Avaliações 5 estrelas', avaliacoes > 0 && `${avaliacoes} do Google Maps`),
    item('catalogo', 'Itens de catálogo', catalogSources.length > 0 && catalogSources.join(' + ')),
    item('pagamento', 'Formas de pagamento', paymentInCatalog ? 'Catálogo Extraído' : paymentInMaps && 'Google Maps'),
  ];
}
