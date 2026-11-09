import {
  cleanApiKey,
  defaultGeminiApiKey,
  defaultGeminiModels,
  fileUrlToInlinePart,
  generateGeminiContent,
} from './gemini_client.js';

/**
 * Constrói o Prompt Mestre em 4 blocos para geração do site do zero,
 * integrando dados do Google Maps e produtos/institucional raspados com Scrapling.
 */
export function buildMasterPrompt({
  companyName,
  dossie,
  diagnostico,
  scrapedData,
  mapsUrl,
}) {
  const notaStr = dossie?.nota ? `${dossie.nota.toFixed(1)}★ (${dossie.total_avaliacoes || 0} avaliações)` : 'Excelente reputação local';
  const endereco = dossie?.endereco_formatado || 'Consulte localização';
  const telefone = dossie?.telefone || '';
  const nicho = dossie?.nicho_detectado || 'Serviços Especializados';
  const horarios = Array.isArray(dossie?.horarios_funcionamento) && dossie.horarios_funcionamento.length > 0
    ? dossie.horarios_funcionamento.join(' | ')
    : 'Segunda a Sábado';

  const mapsLink =
    dossie?.google_maps_url ||
    dossie?.maps_url ||
    (typeof mapsUrl === 'string' && mapsUrl ? mapsUrl : null) ||
    '';

  const elogios = Array.isArray(dossie?.elogios_destaque) && dossie.elogios_destaque.length > 0
    ? dossie.elogios_destaque.map((e) => `• "${e.text}" (${e.author})`).join('\n')
    : '• Atendimento de alto padrão reconhecido pelos clientes.';

  const diferenciais = Array.isArray(diagnostico?.diferenciais_unicos) && diagnostico.diferenciais_unicos.length > 0
    ? diagnostico.diferenciais_unicos.map((d) => `- ${d}`).join('\n')
    : `- Especialistas em ${nicho}\n- Atendimento humanizado e ágil`;

  // Bloco de Cardápio e Produtos reais capturados pelo Scrapling
  let blocoProdutosScraped = '';
  const produtos = scrapedData?.cardapio || [];
  if (Array.isArray(produtos) && produtos.length > 0) {
    const itensLines = produtos.slice(0, 30).map((it) => {
      const precoStr = it.preco ? ` | **${it.preco}**` : '';
      const descStr = it.descricao ? ` - ${it.descricao}` : '';
      return `• **${it.nome}**${precoStr}${descStr}`;
    }).join('\n');

    blocoProdutosScraped = `
---

### BLOCO DE PRODUTOS & CATÁLOGO OFICIAL (EXTRAÍDO COM SCRAPLING)
O projeto DEVE estruturar e exibir os itens e preços reais abaixo em sua seção de catálogo/cardápio, sem omitir ou inventar valores:
${itensLines}
`;
  }

  // Textos institucionais oficiais coletados do site do cliente
  let blocoInstitucionalScraped = '';
  const instSobre = scrapedData?.institucional?.sobre;
  const instServicos = scrapedData?.institucional?.servicos;
  if (instSobre || (Array.isArray(instServicos) && instServicos.length > 0)) {
    const servicosLines = Array.isArray(instServicos) && instServicos.length > 0
      ? `\n- **Especialidades & Serviços Informados no Site:**\n${instServicos.map((s) => `  • ${s}`).join('\n')}`
      : '';
    const sobreText = instSobre ? `\n- **História & Posicionamento Oficial do Site:**\n  "${instSobre}"` : '';
    blocoInstitucionalScraped = `${sobreText}${servicosLines}`;
  }

  return `# BRIEFING MESTRE DO PROJETO & ARQUITETURA DE EXECUÇÃO

Este documento é a Fonte da Verdade (Single Source of Truth) sobre o negócio do cliente, seus dados verificados e as regras técnicas do projeto. 

O desenvolvimento será conduzido no Antigravity através de um pipeline de Skills especializadas:
1. **Liderança de Engenharia (\`mattpocock/skills\`):** Responsável por transformar este documento em especificação técnica (\`/to-spec\`), fatiar em tarefas lógicas (\`/to-tickets\`) e coordenar a implementação (\`/implement\`) e revisão (\`/code-review\`).
2. **Direção de Arte & UI (\`impeccable\`):** Responsável por ler a essência do negócio (Bloco 1 e Bloco 3) e decidir de forma autônoma a tipografia, o sistema de grid, a composição do layout e a hierarquia visual, consolidando tudo no arquivo \`DESIGN.md\`.
3. **Engenharia de Motion (\`emilkowalski/skills\`):** Responsável por analisar a interface pronta e aplicar micro-interações, física de animação e fluidez na etapa de acabamento (\`emil-design-eng\`, \`animate\`).

---

### BLOCO 1: IDENTIDADE, POSICIONAMENTO & ESSÊNCIA DO NEGÓCIO
- **Nome da Empresa:** ${companyName}
- **O que a empresa realmente é:** ${diagnostico?.resumo_empresa || `Estabelecimento consolidado no segmento de ${nicho}.`}
- **Atmosfera & Personalidade da Marca:** ${diagnostico?.estilo_visual_vibe || 'Design contemporâneo, sofisticado e acolhedor, refletindo a energia autêntica do espaço físico.'}
- **Público-Alvo Primário:** ${diagnostico?.publico_alvo || 'Clientes locais que valorizam qualidade, pontualidade e experiência personalizada.'}
- **Diferenciais Competitivos:**
${diferenciais}${blocoInstitucionalScraped}

---

### BLOCO 2: DADOS & ATIVOS VERIFICADOS (GOOGLE MAPS) — REGRAS ESTRITAS
- **Reputação Comprovada:** ${notaStr}
- **Localização / Endereço:** ${endereco}
- **Link Oficial do Google Maps (Perfil do Cliente):** ${mapsLink || 'Não informado'}
- **Regra Inegociável para Links de Mapas:** Todos os links, botões e ações de "Como Chegar", "Ver no Google Maps", "Localização" ou clique no endereço no site DEVEM direcionar ESTRITAMENTE para o link oficial do Google Maps acima (${mapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(companyName + ' ' + endereco)}`}), e NUNCA para o endereço em texto ou buscas genéricas.
- **Contato / WhatsApp:** ${telefone || 'Informado no atendimento'}
- **Horários de Operação:** ${horarios}
- **Prova Social Real (Depoimentos Verificados):**
${elogios}
${blocoProdutosScraped}
---

### BLOCO 3: INSUMOS CRIATIVOS (DELEGAÇÃO PARA AS SKILLS DE DESIGN & MOTION)
*Atenção Agente: NENHUM layout, fonte ou estrutura de grid está pré-fixado neste briefing. As decisões de UI/UX pertencem exclusivamente às skills de design instaladas.*

- **Referência de Território Cromatico (Extraído da Marca):** ${diagnostico?.paleta_cores_sugerida || 'Tons primários inspirados na decoração real do local, com contraste alto para leitura e toques refinados para botões de ação.'} *(O Impeccable deve usar esta referência como base para expandir e estruturar os tokens semânticos de cor, contraste e superfície no \`DESIGN.md\`).*
- **Autonomia de Tipografia e Layout (Skill \`impeccable\`):** Com base no nicho de **${companyName}**, na atmosfera descrita no Bloco 1 e no público-alvo, utilize as diretrizes do Impeccable para escolher o par tipográfico ideal, a densidade de informação, o estilo de componentes e a composição espacial que melhor convertam este público, fugindo de qualquer aparência de template genérico de IA.
- **Autonomia de Interação e Movimento (Skills \`emilkowalski\`):** O ritmo das transições, micro-interações de hover/tap e animações de entrada devem ser definidos pelas skills de Design Engineering do Emil Kowalski de acordo com a personalidade da marca (ex: mais contido e elegante, ou mais energético e tátil).

---

### BLOCO 4: DIRETRIZES TÉCNICAS E METODOLOGIA DE CONSTRUÇÃO
- **Stack Tecnológica:** React (Vite), Tailwind CSS, Lucide Icons e Framer Motion (para execução das skills de animação).
- **Fidelidade de Conteúdo:** É proibido o uso de textos genéricos (Lorem Ipsum) ou placeholders de outros nichos. Toda a copy, chamadas e seções devem refletir a realidade operacional de **${companyName}**.
- **Foco em Conversão:** O Call-to-Action (CTA) primário em todo o fluxo deve conduzir o usuário ao WhatsApp oficial (${telefone || 'definido no atendimento'}) com uma mensagem pré-preenchida e contextualizada para o negócio.
- **Qualidade de Entrega:** Código modular, semântica HTML rigorosa, acessibilidade e responsividade mobile-first validada.
`;
}

/**
 * Executa o Diagnóstico Multimodal de Negócio usando a API do Gemini Vision
 */
export async function runMultimodalBusinessDiagnosis({
  dossie,
  companyName,
  scrapedData,
  mapsUrl,
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
      code: 'AI_DIAGNOSIS_FAILED',
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

    const promptMestre = buildMasterPrompt({
      companyName,
      dossie,
      diagnostico: diagnosticoFinal,
      scrapedData,
      mapsUrl: mapsLink,
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
