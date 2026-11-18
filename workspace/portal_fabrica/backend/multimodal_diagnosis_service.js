import {
  cleanApiKey,
  defaultGeminiApiKey,
  defaultGeminiModels,
  fileUrlToInlinePart,
  generateGeminiContent,
} from './gemini_client.js';
import { buildMasterPrompt, buildMasterPrompts } from './master_prompt.js';

// O Prompt Mestre mora em master_prompt.js; reexportado aqui para quem já importa deste módulo.
export { buildMasterPrompt };

/**
 * Executa o Diagnóstico Multimodal de Negócio usando a API do Gemini Vision
 */
export async function runMultimodalBusinessDiagnosis({
  dossie,
  companyName,
  scrapedData,
  mapsUrl,
  catalogoExtraido,
  apiKey = defaultGeminiApiKey(),
  models = defaultGeminiModels(),
}) {
  const cleanKey = cleanApiKey(apiKey);

  // Regra estrita: fail-fast quando a chave não estiver configurada
  if (!cleanKey) {
    return {
      success: false,
      code: 'MISSING_API_KEY',
      error: 'Chave GEMINI_API_KEY não configurada no ambiente. Não foi possível gerar o diagnóstico da IA.',
    };
  }

  const photos = Array.isArray(dossie?.fotos) ? dossie.fotos : [];
  const reviews = Array.isArray(dossie?.elogios_destaque) ? dossie.elogios_destaque : [];
  const endereco = dossie?.endereco_formatado || '';
  const nicho = dossie?.nicho_detectado || 'comércio/serviço';
  const totalReviews = dossie?.total_avaliacoes || 0;
  const nota = dossie?.nota || 5.0;
  const mapsLink =
    dossie?.google_maps_url ||
    dossie?.maps_url ||
    (typeof mapsUrl === 'string' && mapsUrl ? mapsUrl : null) ||
    '';

  // 1. Tenta carregar até 3 fotos reais em base64 para inspeção visual
  const imageParts = [];
  for (const foto of photos.slice(0, 3)) {
    if (foto.photo_url) {
      const part = await fileUrlToInlinePart(foto.photo_url);
      if (part) imageParts.push(part);
    }
  }

  // 2. Monta o prompt de visão computacional e diagnóstico
  const promptText = `Você é um Diretor de Estratégia de Marca e Engenharia Reversa de Negócios.
Analise os dados reais do Google Maps e as fotos anexadas (se disponíveis) da empresa "${companyName}".

Dados do Google Maps:
- Segmento/Nicho: ${nicho}
- Nota: ${nota}★ em ${totalReviews} avaliações
- Endereço: ${endereco}
- Link Oficial do Google Maps do Cliente: ${mapsLink || 'Não informado'}
- Depoimentos reais de clientes: ${reviews.map((r) => r.text).join(' | ') || 'Não informados'}

Sua tarefa é diagnosticar com precisão extrema o que essa empresa realmente é e responder ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "resumo_empresa": "Explicação clara e envolvente de 2 a 3 frases definindo exatamente o que a empresa faz, sua categoria específica e modelo de operação.",
  "estilo_visual_vibe": "Descrição precisa da atmosfera estética (ex: rústico acolhedor com madeira e luz âmbar; minimalista clínico de alta tecnologia; bistrô parisiense intimista).",
  "publico_alvo": "Definição do perfil exato dos clientes que frequentam e compram deste local.",
  "diferenciais_unicos": [
    "Diferencial 1 elogiado pelos clientes",
    "Diferencial 2 evidente na operação",
    "Diferencial 3"
  ],
  "paleta_cores_sugerida": "Sugestão de 3 a 4 tons primários e secundários harmonizados com o local (ex: Verde floresta #1B4D3E, Dourado #D4AF37, Creme #F5F2EB)."
}

Responda APENAS o JSON válido, sem blocos de markdown adicionais.`;

  const gemini = await generateGeminiContent({
    apiKey: cleanKey,
    models,
    parts: [{ text: promptText }, ...imageParts],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
  });

  if (!gemini.success) {
    return {
      success: false,
      // Créditos, cota, bloqueio e demora mantêm o código próprio para o operador saber o que fazer
      code: gemini.code === 'GEMINI_FAILED' ? 'AI_DIAGNOSIS_FAILED' : gemini.code,
      error: gemini.error,
    };
  }

  try {
    const rawText = gemini.text || '{}';
    let diagnosticoJson = {};

    try {
      diagnosticoJson = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch {
      return {
        success: false,
        code: 'PARSE_ERROR',
        error: 'Não foi possível interpretar o JSON retornado pelo modelo de visão.',
      };
    }

    const diagnosticoFinal = {
      ...diagnosticoJson,
      gerado_em: new Date().toISOString(),
      modelo_utilizado: gemini.model,
      fotos_analisadas: imageParts.length,
    };

    // Um Prompt Mestre por Tipo de Projeto, todos do mesmo briefing (montados pelo código)
    const promptsMestre = buildMasterPrompts({
      companyName,
      dossie,
      diagnostico: diagnosticoFinal,
      scrapedData,
      mapsUrl: mapsLink,
      catalogoExtraido,
    });

    return {
      success: true,
      diagnostico: diagnosticoFinal,
      prompts_mestre: promptsMestre,
    };
  } catch (err) {
    return {
      success: false,
      code: 'NETWORK_ERROR',
      error: `Não foi possível gerar o diagnóstico da IA: ${err.message}`,
    };
  }
}
