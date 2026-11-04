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

    // Se for URL encurtada (ex: maps.app.goo.gl, goo.gl ou share.google), resolve o redirecionamento
    if (trimmed.includes('goo.gl') || trimmed.includes('maps.app.goo.gl') || trimmed.includes('share.google')) {
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
 * Sintetiza opções operacionais de atendimento (entrega, consumo no local, retirada).
 */
export function synthesizeServiceModalities(place) {
  if (!place || typeof place !== 'object') {
    return {
      permite_entrega: false,
      permite_consumo_local: false,
      permite_retirada: false,
      modalidade: 'nao_informado',
    };
  }

  const delivery = Boolean(place.delivery || place.places?.delivery);
  const dineIn = Boolean(place.dineIn || place.dine_in || place.places?.dineIn);
  const takeout = Boolean(place.takeout || place.curbsidePickup || place.places?.takeout);

  let modalidade = 'nao_informado';
  if (delivery && dineIn) {
    modalidade = 'entrega_e_local';
  } else if (delivery) {
    modalidade = 'somente_entrega';
  } else if (dineIn) {
    modalidade = 'somente_local';
  } else if (takeout) {
    modalidade = 'somente_retirada';
  }

  return {
    permite_entrega: delivery,
    permite_consumo_local: dineIn,
    permite_retirada: takeout,
    modalidade,
  };
}

/**
 * Sintetiza comodidades e informações relevantes detalhadas (acessibilidade, pagamento, estacionamento, ambiente).
 */
export function synthesizeAmenitiesAndInfo(place) {
  if (!place) {
    return {
      resumo_editorial: '',
      faixa_preco: 'Não informado',
      comodidades: [],
    };
  }

  const resumo = place.editorialSummary?.text || '';

  const priceMap = {
    PRICE_LEVEL_FREE: 'Gratuito',
    PRICE_LEVEL_INEXPENSIVE: 'Econômico ($)',
    PRICE_LEVEL_MODERATE: 'Moderado ($$)',
    PRICE_LEVEL_EXPENSIVE: 'Sofisticado ($$$)',
    PRICE_LEVEL_VERY_EXPENSIVE: 'Alto Padrão ($$$$)',
  };
  const faixaPreco = priceMap[place.priceLevel] || (place.priceLevel ? 'Moderado' : 'Não informado');

  const comodidades = [];

  // Acessibilidade
  const acc = place.accessibilityOptions || {};
  if (acc.wheelchairAccessibleEntrance || acc.wheelchairAccessibleSeating || acc.wheelchairAccessibleRestroom || acc.wheelchairAccessibleParking) {
    comodidades.push('Acessível para cadeirantes');
  }

  // Meios de Pagamento
  const pay = place.paymentOptions || {};
  if (pay.acceptsCreditCards || pay.acceptsDebitCards) {
    comodidades.push('Aceita cartões de crédito/débito');
  }
  if (pay.acceptsNfc) {
    comodidades.push('Pagamento por aproximação (NFC)');
  }
  if (pay.acceptsCashOnly) {
    comodidades.push('Somente dinheiro');
  }

  // Estacionamento
  const park = place.parkingOptions || {};
  if (park.freeParkingLot || park.freeStreetParking) {
    comodidades.push('Estacionamento gratuito');
  } else if (park.paidParkingLot || park.paidStreetParking) {
    comodidades.push('Estacionamento pago');
  }
  if (park.valetParking) {
    comodidades.push('Serviço de manobrista');
  }

  // Ambiente / Instalações
  if (place.outdoorSeating) comodidades.push('Mesas ao ar livre');
  if (place.allowsDogs) comodidades.push('Pet friendly');
  if (place.reservable) comodidades.push('Aceita reservas');
  if (place.goodForChildren) comodidades.push('Bom para crianças');
  if (place.goodForGroups) comodidades.push('Bom para grupos');
  if (place.liveMusic) comodidades.push('Música ao vivo');
  if (place.restroom) comodidades.push('Banheiro no local');

  return {
    resumo_editorial: resumo,
    faixa_preco: faixaPreco,
    comodidades,
  };
}

/**
 * Consolida presença digital externa (redes sociais, diretórios, marketplaces) a partir do HTML do site e links do lead.
 */
export function extractWebResults({ html, additionalLinks = [] }) {
  const results = [];
  const seenUrls = new Set();

  function addResult(url, tipo, titulo) {
    if (!url || typeof url !== 'string') return;
    const cleanUrl = url.trim();
    if (!cleanUrl || !cleanUrl.startsWith('http')) return;
    const norm = cleanUrl.toLowerCase().replace(/\/+$/, '');
    if (seenUrls.has(norm)) return;
    seenUrls.add(norm);
    results.push({ titulo, url: cleanUrl, tipo });
  }

  // 1. Processa links informados no briefing
  if (Array.isArray(additionalLinks)) {
    for (const item of additionalLinks) {
      const url = item?.url;
      if (!url) continue;
      const label = item.label || '';
      if (url.includes('instagram.com')) addResult(url, 'instagram', 'Instagram');
      else if (url.includes('facebook.com')) addResult(url, 'facebook', 'Facebook');
      else if (url.includes('ifood.com.br')) addResult(url, 'ifood', 'iFood');
      else if (url.includes('tripadvisor')) addResult(url, 'tripadvisor', 'TripAdvisor');
      else if (url.includes('linkedin.com')) addResult(url, 'linkedin', 'LinkedIn');
      else if (url.includes('tiktok.com')) addResult(url, 'tiktok', 'TikTok');
      else if (url.includes('youtube.com')) addResult(url, 'youtube', 'YouTube');
      else if (label.toLowerCase().includes('site')) addResult(url, 'site', 'Site Oficial');
      else addResult(url, 'web', label || 'Link Web');
    }
  }

  // 2. Extrai links de redes sociais do HTML do site
  if (html && typeof html === 'string') {
    const socialPatterns = [
      { regex: /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.-]+(?:\/)?/gi, tipo: 'instagram', titulo: 'Instagram' },
      { regex: /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9_.-]+(?:\/)?/gi, tipo: 'facebook', titulo: 'Facebook' },
      { regex: /https?:\/\/(?:www\.)?ifood\.com\.br\/delivery\/[^\s"'<>]+/gi, tipo: 'ifood', titulo: 'iFood' },
      { regex: /https?:\/\/(?:www\.)?tripadvisor\.(?:com|com\.br)\/[^\s"'<>]+/gi, tipo: 'tripadvisor', titulo: 'TripAdvisor' },
      { regex: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_.-]+(?:\/)?/gi, tipo: 'linkedin', titulo: 'LinkedIn' },
      { regex: /https?:\/\/(?:www\.)?tiktok\.com\/@[a-zA-Z0-9_.-]+(?:\/)?/gi, tipo: 'tiktok', titulo: 'TikTok' },
      { regex: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|c\/|channel\/)?[a-zA-Z0-9_.-]+(?:\/)?/gi, tipo: 'youtube', titulo: 'YouTube' },
    ];

    for (const { regex, tipo, titulo } of socialPatterns) {
      const matches = html.match(regex);
      if (matches) {
        for (const m of matches) {
          if (m.includes('/sharer') || m.includes('/intent') || m.includes('/policies')) continue;
          addResult(m, tipo, titulo);
        }
      }
    }
  }

  return results;
}


/**
 * Inspeciona o site oficial do estabelecimento em busca de links de cardápio digital ou delivery.
 */
export async function extractMenuLinkAndHtml(websiteUrl) {
  if (!websiteUrl || typeof websiteUrl !== 'string') return { menuLink: null, html: null };
  const trimmed = websiteUrl.trim();
  if (!trimmed) return { menuLink: null, html: null };

  const targetUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timeoutId);

    if (!res.ok) return { menuLink: null, html: null };

    const html = await res.text();
    if (!html) return { menuLink: null, html: null };

    // 1. Procura por links de plataformas de cardápio conhecidas
    const platformMatches = html.match(
      /https?:\/\/(?:www\.)?(?:(?:[a-zA-Z0-9-]+\.)?ifood\.com\.br|(?:[a-zA-Z0-9-]+\.)?goomer\.(?:app|me)|(?:[a-zA-Z0-9-]+\.)?anota\.ai|(?:[a-zA-Z0-9-]+\.)?ola\.click|(?:[a-zA-Z0-9-]+\.)?olaclick\.com|(?:[a-zA-Z0-9-]+\.)?cardapioweb\.com|(?:[a-zA-Z0-9-]+\.)?instadelivery\.com\.br|(?:[a-zA-Z0-9-]+\.)?deliverydireto\.com\.br)[^\s"'<>]+/i
    );
    if (platformMatches && platformMatches[0]) {
      return { menuLink: platformMatches[0], html };
    }

    // 2. Procura por tags <a> com href ou texto contendo palavras-chave de cardápio
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const text = match[2].toLowerCase();

      const isMenuHref = /\/(cardapio|menu|pedir|pedidos|cardapio-digital)/i.test(href);
      const isMenuText = /(cardápio|cardapio|nosso menu|ver menu|faça seu pedido|fazer pedido|pedir online)/i.test(text);

      if (isMenuHref || isMenuText) {
        if (href.startsWith('http://') || href.startsWith('https://')) {
          return { menuLink: href, html };
        }
        try {
          const resolved = new URL(href, targetUrl).toString();
          return { menuLink: resolved, html };
        } catch {
          // ignore invalid relative url
        }
      }
    }

    return { menuLink: null, html };
  } catch (err) {
    return { menuLink: null, html: null };
  }
}

export async function extractMenuLink(websiteUrl) {
  const { menuLink } = await extractMenuLinkAndHtml(websiteUrl);
  return menuLink;
}

async function unusedOldExtractMenuLink(websiteUrl) {
  if (!websiteUrl || typeof websiteUrl !== 'string') return null;
  const trimmed = websiteUrl.trim();
  if (!trimmed) return null;

  const targetUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const html = await res.text();
    if (!html) return null;

    // 1. Procura por links de plataformas de cardápio conhecidas
    const platformMatches = html.match(
      /https?:\/\/(?:www\.)?(?:(?:[a-zA-Z0-9-]+\.)?ifood\.com\.br|(?:[a-zA-Z0-9-]+\.)?goomer\.(?:app|me)|(?:[a-zA-Z0-9-]+\.)?anota\.ai|(?:[a-zA-Z0-9-]+\.)?ola\.click|(?:[a-zA-Z0-9-]+\.)?olaclick\.com|(?:[a-zA-Z0-9-]+\.)?cardapioweb\.com|(?:[a-zA-Z0-9-]+\.)?instadelivery\.com\.br|(?:[a-zA-Z0-9-]+\.)?deliverydireto\.com\.br)[^\s"'<>]+/i
    );
    if (platformMatches && platformMatches[0]) {
      return platformMatches[0];
    }

    // 2. Procura por tags <a> com href ou texto contendo palavras-chave de cardápio
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const text = match[2].toLowerCase();

      const isMenuHref = /\/(cardapio|menu|pedir|pedidos|cardapio-digital)/i.test(href);
      const isMenuText = /(cardápio|cardapio|nosso menu|ver menu|faça seu pedido|fazer pedido|pedir online)/i.test(text);

      if (isMenuHref || isMenuText) {
        if (href.startsWith('http://') || href.startsWith('https://')) {
          return href;
        }
        try {
          const resolved = new URL(href, targetUrl).toString();
          return resolved;
        } catch {
          // ignore invalid relative url
        }
      }
    }

    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Classifica até 6 fotos entre "cardapio" e "foto_normal" via Gemini Vision de forma assíncrona.
 */
export async function classifyPhotosWithGemini(photos, apiKey) {
  if (!Array.isArray(photos) || photos.length === 0) return [];
  const safePhotos = photos.slice(0, 6).map((p, idx) => ({
    id: p.id || idx + 1,
    width: p.width,
    height: p.height,
    photo_url: p.photo_url,
    attribution: p.attribution || '',
    tipo: 'foto_normal',
  }));

  const geminiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiKey || geminiKey.includes('placeholder')) {
    return safePhotos;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const prompt = `Analise a lista das seguintes ${safePhotos.length} fotos de um estabelecimento:
${safePhotos.map((p) => `ID ${p.id}: ${p.photo_url}`).join('\n')}

Classifique cada foto pelo seu ID como "cardapio" (se for folha/página de cardápio, tabela de preços, lista de pratos com valores) ou "foto_normal" (ambiente, fachada, prato isolado/comida, decoração, equipe).
Responda EXCLUSIVAMENTE em formato JSON puro, array de objetos:
[{"id": 1, "tipo": "cardapio" | "foto_normal"}]`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) {
      return safePhotos;
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!rawText) return safePhotos;

    const parsed = JSON.parse(rawText.replace(/```(?:json)?/g, '').trim());
    if (Array.isArray(parsed)) {
      const typeMap = new Map();
      parsed.forEach((item) => {
        if (item.id && (item.tipo === 'cardapio' || item.tipo === 'foto_normal')) {
          typeMap.set(Number(item.id), item.tipo);
        }
      });

      return safePhotos.map((p) => ({
        ...p,
        tipo: typeMap.get(p.id) || 'foto_normal',
      }));
    }

    return safePhotos;
  } catch (err) {
    // Fallback garantido
    return safePhotos;
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
    // Fallback imediato
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
export async function buildLeadDossier(queryOrUrl, apiKey = process.env.GOOGLE_MAPS_API_KEY, options = {}) {
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('sua-chave') || apiKey.includes('placeholder')) {
    return {
      success: false,
      code: 'MISSING_API_KEY',
      error: 'GOOGLE_MAPS_API_KEY não configurada. Defina sua chave da Google Places API no .env para ativar o enriquecimento automático.',
      dossie: null,
    };
  }

  const cleanKey = apiKey.trim();
  let searchQuery = await extractPlaceQueryFromUrl(queryOrUrl);

  if (!searchQuery && options?.fallbackQuery) {
    searchQuery = await extractPlaceQueryFromUrl(options.fallbackQuery);
  }

  if (!searchQuery && typeof queryOrUrl === 'string' && queryOrUrl.trim()) {
    searchQuery = queryOrUrl.trim();
  }

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
      'places.delivery',
      'places.dineIn',
      'places.takeout',
      'places.curbsidePickup',
      'places.reservable',
      'places.editorialSummary',
      'places.accessibilityOptions',
      'places.paymentOptions',
      'places.parkingOptions',
      'places.outdoorSeating',
      'places.allowsDogs',
      'places.restroom',
      'places.goodForChildren',
      'places.goodForGroups',
      'places.liveMusic',
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
            published_time: rev.relativePublishTimeDescription || '',
            publish_time: rev.publishTime || '',
          }))
        : [];

      // Ordenação cronológica estrita: mais recentes primeiro
      const sortedReviews = [...normalizedReviews].sort((a, b) => {
        if (!a.publish_time || !b.publish_time) return 0;
        return new Date(b.publish_time).getTime() - new Date(a.publish_time).getTime();
      });

      // Últimas avaliações com 5 estrelas (estritamente rating === 5, até 4)
      const positiveReviews = sortedReviews
        .filter((rev) => Number(rev.rating) === 5)
        .slice(0, 4)
        .map((rev) => ({
          author: rev.author_name || 'Cliente',
          rating: 5,
          text: rev.text || '',
          published_time: rev.published_time || '',
        }));

      // Últimas avaliações de desafios/dores (rating <= 3, até 2)
      const rawNegativeReviews = sortedReviews
        .filter((rev) => Number(rev.rating) <= 3)
        .slice(0, 2)
        .map((rev) => ({
          author: rev.author_name || 'Cliente',
          rating: Number(rev.rating) || 1,
          text: rev.text || '',
          published_time: rev.published_time || '',
        }));

      const doresDestaque = rawNegativeReviews.length > 0
        ? rawNegativeReviews
        : [{ author: 'Google Maps', rating: 5, text: 'Sem nenhuma avaliação negativa.' }];

      // Fotos limitadas estritamente a 6 fotos
      const rawPhotos = Array.isArray(place.photos)
        ? place.photos.slice(0, 6).map((photoRef, index) => ({
            id: index + 1,
            width: photoRef.widthPx || 1200,
            height: photoRef.heightPx || 800,
            photo_url: `https://places.googleapis.com/v1/${photoRef.name}/media?maxWidthPx=1200&key=${cleanKey}`,
            attribution: photoRef.authorAttributions?.[0]?.displayName || '',
            tipo: 'foto_normal',
          }))
        : [];

      // Classificação multimodal assíncrona com fallback resiliente
      const classifiedPhotos = await classifyPhotosWithGemini(rawPhotos, cleanKey);

      // Link do cardápio e HTML do website oficial
      const { menuLink, html: siteHtml } = await extractMenuLinkAndHtml(place.websiteUri);

      // Modalidades de atendimento (entrega, local, retirada)
      const modalidadesAtendimento = synthesizeServiceModalities(place);

      // Comodidades e informações relevantes
      const informacoesRelevantes = synthesizeAmenitiesAndInfo(place);

      // Resultados da web (presença digital consolidada)
      const resultadosWeb = extractWebResults({
        html: siteHtml,
        additionalLinks: options.additionalLinks || [],
      });

      const sentiment = await synthesizeSentimentAndPitch({
        name: verifiedName,
        rating: place.rating,
        user_ratings_total: place.userRatingCount,
        reviews: normalizedReviews,
        types: place.types,
        address: place.formattedAddress,
      });

      const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || '';

      const dossie = {
        place_id: placeId,
        nome_verificado: verifiedName,
        endereco_formatado: place.formattedAddress || '',
        telefone_estabelecimento: phone,
        telefone: phone,
        site_oficial: place.websiteUri || '',
        link_cardapio: menuLink || null,
        modalidades_atendimento: modalidadesAtendimento,
        informacoes_relevantes: informacoesRelevantes,
        resultados_web: resultadosWeb,
        avaliacoes_positivas: positiveReviews,
        dores_destaque: doresDestaque,
        google_maps_url: place.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
        nota: place.rating || null,
        total_avaliacoes: place.userRatingCount || 0,
        horarios_funcionamento: place.regularOpeningHours?.weekdayDescriptions || [],
        aberto_agora: Boolean(place.regularOpeningHours?.openNow),
        fotos: classifiedPhotos,
        categorias: place.types || [],
        rating_score: place.rating || null,
        total_reviews: place.userRatingCount || sortedReviews.length,
        pitch_comercial_sugerido: sentiment.pitch_comercial_sugerido,
        nicho_detectado: sentiment.nicho_detectado,
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
      'delivery',
      'dine_in',
      'takeout',
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

    const normalizedReviews = Array.isArray(placeDetails.reviews)
      ? placeDetails.reviews.map((rev) => ({
          author_name: rev.author_name || 'Cliente',
          rating: rev.rating || 5,
          text: rev.text || '',
          published_time: rev.relative_time_description || '',
        }))
      : [];

    const positiveReviews = normalizedReviews
      .filter((rev) => Number(rev.rating) >= 4)
      .slice(0, 4)
      .map((rev) => ({
        author: rev.author_name || 'Cliente',
        rating: Number(rev.rating) || 5,
        text: rev.text || '',
      }));

    // Fotos limitadas a 6 fotos
    const rawPhotos = Array.isArray(placeDetails.photos)
      ? placeDetails.photos.slice(0, 6).map((photoRef, index) => ({
          id: index + 1,
          width: photoRef.width,
          height: photoRef.height,
          photo_url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${photoRef.photo_reference}&key=${cleanKey}`,
          attribution: photoRef.html_attributions?.[0] || '',
          tipo: 'foto_normal',
        }))
      : [];

    const classifiedPhotos = await classifyPhotosWithGemini(rawPhotos, cleanKey);
    const menuLink = await extractMenuLink(placeDetails.website);
    const modalidadesAtendimento = synthesizeServiceModalities(placeDetails);

    const sentiment = await synthesizeSentimentAndPitch({
      name: placeDetails.name,
      rating: placeDetails.rating,
      user_ratings_total: placeDetails.user_ratings_total,
      reviews: normalizedReviews,
      types: placeDetails.types,
      address: placeDetails.formatted_address,
    });

    const legacyPhone = placeDetails.formatted_phone_number || placeDetails.international_phone_number || '';

    const dossie = {
      place_id: placeId,
      nome_verificado: placeDetails.name,
      endereco_formatado: placeDetails.formatted_address || '',
      telefone_estabelecimento: legacyPhone,
      telefone: legacyPhone,
      site_oficial: placeDetails.website || '',
      link_cardapio: menuLink || null,
      modalidades_atendimento: modalidadesAtendimento,
      avaliacoes_positivas: positiveReviews,
      google_maps_url: placeDetails.url || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
      nota: placeDetails.rating || null,
      total_avaliacoes: placeDetails.user_ratings_total || 0,
      horarios_funcionamento: placeDetails.opening_hours?.weekday_text || [],
      aberto_agora: Boolean(placeDetails.opening_hours?.open_now),
      fotos: classifiedPhotos,
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
