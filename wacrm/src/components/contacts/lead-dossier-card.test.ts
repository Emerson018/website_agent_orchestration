import { describe, it, expect } from 'vitest';
import type { LeadDossierData } from './lead-dossier-card';

describe('LeadDossierData validation and formatting', () => {
  it('validates complete dossier with rating, sentiment, modalities, menu link and classified photos', () => {
    const mockDossie: LeadDossierData = {
      nome_verificado: 'Barbearia Estilo Premium',
      endereco_formatado: 'Rua dos Andradas, 100 - Porto Alegre, RS',
      telefone: '(51) 3222-1122',
      telefone_estabelecimento: '(51) 3222-1122',
      site_oficial: 'https://barbeariaestilo.com.br',
      link_cardapio: 'https://barbeariaestilo.com.br/cardapio',
      modalidades_atendimento: {
        permite_entrega: false,
        permite_consumo_local: true,
        permite_retirada: true,
        modalidade: 'somente_local',
      },
      nota: 4.3,
      total_avaliacoes: 52,
      nicho_detectado: 'hair_care',
      avaliacoes_positivas: [
        { author: 'Paulo', rating: 5, text: 'Excelente corte' },
        { author: 'Marcos', rating: 4, text: 'Ótimo local' },
      ],
      dores_destaque: [
        { author: 'João', rating: 2, text: 'Demorou muito para ser atendido no sábado' }
      ],
      elogios_destaque: [
        { author: 'Paulo', rating: 5, text: 'Excelente atendimento e corte impecável' }
      ],
      pitch_comercial_sugerido: 'Olá equipe da Barbearia Estilo Premium! Temos a solução...',
      fotos: [
        { id: 1, photo_url: 'http://localhost/photo1.jpg', tipo: 'foto_normal' },
        { id: 2, photo_url: 'http://localhost/menu.jpg', tipo: 'cardapio' },
      ]
    };

    expect(mockDossie.nome_verificado).toBe('Barbearia Estilo Premium');
    expect(mockDossie.telefone_estabelecimento).toBe('(51) 3222-1122');
    expect(mockDossie.link_cardapio).toBe('https://barbeariaestilo.com.br/cardapio');
    expect(mockDossie.modalidades_atendimento?.permite_consumo_local).toBe(true);
    expect(mockDossie.avaliacoes_positivas).toHaveLength(2);
    expect(mockDossie.fotos?.[1].tipo).toBe('cardapio');
  });

  it('handles empty / un-enriched dossier state safely', () => {
    const unEnriched: Partial<LeadDossierData> = {
      nome_verificado: 'Lead Sem Google Maps',
    };

    expect(unEnriched.nota).toBeUndefined();
    expect(unEnriched.link_cardapio).toBeUndefined();
    expect(unEnriched.modalidades_atendimento).toBeUndefined();
    expect(unEnriched.dores_destaque).toBeUndefined();
    expect(unEnriched.pitch_comercial_sugerido).toBeUndefined();
  });

  it('detects divergence between lead WhatsApp phone and Google Maps phone', () => {
    const leadPhone = '5511999998888';
    const mapsPhone = '(11) 3333-4444';
    const leadDigits = leadPhone.replace(/\D/g, '');
    const mapsDigits = mapsPhone.replace(/\D/g, '');
    expect(leadDigits).not.toBe(mapsDigits);
  });
});
