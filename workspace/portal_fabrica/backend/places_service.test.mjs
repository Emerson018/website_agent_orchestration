import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractPlaceQueryFromUrl,
  synthesizeSentimentAndPitch,
  buildLeadDossier,
} from './places_service.js';

test('places_service - extractPlaceQueryFromUrl extracts names accurately', async () => {
  assert.equal(await extractPlaceQueryFromUrl('Pizzaria Dom Corleone'), 'Pizzaria Dom Corleone');

  const placeUrl = 'https://www.google.com/maps/place/Barbearia+Vip+Cortes/@-30.034,-51.217,17z/data=!3m1!4b1';
  assert.equal(await extractPlaceQueryFromUrl(placeUrl), 'Barbearia Vip Cortes');

  const searchUrl = 'https://maps.google.com/?q=Restaurante+Sabor+do+Sul+Porto+Alegre';
  assert.equal(await extractPlaceQueryFromUrl(searchUrl), 'Restaurante Sabor do Sul Porto Alegre');
});

test('places_service - synthesizeSentimentAndPitch classifies reviews and generates pitch', async () => {
  const mockReviews = [
    { author_name: 'Lucas', rating: 5, text: 'Melhor corte de cabelo da cidade! Atendimento nota 10.' },
    { author_name: 'Carlos', rating: 2, text: 'Demorou mais de 45 minutos para ser atendido mesmo com horário marcado.' },
    { author_name: 'Ana', rating: 4, text: 'Ambiente agradável e café cortesia.' },
    { author_name: 'Marcos', rating: 1, text: 'Falta de cardápio digital, não aceita agendamento fácil.' },
  ];

  const result = await synthesizeSentimentAndPitch({
    name: 'Barbearia Modelo',
    rating: 4.1,
    user_ratings_total: 48,
    reviews: mockReviews,
    types: ['hair_care', 'point_of_interest'],
    address: 'Av. Paulista, 1000 - SP',
  });

  assert.equal(result.total_reviews, 48);
  assert.equal(result.elogios_destaque.length, 2);
  assert.equal(result.dores_destaque.length, 2);
  assert.equal(result.nicho_detectado, 'hair_care');

  assert.ok(result.pitch_comercial_sugerido.includes('Barbearia Modelo'));
  assert.ok(result.pitch_comercial_sugerido.includes('desafios'));
});

test('places_service - buildLeadDossier gracefully warns when API key is missing', async () => {
  const result = await buildLeadDossier('Barbearia Teste', '');
  assert.equal(result.success, false);
  assert.equal(result.code, 'MISSING_API_KEY');
  assert.ok(result.error.includes('GOOGLE_MAPS_API_KEY não configurada'));
});
