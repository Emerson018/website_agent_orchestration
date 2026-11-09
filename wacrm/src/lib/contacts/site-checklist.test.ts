import { describe, it, expect } from 'vitest';
import { computeSiteChecklist } from './site-checklist';

const byKey = (items: ReturnType<typeof computeSiteChecklist>) => Object.fromEntries(items.map((i) => [i.key, i]));

describe('Checklist de Dados do Site', () => {
  it('lists the ten items, all missing for a bare lead', () => {
    const items = computeSiteChecklist({ additional_data: {} });
    expect(items.map((i) => i.key)).toEqual([
      'nome',
      'telefone',
      'endereco',
      'maps',
      'horarios',
      'site',
      'fotos',
      'avaliacoes',
      'catalogo',
      'pagamento',
    ]);
    expect(items.every((i) => !i.present && !i.source)).toBe(true);
  });

  it('takes the business data from the Lead Briefing when there is no dossier', () => {
    const items = byKey(
      computeSiteChecklist({ company: 'Pizzaria Bella', phone: '(51) 99123-4567', website: 'https://bella.com.br', additional_data: {} })
    );
    expect(items.nome).toMatchObject({ present: true, source: 'Briefing' });
    expect(items.telefone).toMatchObject({ present: true, source: 'Briefing' });
    expect(items.site).toMatchObject({ present: true, source: 'Briefing' });
    expect(items.endereco.present).toBe(false);
  });

  it('fills the business data from the Lead Dossier', () => {
    const items = byKey(
      computeSiteChecklist({
        additional_data: {
          dossie: {
            nome_verificado: 'Pizzaria Bella',
            telefone_estabelecimento: '(51) 3222-1100',
            endereco_formatado: 'Rua das Flores, 123',
            google_maps_url: 'https://maps.google.com/?cid=1',
            horarios_funcionamento: ['Ter–Dom 18:00–23:30'],
            site_oficial: 'bella.com.br',
            fotos: [{}, {}, {}],
            avaliacoes_positivas: [{ text: 'Ótima' }, { text: 'Top' }],
            informacoes_relevantes: { comodidades: ['Aceita cartões de crédito'] },
          },
        },
      })
    );
    expect(items.nome).toMatchObject({ present: true, source: 'Google Maps' });
    expect(items.telefone).toMatchObject({ present: true, source: 'Google Maps' });
    expect(items.endereco).toMatchObject({ present: true, source: 'Google Maps' });
    expect(items.maps).toMatchObject({ present: true, source: 'Google Maps' });
    expect(items.horarios).toMatchObject({ present: true, source: 'Google Maps' });
    expect(items.site).toMatchObject({ present: true, source: 'Google Maps' });
    expect(items.fotos).toMatchObject({ present: true, source: '3 do Google Maps' });
    expect(items.avaliacoes).toMatchObject({ present: true, source: '2 do Google Maps' });
    expect(items.pagamento).toMatchObject({ present: true, source: 'Google Maps' });
  });

  it('does not count a Google Maps link as the official website', () => {
    const items = byKey(computeSiteChecklist({ website: 'https://maps.app.goo.gl/abc', additional_data: {} }));
    expect(items.site.present).toBe(false);
  });

  it('combines catalog items from the Catálogo Extraído and Deep Web Scraping', () => {
    const catalog = '## Informações Gerais\n- **Formas de pagamento:** Pix e cartão\n\n## Pizzas\n### Margherita';
    const both = byKey(
      computeSiteChecklist({
        additional_data: { catalogo_extraido: { markdown: catalog }, scraped_data: { cardapio: [{ nome: 'Calabresa' }] } },
      })
    );
    expect(both.catalogo).toMatchObject({ present: true, source: 'Catálogo Extraído + Raspagem' });
    expect(both.pagamento).toMatchObject({ present: true, source: 'Catálogo Extraído' });

    const noItems = byKey(
      computeSiteChecklist({
        additional_data: {
          catalogo_extraido: { markdown: '## Informações Gerais\n\nNenhum item de catálogo encontrado nos arquivos.' },
        },
      })
    );
    expect(noItems.catalogo.present).toBe(false);
  });
});
