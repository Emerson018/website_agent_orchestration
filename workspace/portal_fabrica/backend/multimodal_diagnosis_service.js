import fetch from 'node-fetch';

/**
 * Converte uma URL de foto em base64 inlineData para o Gemini Vision
 */
async function fetchPhotoAsBase64(photoUrl, timeoutMs = 3500) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(photoUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = res.headers.get('content-type') || 'image/jpeg';
    return {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: mimeType.split(';')[0],
      },
    };
  } catch (err) {
    return null;
  }
}

/**
 * Constrói o Prompt Mestre em 4 blocos para geração do site do zero
 */
export function buildMasterPrompt({
  companyName,
  dossie,
  diagnostico,
}) {
  const notaStr = dossie?.nota ? `${dossie.nota.toFixed(1)}★ (${dossie.total_avaliacoes || 0} avaliações)` : 'Excelente reputação local';
  const endereco = dossie?.endereco_formatado || 'Consulte localização';
  const telefone = dossie?.telefone || '';
  const nicho = dossie?.nicho_detectado || 'Serviços Especializados';
  const horarios = Array.isArray(dossie?.horarios_funcionamento) && dossie.horarios_funcionamento.length > 0
    ? dossie.horarios_funcionamento.join(' | ')
    : 'Segunda a Sábado';

  const elogios = Array.isArray(dossie?.elogios_destaque) && dossie.elogios_destaque.length > 0
    ? dossie.elogios_destaque.map((e) => `• "${e.text}" (${e.author})`).join('\n')
    : '• Atendimento de alto padrão reconhecido pelos clientes.';

  const diferenciais = Array.isArray(diagnostico?.diferenciais_unicos) && diagnostico.diferenciais_unicos.length > 0
    ? diagnostico.diferenciais_unicos.map((d) => `- ${d}`).join('\n')
    : `- Especialistas em ${nicho}\n- Atendimento humanizado e ágil`;

  return `# PROMPT MESTRE DE ENGENHARIA DE SITE (GERAÇÃO 100% DO ZERO)

Atue como um Engenheiro Frontend Sênior e Diretor Criativo especializado em interfaces digitais premium e conversão direta via WhatsApp.
Sua missão é desenvolver o código completo de um site/web app profissional do zero para a empresa abaixo, SEM utilizar templates genéricos nem estruturas pré-fabricadas.

---

### BLOCO 1: IDENTIDADE & VIBE REAL DO NEGÓCIO
- **Nome da Empresa:** ${companyName}
- **O que a empresa realmente é:** ${diagnostico?.resumo_empresa || `Estabelecimento consolidado no segmento de ${nicho}.`}
- **Estilo Visual & Atmosfera:** ${diagnostico?.estilo_visual_vibe || 'Design contemporâneo, sofisticado e acolhedor, refletindo a energia autêntica do espaço físico.'}
- **Público-Alvo Primário:** ${diagnostico?.publico_alvo || 'Clientes locais que valorizam qualidade, pontualidade e experiência personalizada.'}
- **Diferenciais Competitivos:**
${diferenciais}

---

### BLOCO 2: DADOS & ATIVOS VERIFICADOS (GOOGLE MAPS)
- **Reputação Comprovada:** ${notaStr}
- **Localização / Endereço:** ${endereco}
- **Contato / WhatsApp:** ${telefone || 'Informado no atendimento'}
- **Horários de Operação:** ${horarios}
- **Prova Social Real (Depoimentos Verificados):**
${elogios}

---

### BLOCO 3: DIRETRIZES DE DESIGN, CORES E TIPOGRAFIA
- **Paleta de Cores Recomendada:** ${diagnostico?.paleta_cores_sugerida || 'Tons primários inspirados na decoração real do local, com contraste alto para leitura e toques dourados/âmbar para botões de ação.'}
- **Direção Tipográfica:** Títulos marcantes e com personalidade (ex: Plus Jakarta Sans / Syne) combinados com corpo de texto neutro e ultra legível (Inter).
- **Layout & Composição:** Estrutura editorial assimétrica, hero section imersiva destacando a proposta de valor, badges de reputação em evidência e micro-interações elegantes com Framer Motion.

---

### BLOCO 4: DIRETRIZES TÉCNICAS DE CÓDIGO
- Crie o site utilizando **React (Vite), Tailwind CSS e Lucide Icons**.
- **NÃO use componentes genéricos ou placeholders de outros nichos.** Todos os textos, botões e chamadas devem ser fiéis a ${companyName}.
- O botão principal de CTA deve direcionar diretamente para o WhatsApp oficial com mensagem inicial contextualizada (ex: "Olá! Vi o site da ${companyName} e gostaria de...").
- Garanta código limpo, componentizado, com responsividade perfeita para smartphones e acessibilidade semântica.
`;
}

/**
 * Executa o Diagnóstico Multimodal de Negócio usando a API do Gemini Vision
 */
export async function runMultimodalBusinessDiagnosis({
  dossie,
  companyName,
  apiKey = process.env.GEMINI_API_KEY,
}) {
  const cleanKey = (apiKey || '').trim();

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

  // 1. Tenta carregar até 3 fotos reais em base64 para inspeção visual
  const imageParts = [];
  for (const foto of photos.slice(0, 3)) {
    if (foto.photo_url) {
      const part = await fetchPhotoAsBase64(foto.photo_url);
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

  const contents = [
    {
      role: 'user',
      parts: [
        { text: promptText },
        ...imageParts,
      ],
    },
  ];

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return {
        success: false,
        code: 'AI_DIAGNOSIS_FAILED',
        error: `A API do Google Gemini retornou erro (${res.status}): ${errBody || res.statusText}`,
      };
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
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
      modelo_utilizado: 'gemini-2.5-flash',
      fotos_analisadas: imageParts.length,
    };

    const promptMestre = buildMasterPrompt({
      companyName,
      dossie,
      diagnostico: diagnosticoFinal,
    });

    return {
      success: true,
      diagnostico: diagnosticoFinal,
      prompt_mestre: promptMestre,
    };
  } catch (err) {
    return {
      success: false,
      code: 'NETWORK_ERROR',
      error: `Não foi possível gerar o diagnóstico da IA: ${err.message}`,
    };
  }
}
