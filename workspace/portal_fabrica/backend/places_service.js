import fetch from 'node-fetch';

/**
 * Normaliza e extrai o termo de busca ou nome do local a partir de uma URL do Google Maps ou texto livre.
 */
export async function extractPlaceQueryFromUrl(input) {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();

  // Se não começar com http:// ou https://, é texto livre (ex: "Barbearia Dom Porto Alegre")
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed;
  }

  try {
    let targetUrl = trimmed;

    // Se for URL encurtada (ex: maps.app.goo.gl ou goo.gl/maps), resolve o redirecionamento
    if (trimmed.includes('goo.gl') || trimmed.includes('maps.app.goo.gl')) {
      try {
        const redirectRes = await fetch(trimmed, {
          method: 'GET',
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        });
        targetUrl = redirectRes.url || trimmed;
      } catch {
        targetUrl = trimmed;
      }
    }

    const urlObj = new URL(targetUrl);

    // 1. Caso padrão: /maps/place/Nome+Do+Lugar/@lat,lng...
    const placeMatch = targetUrl.match(/\/maps\/place\/([^/@?]+)/);
    if (placeMatch && placeMatch[1]) {
      const decoded = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      return decoded;
    }

    // 2. Parâmetro de busca ?q= ou ?query=
    const qParam = urlObj.searchParams.get('q') || urlObj.searchParams.get('query');
    if (qParam) {
      return decodeURIComponent(qParam.replace(/\+/g, ' '));
    }

    // 3. /maps/search/Nome+Do+Lugar
    const searchMatch = targetUrl.match(/\/maps\/search\/([^/@?]+)/);
    if (searchMatch && searchMatch[1]) {
      return decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
    }

    return urlObj.pathname.replace(/^\/+/g, '').replace(/\//g, ' ');
  } catch (err) {
    return input;
  }
}

/**
 * Sintetiza o sentimento das avaliações e cria um pitch comercial pronto para WhatsApp.
 */
export async function synthesizeSentimentAndPitch({ name, rating, user_ratings_total, reviews, types, address }) {
  const praises = [];
  const painPoints = [];

  const safeReviews = Array.isArray(reviews) ? reviews : [];

  for (const review of safeReviews) {
    const text = (review.text || '').trim();
    if (!text) continue;
    const reviewRating = Number(review.rating) || 5;

    if (reviewRating >= 4) {
      praises.push({
        author: review.author_name || 'Cliente',
        rating: reviewRating,
        text: text.length > 220 ? text.slice(0, 220) + '...' : text,
      });
    } else {
      painPoints.push({
        author: review.author_name || 'Cliente',
        rating: reviewRating,
        text: text.length > 220 ? text.slice(0, 220) + '...' : text,
      });
    }
  }

  const primaryType = Array.isArray(types) && types.length > 0 ? types[0] : 'estabelecimento';

  // Monta gancho de vendas contextualizado padrão
  let pitch = '';
  if (painPoints.length > 0) {
    const mainPain = painPoints[0].text;
    pitch = `Olá equipe da ${name}! Analisei o perfil de vocês no Google Maps e notei uma excelente reputação média (${rating || '4.5'}★), mas percebi avaliações recentes pontuando desafios práticos (ex: "${mainPain}"). Desenvolvemos uma plataforma digital própria (PWA) pensada exatamente para agilizar o atendimento de vocês, organizar a demanda e eliminar esse atrito com os clientes. Teriam 5 minutos esta semana para eu apresentar um protótipo visual gratuito?`;
  } else {
    pitch = `Olá equipe da ${name}! Parabéns pela excelente avaliação no Google Maps (${rating || '5.0'}★ em ${user_ratings_total || 0} avaliações). Para estabelecimentos com alto padrão como o de vocês, desenvolvemos um PWA exclusivo que fideliza seus clientes diretamente pelo WhatsApp com agendamento/pedidos rápidos sem taxa de marketplace. Posso te enviar uma prévia do sistema personalizado para a ${name}?`;
  }

  // Tenta enriquecer pitch via LLM Gateway se a fábrica de IA estiver conectada
  const factoryApiUrl = process.env.SOFTWARE_FACTORY_API_URL || 'http://localhost:8000';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);
    const aiRes = await fetch(`${factoryApiUrl}/gerar-pitch-comercial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        empresa: name,
        nota: rating,
        dores: painPoints.map((p) => p.text),
        elogios: praises.map((e) => e.text),
        nicho: primaryType,
      }),
    });
    clearTimeout(timeoutId);
    if (aiRes.ok) {
      const aiData = await aiRes.json();
      if (aiData.pitch) {
        pitch = aiData.pitch;
      }
    }
  } catch {
    // Fallback imediato e resiliente para o pitch contextualizado determinístico
  }

  return {
    rating_score: rating || null,
    total_reviews: user_ratings_total || safeReviews.length,
    elogios_destaque: praises.slice(0, 5),
    dores_destaque: painPoints.slice(0, 5),
    pitch_comercial_sugerido: pitch,
    nicho_detectado: primaryType,
  };
}

/**
 * Constrói o Lead Dossier completo consultando a Google Places API oficial.
 */
export async function buildLeadDossier(queryOrUrl, apiKey = process.env.GOOGLE_MAPS_API_KEY) {
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('sua-chave') || apiKey.includes('placeholder')) {
    return {
      success: false,
      code: 'MISSING_API_KEY',
      error: 'GOOGLE_MAPS_API_KEY não configurada. Defina sua chave da Google Places API no .env para ativar o enriquecimento automático.',
      dossie: null,
    };
  }

  const cleanKey = apiKey.trim();
  const searchQuery = await extractPlaceQueryFromUrl(queryOrUrl);

  if (!searchQuery) {
    return {
      success: false,
      code: 'INVALID_QUERY',
      error: 'Não foi possível extrair o nome ou link do estabelecimento para consulta no Google Maps.',
      dossie: null,
    };
  }

  try {
    // 1. Tenta primeiro a Places API (New) v1 (https://places.googleapis.com/v1/places:searchText)
    const v1FieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.nationalPhoneNumber',
      'places.internationalPhoneNumber',
      'places.rating',
      'places.userRatingCount',
      'places.reviews',
      'places.photos',
      'places.regularOpeningHours',
      'places.websiteUri',
      'places.types',
      'places.googleMapsUri',
      'places.priceLevel',
    ].join(',');

    const v1Res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': cleanKey,
        'X-Goog-FieldMask': v1FieldMask,
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        languageCode: 'pt-BR',
      }),
    });

    const v1Data = await v1Res.json();

    if (v1Res.ok) {
      const placesList = Array.isArray(v1Data.places) ? v1Data.places : [];
      if (placesList.length === 0) {
        return {
          success: false,
          code: 'NOT_FOUND',
          error: `Nenhum estabelecimento encontrado no Google Maps para o termo: "${searchQuery}".`,
          dossie: null,
        };
      }

      const place = placesList[0];
      const placeId = place.id;
      const verifiedName = place.displayName?.text || searchQuery;

      const normalizedReviews = Array.isArray(place.reviews)
        ? place.reviews.map((rev) => ({
            author_name: rev.authorAttribution?.displayName || 'Cliente',
            rating: rev.rating || 5,
            text: rev.text?.text || rev.originalText?.text || '',
          }))
        : [];

      const photos = Array.isArray(place.photos)
        ? place.photos.slice(0, 6).map((photoRef, index) => ({
            id: index + 1,
            width: photoRef.widthPx || 800,
            height: photoRef.heightPx || 600,
            photo_url: `https://places.googleapis.com/v1/${photoRef.name}/media?maxWidthPx=800&key=${cleanKey}`,
            attribution: photoRef.authorAttributions?.[0]?.displayName || '',
          }))
        : [];

      const sentiment = await synthesizeSentimentAndPitch({
        name: verifiedName,
        rating: place.rating,
        user_ratings_total: place.userRatingCount,
        reviews: normalizedReviews,
        types: place.types,
        address: place.formattedAddress,
      });

      const dossie = {
        place_id: placeId,
        nome_verificado: verifiedName,
        endereco_formatado: place.formattedAddress || '',
        telefone: place.nationalPhoneNumber || place.internationalPhoneNumber || '',
        site_oficial: place.websiteUri || '',
        google_maps_url: place.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
        nota: place.rating || null,
        total_avaliacoes: place.userRatingCount || 0,
        horarios_funcionamento: place.regularOpeningHours?.weekdayDescriptions || [],
        aberto_agora: Boolean(place.regularOpeningHours?.openNow),
        fotos: photos,
        categorias: place.types || [],
        ...sentiment,
        consultado_em: new Date().toISOString(),
      };

      return {
        success: true,
        dossie,
      };
    }

    // 2. Fallback para Places API (Legacy) caso o projeto use apenas a API legada
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${cleanKey}&language=pt-BR`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (searchData.status === 'REQUEST_DENIED') {
      const v1ErrorMsg = v1Data?.error?.message || searchData.error_message;
      return {
        success: false,
        code: 'API_DENIED',
        error: `Acesso negado pela Google Places API: ${v1ErrorMsg || 'Chave inválida ou serviço desativado no Google Cloud.'}`,
        dossie: null,
      };
    }

    if (searchData.status === 'ZERO_RESULTS' || !searchData.results || searchData.results.length === 0) {
      return {
        success: false,
        code: 'NOT_FOUND',
        error: `Nenhum estabelecimento encontrado no Google Maps para o termo: "${searchQuery}".`,
        dossie: null,
      };
    }

    const firstResult = searchData.results[0];
    const placeId = firstResult.place_id;

    // Place Details completo (Legado)
    const detailsFields = [
      'name',
      'formatted_address',
      'formatted_phone_number',
      'international_phone_number',
      'rating',
      'user_ratings_total',
      'reviews',
      'photos',
      'opening_hours',
      'website',
      'types',
      'url',
      'price_level',
    ].join(',');

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${detailsFields}&key=${cleanKey}&language=pt-BR`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    if (detailsData.status !== 'OK' || !detailsData.result) {
      return {
        success: false,
        code: 'DETAILS_FAILED',
        error: `Falha ao obter detalhes do local no Google Maps (${detailsData.status}): ${detailsData.error_message || ''}`,
        dossie: null,
      };
    }

    const placeDetails = detailsData.result;

    // 3. Monta URLs de fotos em alta resolução (até 6 fotos)
    const photos = Array.isArray(placeDetails.photos)
      ? placeDetails.photos.slice(0, 6).map((photoRef, index) => ({
          id: index + 1,
          width: photoRef.width,
          height: photoRef.height,
          photo_url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef.photo_reference}&key=${cleanKey}`,
          attribution: photoRef.html_attributions?.[0] || '',
        }))
      : [];

    // 4. Sintetiza sentimento e pitch comercial
    const sentiment = await synthesizeSentimentAndPitch({
      name: placeDetails.name,
      rating: placeDetails.rating,
      user_ratings_total: placeDetails.user_ratings_total,
      reviews: placeDetails.reviews,
      types: placeDetails.types,
      address: placeDetails.formatted_address,
    });

    const dossie = {
      place_id: placeId,
      nome_verificado: placeDetails.name,
      endereco_formatado: placeDetails.formatted_address || '',
      telefone: placeDetails.formatted_phone_number || placeDetails.international_phone_number || '',
      site_oficial: placeDetails.website || '',
      google_maps_url: placeDetails.url || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
      nota: placeDetails.rating || null,
      total_avaliacoes: placeDetails.user_ratings_total || 0,
      horarios_funcionamento: placeDetails.opening_hours?.weekday_text || [],
      aberto_agora: Boolean(placeDetails.opening_hours?.open_now),
      fotos: photos,
      categorias: placeDetails.types || [],
      ...sentiment,
      consultado_em: new Date().toISOString(),
    };

    return {
      success: true,
      dossie,
    };
  } catch (err) {
    return {
      success: false,
      code: 'NETWORK_ERROR',
      error: `Erro ao conectar à Google Places API: ${err.message}`,
      dossie: null,
    };
  }
}
