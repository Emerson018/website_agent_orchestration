import { describe, it, expect } from 'vitest';
import { computeLeadSteps, nextLeadStep, type LeadStepsInput } from './lead-steps';

const statusOf = (input: LeadStepsInput) =>
  Object.fromEntries(computeLeadSteps(input).map((s) => [s.key, s.status]));

const ITEMS = '## Pizzas\n### Margherita\n- **Preço:** R$ 48,00';
const NO_ITEMS = '## Informações Gerais\n- **Horários:** 18h\n\nNenhum item de catálogo encontrado nos arquivos.';

const complete: LeadStepsInput = {
  name: 'Marco',
  company: 'Pizzaria Bella',
  phone: '(51) 99123-4567',
  website: 'https://bella.com.br',
  additional_data: {
    dossie: { nome_verificado: 'Pizzaria Bella', consultado_em: '2026-11-01T10:00:00Z' },
    scraped_data: { cardapio: [{ nome: 'Calabresa' }], raspado_em: '2026-11-01T10:20:00Z' },
    catalogo_extraido: { markdown: ITEMS, gerado_em: '2026-11-01T11:00:00Z' },
    diagnostico_ia: { resumo_empresa: 'Pizzaria de bairro.' },
    prompt_mestre: '# BRIEFING',
    prompt_mestre_gerado_em: '2026-11-02T09:00:00Z',
  },
};

describe('Etapas do Lead: status rules', () => {
  it('marks every step Feito for a complete lead and offers no next step', () => {
    expect(statusOf(complete)).toEqual({
      briefing: 'feito',
      dossie: 'feito',
      raspagem: 'feito',
      catalogo: 'feito',
      diagnostico: 'feito',
      prompt: 'feito',
    });
    expect(nextLeadStep(computeLeadSteps(complete))).toBeNull();
  });

  it('lists what the Lead Briefing is missing', () => {
    const steps = computeLeadSteps({ name: 'Roberto', phone: '(11) 98888-1234', additional_data: {} });
    const briefing = steps.find((s) => s.key === 'briefing')!;
    expect(briefing.status).toBe('faltando');
    expect(briefing.missing).toEqual(['empresa']);
    expect(nextLeadStep(steps)?.key).toBe('briefing');
  });

  it('makes scraping Opcional only when the lead has no site or URL', () => {
    const noSite = { name: 'A', company: 'B', phone: '1', additional_data: {} };
    expect(statusOf(noSite).raspagem).toBe('opcional');
    expect(statusOf({ ...noSite, website: 'https://b.com' }).raspagem).toBe('faltando');
    expect(statusOf({ ...noSite, additional_data: { dossie: { site_oficial: 'b.com' } } }).raspagem).toBe('faltando');
    expect(statusOf({ ...noSite, additional_data: { links: [{ url: 'https://instagram.com/b' }] } }).raspagem).toBe('faltando');
  });

  it('keeps the Catálogo Extraído Opcional unless it has items', () => {
    const base = { name: 'A', company: 'B', phone: '1' };
    expect(statusOf({ ...base, additional_data: {} }).catalogo).toBe('opcional');
    expect(statusOf({ ...base, additional_data: { catalogo_extraido: { markdown: NO_ITEMS } } }).catalogo).toBe('opcional');
    expect(statusOf({ ...base, additional_data: { catalogo_extraido: { markdown: ITEMS } } }).catalogo).toBe('feito');
  });

  it('marks the Master Prompt Desatualizado when an input changed after it was generated', () => {
    const ad = complete.additional_data!;
    const withCatalogEdit = { ...complete, additional_data: { ...ad, catalogo_extraido: { markdown: ITEMS, editado_em: '2026-11-05T00:00:00Z' } } };
    const withNewDossier = { ...complete, additional_data: { ...ad, dossie: { consultado_em: '2026-11-05T00:00:00Z' } } };
    const withNewScrape = {
      ...complete,
      additional_data: { ...ad, scraped_data: { cardapio: [{ nome: 'Calabresa' }], raspado_em: '2026-11-05T00:00:00Z' } },
    };
    for (const lead of [withCatalogEdit, withNewDossier, withNewScrape]) {
      const steps = computeLeadSteps(lead);
      expect(steps.find((s) => s.key === 'prompt')!.status).toBe('desatualizado');
      expect(nextLeadStep(steps)?.key).toBe('prompt');
    }
  });

  it('never marks a prompt Desatualizado when the prompt has no timestamp', () => {
    const ad = { ...complete.additional_data! };
    delete (ad as Record<string, unknown>).prompt_mestre_gerado_em;
    expect(statusOf({ ...complete, additional_data: { ...ad, dossie: { consultado_em: '2030-01-01T00:00:00Z' } } }).prompt).toBe('feito');
  });

  it('skips Opcional steps when picking the next step', () => {
    const steps = computeLeadSteps({
      name: 'A',
      company: 'B',
      phone: '1',
      additional_data: { dossie: { nome_verificado: 'B' } },
    });
    // sem site: raspagem opcional; catálogo opcional; o próximo obrigatório é o diagnóstico
    expect(nextLeadStep(steps)?.key).toBe('diagnostico');
  });
});
