import { describe, it, expect } from 'vitest';
import type { LeadDossierData } from './lead-dossier-card';

describe('LeadDossierData validation and formatting', () => {
  it('validates complete dossier with rating and sentiment analysis', () => {
    const mockDossie: LeadDossierData = {
      nome_verificado: 'Barbearia Estilo Premium',
      endereco_formatado: 'Rua dos Andradas, 100 - Porto Alegre, RS',
      nota: 4.3,
      total_avaliacoes: 52,
      nicho_detectado: 'hair_care',
      dores_destaque: [
        { author: 'João', rating: 2, text: 'Demorou muito para ser atendido no sábado' }
      ],
      elogios_destaque: [
        { author: 'Paulo', rating: 5, text: 'Excelente atendimento e corte impecável' }
      ],
      pitch_comercial_sugerido: 'Olá equipe da Barbearia Estilo Premium! Temos a solução...',
      fotos: [
        { id: 1, photo_url: 'http://localhost/photo1.jpg' }
      ]
    };

    expect(mockDossie.nome_verificado).toBe('Barbearia Estilo Premium');
    expect(mockDossie.nota).toBeGreaterThanOrEqual(4.0);
    expect(mockDossie.dores_destaque).toHaveLength(1);
    expect(mockDossie.elogios_destaque).toHaveLength(1);
    expect(mockDossie.pitch_comercial_sugerido).toContain('Barbearia Estilo Premium');
  });

  it('handles empty / un-enriched dossier state safely', () => {
    const unEnriched: Partial<LeadDossierData> = {
      nome_verificado: 'Lead Sem Google Maps',
    };

    expect(unEnriched.nota).toBeUndefined();
    expect(unEnriched.dores_destaque).toBeUndefined();
    expect(unEnriched.pitch_comercial_sugerido).toBeUndefined();
  });
});
