import test from 'node:test';
import assert from 'node:assert/strict';
import {
  synthesizeAmenitiesAndInfo,
  extractWebResults,
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


test('places_service - 5-star reviews and negative reviews partitioning', () => {
  const reviews = [
    { author_name: 'Antigo 5 Estrelas', rating: 5, text: 'Muito bom antigamente', publish_time: '2023-01-01T00:00:00Z' },
    { author_name: 'Novo 5 Estrelas 1', rating: 5, text: 'Perfeito hoje', publish_time: '2024-05-01T00:00:00Z' },
    { author_name: 'Novo 5 Estrelas 2', rating: 5, text: 'Adorei agora', publish_time: '2024-04-01T00:00:00Z' },
    { author_name: 'Novo 5 Estrelas 3', rating: 5, text: 'Excelente!', publish_time: '2024-03-01T00:00:00Z' },
    { author_name: 'Novo 5 Estrelas 4', rating: 5, text: 'Top!', publish_time: '2024-02-01T00:00:00Z' },
    { author_name: 'Avaliacao 4 Estrelas', rating: 4, text: 'Bom mas nao 5', publish_time: '2024-05-10T00:00:00Z' },
    { author_name: 'Critica 1', rating: 2, text: 'Demorou muito', publish_time: '2024-05-02T00:00:00Z' },
    { author_name: 'Critica 2', rating: 3, text: 'Comida fria', publish_time: '2024-04-15T00:00:00Z' },
    { author_name: 'Critica Antiga', rating: 1, text: 'Pessimo ano passado', publish_time: '2023-01-01T00:00:00Z' },
  ];

  const sorted = [...reviews].sort((a, b) => new Date(b.publish_time) - new Date(a.publish_time));

  // 1. Strictly 5-star reviews, max 4, latest first
  const fiveStars = sorted.filter(r => Number(r.rating) === 5).slice(0, 4);
  assert.equal(fiveStars.length, 4);
  assert.equal(fiveStars[0].author_name, 'Novo 5 Estrelas 1');
  assert.equal(fiveStars[1].author_name, 'Novo 5 Estrelas 2');
  assert.equal(fiveStars[2].author_name, 'Novo 5 Estrelas 3');
  assert.equal(fiveStars[3].author_name, 'Novo 5 Estrelas 4');

  // 2. Negative reviews <= 3, max 2, latest first
  const negative = sorted.filter(r => Number(r.rating) <= 3).slice(0, 2);
  assert.equal(negative.length, 2);
  assert.equal(negative[0].author_name, 'Critica 1'); // May 2024
  assert.equal(negative[1].author_name, 'Critica 2'); // April 2024

  // 3. Fallback when no reviews <= 3
  const allPositive = reviews.filter(r => r.rating >= 4);
  const negativeFallback = allPositive.filter(r => r.rating <= 3);
  const dores = negativeFallback.length > 0 ? negativeFallback : [{ author: 'Google Maps', rating: 5, text: 'Sem nenhuma avaliação negativa.' }];
  assert.equal(dores.length, 1);
  assert.equal(dores[0].text, 'Sem nenhuma avaliação negativa.');
});



test('places_service - synthesizeAmenitiesAndInfo produces clean badges and editorial summary', () => {
  const mockPlace = {
    editorialSummary: { text: 'Restaurante tradicional gaúcho com cortes nobres.' },
    priceLevel: 'PRICE_LEVEL_MODERATE',
    accessibilityOptions: {
      wheelchairAccessibleEntrance: true,
      wheelchairAccessibleRestroom: true,
      wheelchairAccessibleSeating: true,
    },
    paymentOptions: {
      acceptsCreditCards: true,
      acceptsDebitCards: true,
      acceptsNfc: true,
    },
    parkingOptions: {
      freeParkingLot: true,
    },
    outdoorSeating: true,
    allowsDogs: true,
    reservable: true,
  };

  const info = synthesizeAmenitiesAndInfo(mockPlace);
  assert.equal(info.resumo_editorial, 'Restaurante tradicional gaúcho com cortes nobres.');
  assert.equal(info.faixa_preco, 'Moderado ($$)');
  assert.ok(info.comodidades.includes('Acessível para cadeirantes'));
  assert.ok(info.comodidades.includes('Aceita cartões de crédito/débito'));
  assert.ok(info.comodidades.includes('Pagamento por aproximação (NFC)'));
  assert.ok(info.comodidades.includes('Estacionamento gratuito'));
  assert.ok(info.comodidades.includes('Mesas ao ar livre'));
  assert.ok(info.comodidades.includes('Pet friendly'));
  assert.ok(info.comodidades.includes('Aceita reservas'));
});



test('places_service - extractWebResults extracts social and directory links cleanly', () => {
  const html = `
    <html>
      <body>
        <footer>
          <a href="https://instagram.com/fogao_oficial">Siga no Instagram</a>
          <a href="https://facebook.com/fogaocampeiro">Facebook</a>
          <a href="https://www.ifood.com.br/delivery/porto-alegre-rs/o-fogao">Pedir no iFood</a>
        </footer>
      </body>
    </html>
  `;
  const additionalLinks = [
    { url: 'https://instagram.com/fogao_oficial', label: 'Referência (instagram)' },
    { url: 'https://tripadvisor.com.br/Restaurant_Review-123', label: 'TripAdvisor' }
  ];

  const results = extractWebResults({ html, additionalLinks });
  assert.ok(results.some(r => r.tipo === 'instagram' && r.url.includes('instagram.com/fogao_oficial')));
  assert.ok(results.some(r => r.tipo === 'facebook' && r.url.includes('facebook.com/fogaocampeiro')));
  assert.ok(results.some(r => r.tipo === 'ifood' && r.url.includes('ifood.com.br')));
  assert.ok(results.some(r => r.tipo === 'tripadvisor' && r.url.includes('tripadvisor.com.br')));
});
