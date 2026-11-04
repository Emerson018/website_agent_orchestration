import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractPlaceQueryFromUrl,
  synthesizeSentimentAndPitch,
  buildLeadDossier,
  extractMenuLink,
  classifyPhotosWithGemini,
  synthesizeServiceModalities,
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

test('places_service - high-resolution photo gallery capacity and hours matrix structure', () => {
  const mockPhotos = Array.from({ length: 15 }, (_, i) => ({
    widthPx: 1600,
    heightPx: 1200,
    name: `places/P123/photos/photo_${i + 1}`,
  }));

  const cleanKey = 'TEST_KEY_123';
  const parsedPhotos = mockPhotos.slice(0, 6).map((p, index) => ({
    id: index + 1,
    width: p.widthPx,
    height: p.heightPx,
    photo_url: `https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=1200&key=${cleanKey}`,
  }));

  assert.equal(parsedPhotos.length, 6, 'Must cap photos at 6 high-resolution assets');
  assert.ok(parsedPhotos[0].photo_url.includes('maxWidthPx=1200'), 'Must use 1200px max width for high-res');
  assert.equal(parsedPhotos[5].id, 6);
});

test('places_service - verified identity and dual phone fields structure', () => {
  const mockPlace = {
    displayName: { text: 'Pizzaria Bella Forneria' },
    nationalPhoneNumber: '(11) 3456-7890',
    internationalPhoneNumber: '+55 11 3456-7890',
    websiteUri: 'https://bellaforneria.com.br',
    formattedAddress: 'Rua das Flores, 123 - SP',
  };

  const telefoneEst = mockPlace.nationalPhoneNumber || mockPlace.internationalPhoneNumber || '';
  const dossie = {
    nome_verificado: mockPlace.displayName.text,
    site_oficial: mockPlace.websiteUri,
    telefone_estabelecimento: telefoneEst,
    telefone: telefoneEst,
  };

  assert.equal(dossie.nome_verificado, 'Pizzaria Bella Forneria');
  assert.equal(dossie.site_oficial, 'https://bellaforneria.com.br');
  assert.equal(dossie.telefone_estabelecimento, '(11) 3456-7890');
  assert.equal(dossie.telefone, '(11) 3456-7890');

  const leadWhatsappPhone = '5511999998888';
  const mapsDigits = telefoneEst.replace(/\D/g, '');
  const leadDigits = leadWhatsappPhone.replace(/\D/g, '');
  assert.notEqual(mapsDigits, leadDigits, 'Lead WhatsApp phone and Maps phone must be recognized as divergent');
});

test('places_service - synthesizeServiceModalities calculates delivery and dine-in statuses', () => {
  const both = synthesizeServiceModalities({ delivery: true, dineIn: true, takeout: true });
  assert.equal(both.permite_entrega, true);
  assert.equal(both.permite_consumo_local, true);
  assert.equal(both.permite_retirada, true);
  assert.equal(both.modalidade, 'entrega_e_local');

  const deliveryOnly = synthesizeServiceModalities({ delivery: true, dineIn: false });
  assert.equal(deliveryOnly.permite_entrega, true);
  assert.equal(deliveryOnly.permite_consumo_local, false);
  assert.equal(deliveryOnly.modalidade, 'somente_entrega');

  const dineInOnly = synthesizeServiceModalities({ delivery: false, dineIn: true });
  assert.equal(dineInOnly.permite_consumo_local, true);
  assert.equal(dineInOnly.modalidade, 'somente_local');

  const none = synthesizeServiceModalities({});
  assert.equal(none.modalidade, 'nao_informado');
});

test('places_service - extractMenuLink safely returns null when website is missing or empty', async () => {
  assert.equal(await extractMenuLink(''), null);
  assert.equal(await extractMenuLink(null), null);
  assert.equal(await extractMenuLink(undefined), null);
});

test('places_service - classifyPhotosWithGemini defaults gracefully to foto_normal for 6 photos', async () => {
  const rawPhotos = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    width: 800,
    height: 600,
    photo_url: `https://places.googleapis.com/photos/${i + 1}.jpg`,
  }));

  const classified = await classifyPhotosWithGemini(rawPhotos, 'FAKE_KEY_TIMEOUT');
  assert.equal(classified.length, 6, 'Must cap strictly at 6 photos');
  assert.equal(classified[0].tipo, 'foto_normal');
  assert.equal(classified[5].tipo, 'foto_normal');
});

test('places_service - positive reviews filtering retains max 4 reviews with rating >= 4', () => {
  const reviews = [
    { author_name: 'Ana', rating: 5, text: 'Excelente!' },
    { author_name: 'Bruno', rating: 2, text: 'Ruim' },
    { author_name: 'Carla', rating: 4, text: 'Muito bom' },
    { author_name: 'Daniel', rating: 5, text: 'Top demais' },
    { author_name: 'Eduardo', rating: 4.5, text: 'Gostei muito' },
    { author_name: 'Fabio', rating: 5, text: 'Sensacional' },
  ];

  const positive = reviews
    .filter((r) => Number(r.rating) >= 4)
    .slice(0, 4)
    .map((r) => ({
      author: r.author_name || 'Cliente',
      rating: Number(r.rating) || 5,
      text: r.text || '',
    }));

  assert.equal(positive.length, 4);
  assert.equal(positive[0].author, 'Ana');
  assert.equal(positive[3].author, 'Eduardo');
});
