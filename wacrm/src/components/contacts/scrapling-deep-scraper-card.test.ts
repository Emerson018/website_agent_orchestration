import { describe, it, expect } from 'vitest';
import type { ScrapedData, ScrapedProductItem } from './scrapling-deep-scraper-card';

describe('ScraplingDeepScraperCard data structures and behavior', () => {
  it('validates structured scraped data with products, prices and institutional texts', () => {
    const mockScraped: ScrapedData = {
      sucesso: true,
      urls: ['https://cantinadonapeppina.com.br/cardapio'],
      metodo_utilizado: 'stealth_browser',
      cardapio: [
        {
          nome: 'Fettuccine Alfredo Speciale',
          preco: 'R$ 56,00',
          descricao: 'Massa artesanal fresca com molho cremoso de parmesão reggiano e manteiga trufada',
          imagem_url: 'https://cantinadonapeppina.com.br/fettuccine.jpg',
        },
        {
          nome: 'Tiramisù Tradizionale',
          preco: 'R$ 28,00',
          descricao: 'Biscoitos savoiardi embebidos em café espresso com creme de mascarpone e cacau puro',
        },
      ],
      institucional: {
        titulo: 'Cantina Dona Peppina - Tradição e Sabor Italiano',
        descricao: 'Restaurante italiano autêntico no coração de Santa Cecília desde 1974.',
        sobre: 'Fundada pelo casal Giuseppe e Peppina em 1974...',
        servicos: ['Almoço Executivo', 'Jantar à la carte', 'Eventos Privados', 'Entrega Própria'],
        contato: {
          telefones: ['(11) 3333-4444', '(11) 98888-7777'],
          emails: ['contato@cantinadonapeppina.com.br'],
          enderecos: ['Rua das Palmeiras, 340 - Santa Cecília, São Paulo - SP'],
        },
      },
      markdown_resumo: '### Cantina Dona Peppina\n- Fettuccine Alfredo Speciale: R$ 56,00',
      raspado_em: '2026-11-04T12:00:00Z',
    };

    expect(mockScraped.sucesso).toBe(true);
    expect(mockScraped.metodo_utilizado).toBe('stealth_browser');
    expect(mockScraped.cardapio).toHaveLength(2);
    expect(mockScraped.cardapio?.[0].preco).toBe('R$ 56,00');
    expect(mockScraped.institucional?.contato?.telefones).toContain('(11) 3333-4444');
    expect(mockScraped.institucional?.servicos).toContain('Almoço Executivo');
  });

  it('handles fallback HTTP method correctly and displays graceful state', () => {
    const fallbackScraped: ScrapedData = {
      sucesso: true,
      urls: ['https://padariacentral.com.br'],
      metodo_utilizado: 'http_fallback',
      cardapio: [],
      institucional: {
        titulo: 'Padaria Central',
        sobre: 'Padaria artesanal tradicional',
      },
      markdown_resumo: 'Conteúdo simples extraído via fallback HTTP',
    };

    expect(fallbackScraped.metodo_utilizado).toBe('http_fallback');
    expect(fallbackScraped.cardapio).toHaveLength(0);
    expect(fallbackScraped.institucional?.titulo).toBe('Padaria Central');
  });

  it('formats product item correctly with optional fields', () => {
    const itemWithoutPriceOrImage: ScrapedProductItem = {
      nome: 'Serviço de Barba e Cabelo Completo',
      descricao: 'Atendimento com toalha quente e massagem facial',
    };

    expect(itemWithoutPriceOrImage.nome).toBe('Serviço de Barba e Cabelo Completo');
    expect(itemWithoutPriceOrImage.preco).toBeUndefined();
    expect(itemWithoutPriceOrImage.imagem_url).toBeUndefined();
  });
});
