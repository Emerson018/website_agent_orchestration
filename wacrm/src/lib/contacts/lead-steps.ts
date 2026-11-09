// Etapas do Lead: status de cada etapa do perfil do lead e o Próximo Passo.
// Regras validadas no protótipo (branch prototype/lead-profile-layout) e no issue #9.

import { catalogHasItems } from './extracted-catalog';

export type StepStatus = 'feito' | 'faltando' | 'opcional' | 'desatualizado';

export type StepKey = 'briefing' | 'dossie' | 'raspagem' | 'catalogo' | 'diagnostico' | 'prompt';

export interface LeadStep {
  key: StepKey;
  label: string;
  status: StepStatus;
  summary: string;
  /** Só no Briefing: os campos que faltam. */
  missing?: string[];
}

/** Os campos de `contacts.additional_data` que as regras leem. */
interface LeadAdditionalData {
  website?: string;
  links?: Array<string | { url?: string }>;
  scraping_urls?: string[];
  dossie?: { site_oficial?: string; consultado_em?: string; nota?: number; fotos?: unknown[] } | null;
  scraped_data?: { cardapio?: unknown[]; institucional?: unknown; markdown_resumo?: string; raspado_em?: string } | null;
  catalogo_extraido?: { markdown?: string; gerado_em?: string; editado_em?: string } | null;
  diagnostico_ia?: unknown;
  prompt_mestre?: string;
  prompt_mestre_gerado_em?: string;
}

/** O que as regras leem do contato. */
export interface LeadStepsInput {
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  website?: string | null;
  additional_data?: object | null;
}

export const STEP_LABELS: Record<StepKey, string> = {
  briefing: 'Briefing',
  dossie: 'Dossiê',
  raspagem: 'Raspagem',
  catalogo: 'Catálogo Extraído',
  diagnostico: 'Diagnóstico',
  prompt: 'Prompt Mestre',
};

const isUrl = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

function leadHasSite(input: LeadStepsInput): boolean {
  const ad = (input.additional_data || {}) as LeadAdditionalData;
  const links = Array.isArray(ad.links) ? ad.links : [];
  const urls = Array.isArray(ad.scraping_urls) ? ad.scraping_urls : [];
  return (
    isUrl(input.website) ||
    isUrl(ad.website) ||
    isUrl(ad.dossie?.site_oficial) ||
    urls.some(isUrl) ||
    links.some((l) => isUrl(typeof l === 'string' ? l : l?.url))
  );
}

const isAfter = (a?: string | null, b?: string | null) => Boolean(a && b && new Date(a).getTime() > new Date(b).getTime());

export function computeLeadSteps(input: LeadStepsInput): LeadStep[] {
  const ad = (input.additional_data || {}) as LeadAdditionalData;
  const dossie = ad.dossie;
  const scraped = ad.scraped_data;
  const catalog = ad.catalogo_extraido;
  const promptAt: string | undefined = ad.prompt_mestre_gerado_em;

  const missing = [
    !input.name?.trim() && 'nome',
    !input.company?.trim() && 'empresa',
    !input.phone?.trim() && 'telefone',
  ].filter(Boolean) as string[];

  const scrapedItems = Array.isArray(scraped?.cardapio) ? scraped.cardapio.length : 0;
  const hasScrape = Boolean(scraped && (scrapedItems > 0 || scraped.institucional || scraped.markdown_resumo));
  const hasSite = leadHasSite(input);
  const catalogItems = catalogHasItems(catalog?.markdown);

  const promptStale =
    Boolean(ad.prompt_mestre) &&
    (isAfter(dossie?.consultado_em, promptAt) ||
      isAfter(scraped?.raspado_em, promptAt) ||
      isAfter(catalog?.editado_em || catalog?.gerado_em, promptAt));

  const steps: Array<Omit<LeadStep, 'label'>> = [
    {
      key: 'briefing',
      status: missing.length === 0 ? 'feito' : 'faltando',
      summary: missing.length === 0 ? 'Nome, empresa e telefone' : `Falta: ${missing.join(', ')}`,
      ...(missing.length ? { missing } : {}),
    },
    {
      key: 'dossie',
      status: dossie ? 'feito' : 'faltando',
      summary: dossie
        ? [dossie.nota ? `${dossie.nota}★` : null, Array.isArray(dossie.fotos) ? `${dossie.fotos.length} fotos` : null]
            .filter(Boolean)
            .join(' · ') || 'Consultado'
        : 'Ainda não consultado',
    },
    {
      key: 'raspagem',
      status: hasScrape ? 'feito' : hasSite ? 'faltando' : 'opcional',
      summary: hasScrape ? `${scrapedItems} itens do site` : hasSite ? 'Site não raspado' : 'Lead sem site',
    },
    {
      key: 'catalogo',
      status: catalogItems ? 'feito' : 'opcional',
      summary: catalogItems ? 'Catálogo com itens' : catalog ? 'Sem itens de catálogo' : 'Nenhum arquivo extraído',
    },
    {
      key: 'diagnostico',
      status: ad.diagnostico_ia ? 'feito' : 'faltando',
      summary: ad.diagnostico_ia ? 'Gerado' : 'Ainda não gerado',
    },
    {
      key: 'prompt',
      status: !ad.prompt_mestre ? 'faltando' : promptStale ? 'desatualizado' : 'feito',
      summary: !ad.prompt_mestre ? 'Ainda não gerado' : promptStale ? 'Dados mudaram depois do prompt' : 'Pronto para copiar',
    },
  ];

  return steps.map((s) => ({ ...s, label: STEP_LABELS[s.key] }));
}

/** Primeira etapa obrigatória que ainda precisa de trabalho; Opcional nunca é Próximo Passo. */
export function nextLeadStep(steps: LeadStep[]): LeadStep | null {
  return steps.find((s) => s.status === 'faltando' || s.status === 'desatualizado') || null;
}
