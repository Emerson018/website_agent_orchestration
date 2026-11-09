import { cleanApiKey, defaultGeminiApiKey, fileUrlToInlinePart, generateGeminiContent } from './gemini_client.js';

// Linha que marca uma extração sem itens; o Prompt Mestre usa para decidir pelos marcadores
export const NO_CATALOG_ITEMS_LINE = 'Nenhum item de catálogo encontrado nos arquivos.';

/** Prompt que pede ao Gemini o Catálogo Extraído em markdown com estrutura fixa. */
export function buildCatalogExtractionPrompt({ companyName }) {
  return `Você é um especialista em catalogação de produtos e serviços para sites.
Os arquivos anexados (fotos ou PDFs) foram enviados pelo operador e pertencem a "${companyName || 'o estabelecimento'}".
Podem ser cardápios, tabelas de preço, catálogos, folhetos ou qualquer outro material. O estabelecimento pode ser de qualquer tipo de negócio: restaurante, loja, prestador de serviços, clínica, etc.

Sua tarefa é transcrever TODAS as informações contidas nos arquivos, organizadas para alimentar a seção de catálogo de um site.

Responda SOMENTE com markdown, exatamente nesta estrutura:

## Informações Gerais
- **Nome:** ...
- **Contato:** ...
- **Endereço:** ...
- **Horários:** ...
- **Formas de pagamento:** ...
- (outras informações gerais que aparecerem, como taxa de entrega ou área atendida)

## <Categoria>
### <Item>
- **Descrição:** ...
- **Preço:** ...
- **Variações/Tamanhos:** ...
- **Adicionais:** ...
- **Observações:** ...

Repita "## <Categoria>" para cada grupo de itens (ex: Pizzas, Bebidas, Serviços de Corte, Planos) e "### <Item>" para cada item dentro dele, usando os nomes como aparecem nos arquivos.

Regras:
- Use apenas o que está nos arquivos. Nunca invente itens, preços, descrições ou informações.
- Quando uma informação não aparecer, omita o campo inteiro (a linha toda), inclusive em Informações Gerais.
- Quando um trecho estiver ilegível, escreva [ilegível] no lugar dele.
- Mantenha os preços exatamente como escritos nos arquivos (ex: R$ 48,00).
- Junte numa só estrutura o conteúdo de todos os arquivos; não repita categorias nem itens que aparecem em mais de um arquivo.
- Se os arquivos não tiverem nenhum item de catálogo, responda apenas a seção "## Informações Gerais" com o que encontrar, seguida da linha: ${NO_CATALOG_ITEMS_LINE}
- Não escreva introdução, comentários nem blocos de código.`;
}

/** Remove a cerca de código que o modelo às vezes coloca em volta do markdown. */
function stripCodeFence(text) {
  const trimmed = (text || '').trim();
  const fenced = trimmed.match(/^```[a-zA-Z]*\s*\n([\s\S]*?)\n?```$/);
  return (fenced ? fenced[1] : trimmed).trim();
}

/**
 * Envia os arquivos do Catálogo Extraído ao Gemini e devolve o markdown.
 * @returns {Promise<{success: true, markdown: string, model: string, processed: number} | {success: false, code: string, error: string}>}
 */
export async function extractCatalog({ files, companyName, apiKey = defaultGeminiApiKey(), models }) {
  if (!Array.isArray(files) || files.length === 0) {
    return { success: false, code: 'NO_FILES', error: 'Envie ao menos um arquivo antes de extrair o catálogo.' };
  }
  if (!cleanApiKey(apiKey)) {
    return {
      success: false,
      code: 'MISSING_API_KEY',
      error: 'Chave GEMINI_API_KEY não configurada no ambiente. Não foi possível extrair o catálogo.',
    };
  }

  const fileParts = [];
  for (const file of files) {
    const part = await fileUrlToInlinePart(file.url, { timeoutMs: 15000, fallbackMimeType: file.mime_type });
    if (part) fileParts.push(part);
  }
  if (fileParts.length === 0) {
    return { success: false, code: 'FILES_UNAVAILABLE', error: 'Não foi possível baixar nenhum dos arquivos enviados.' };
  }

  const gemini = await generateGeminiContent({
    apiKey,
    ...(models ? { models } : {}),
    parts: [{ text: buildCatalogExtractionPrompt({ companyName }) }, ...fileParts],
    generationConfig: { temperature: 0.1 },
    timeoutMs: 60000,
  });
  if (!gemini.success) return gemini;

  const markdown = stripCodeFence(gemini.text);
  if (!markdown) {
    return { success: false, code: 'EMPTY_RESPONSE', error: 'O Gemini não devolveu conteúdo para o catálogo.' };
  }
  return { success: true, markdown, model: gemini.model, processed: fileParts.length };
}

/** O Catálogo Extraído tem ao menos um item (### <Item>) e não é a resposta "sem itens". */
export function catalogHasItems(markdown) {
  const text = markdown || '';
  return /^###\s+\S/m.test(text) && !text.includes(NO_CATALOG_ITEMS_LINE);
}

/** Seção "## Informações Gerais" do Catálogo Extraído, sem a linha de controle; '' quando não houver. */
export function catalogGeneralInfo(markdown) {
  const match = (markdown || '').match(/^## Informações Gerais[ \t]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
  if (!match) return '';
  return match[1].replace(NO_CATALOG_ITEMS_LINE, '').trim();
}
