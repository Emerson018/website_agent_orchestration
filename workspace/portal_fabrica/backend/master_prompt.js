import { catalogGeneralInfo, catalogHasItems } from './catalog_extraction.js';

/**
 * Prompt Mestre (GLOSSARY.md): Briefing do Negócio + Módulo do Tipo de Projeto.
 *
 * Regras:
 * - não nomeia ferramenta nem skill: descreve o trabalho e deixa a IA decidir o design;
 * - nunca inventa dado: seção sem dado fica de fora, e o que falta vai para as Pendências do Prompt;
 * - termina como Prompt de Especificação: a IA entrevista o operador antes de construir.
 */

const list = (items) => items.map((item) => `- ${item}`).join('\n');

/** Junta os fatos do lead e anota o que falta. Não inventa nada. */
function collectFacts({ companyName, dossie, diagnostico, scrapedData, mapsUrl, catalogoExtraido }) {
  const pendencias = [];
  const d = dossie || {};
  const diag = diagnostico || {};

  const mapsLink = d.google_maps_url || d.maps_url || (typeof mapsUrl === 'string' && mapsUrl) || '';
  const telefone = d.telefone || '';
  const endereco = d.endereco_formatado || '';
  const horarios = Array.isArray(d.horarios_funcionamento) ? d.horarios_funcionamento.filter(Boolean) : [];
  const nota = typeof d.nota === 'number' && d.total_avaliacoes > 0 ? `${d.nota.toFixed(1)}★ em ${d.total_avaliacoes} avaliações no Google` : '';
  const depoimentos = Array.isArray(d.elogios_destaque)
    ? d.elogios_destaque.filter((e) => e?.text).map((e) => `"${e.text}"${e.author ? ` (${e.author})` : ''}`)
    : [];
  const diferenciais = Array.isArray(diag.diferenciais_unicos) ? diag.diferenciais_unicos.filter(Boolean) : [];

  if (!telefone) pendencias.push('WhatsApp do negócio (é a ação principal do projeto)');
  if (!endereco) pendencias.push('Endereço');
  if (!mapsLink) pendencias.push('Link do perfil no Google Maps');
  if (horarios.length === 0) pendencias.push('Horários de funcionamento');
  if (!nota) pendencias.push('Nota e número de avaliações no Google');
  if (depoimentos.length === 0) pendencias.push('Depoimentos reais de clientes');

  // Catálogo: Catálogo Extraído (arquivos do cliente) e/ou itens raspados do site
  const catalogMarkdown = catalogoExtraido?.markdown || '';
  const catalogoArquivos = catalogHasItems(catalogMarkdown) ? catalogMarkdown.trim() : '';
  const infoGerais = catalogoArquivos ? '' : catalogGeneralInfo(catalogMarkdown) || '';
  const itensRaspados = (Array.isArray(scrapedData?.cardapio) ? scrapedData.cardapio : [])
    .slice(0, 30)
    .filter((it) => it?.nome)
    .map((it) => `**${it.nome}**${it.preco ? ` — ${it.preco}` : ''}${it.descricao ? `: ${it.descricao}` : ''}`);
  if (!catalogoArquivos && itensRaspados.length === 0) pendencias.push('Catálogo (itens, descrições e preços)');

  const sobreSite = scrapedData?.institucional?.sobre || '';
  const servicosSite = Array.isArray(scrapedData?.institucional?.servicos) ? scrapedData.institucional.servicos.filter(Boolean) : [];

  return {
    companyName,
    resumo: diag.resumo_empresa || '',
    atmosfera: diag.estilo_visual_vibe || '',
    publico: diag.publico_alvo || '',
    paleta: diag.paleta_cores_sugerida || '',
    diferenciais,
    sobreSite,
    servicosSite,
    telefone,
    endereco,
    mapsLink,
    horarios,
    nota,
    depoimentos,
    catalogoArquivos,
    infoGerais,
    itensRaspados,
    pendencias,
  };
}

/** Briefing do Negócio: igual em todos os Tipos de Projeto do cliente. */
function buildBriefing(f) {
  const quem = [
    f.resumo && `**O que é:** ${f.resumo}`,
    f.atmosfera && `**Atmosfera:** ${f.atmosfera}`,
    f.publico && `**Público:** ${f.publico}`,
    f.diferenciais.length > 0 && `**Diferenciais:**\n${list(f.diferenciais)}`,
    f.sobreSite && `**Como o próprio negócio se apresenta:** "${f.sobreSite}"`,
    f.servicosSite.length > 0 && `**Serviços que o negócio divulga:**\n${list(f.servicosSite)}`,
  ].filter(Boolean);

  const dados = [
    f.telefone && `**WhatsApp:** ${f.telefone}`,
    f.endereco && `**Endereço:** ${f.endereco}`,
    f.mapsLink && `**Google Maps:** ${f.mapsLink}`,
    f.horarios.length > 0 && `**Horários:**\n${list(f.horarios)}`,
    f.nota && `**Avaliação:** ${f.nota}`,
    f.depoimentos.length > 0 && `**Depoimentos reais:**\n${list(f.depoimentos)}`,
  ].filter(Boolean);

  const catalogo = [
    f.catalogoArquivos,
    f.infoGerais && `**Informações gerais:**\n${f.infoGerais}`,
    f.itensRaspados.length > 0 && `**Itens publicados no site do negócio:**\n${list(f.itensRaspados)}`,
  ].filter(Boolean);

  const regras = [
    'Use só os dados deste briefing. Não invente nota, depoimento, preço, horário, item ou número. Se faltar um dado, a seção que dependeria dele fica de fora.',
    f.mapsLink && `Toda ação de mapa ("Como chegar", "Ver no mapa", clique no endereço) abre ${f.mapsLink}.`,
    f.telefone && `A ação principal leva ao WhatsApp ${f.telefone}, com uma mensagem pronta que faça sentido para o negócio.`,
    'Guarde os dados do negócio num arquivo separado do código, `src/data/business.json`, com exatamente os dados deste briefing e o formato: `nome`, `whatsapp`, `endereco`, `mapsUrl`, `horarios[]`, `avaliacao`, `depoimentos[]`, `catalogo[{ categoria, itens[{ nome, descricao, preco }] }]`. Os outros projetos deste cliente usam o mesmo formato.',
  ].filter(Boolean);

  return [
    `## Briefing do Negócio: ${f.companyName}`,
    quem.length > 0 && `### Quem é\n${quem.join('\n')}`,
    dados.length > 0 && `### Dados verificados\n${dados.join('\n')}`,
    catalogo.length > 0 && `### Catálogo\n${catalogo.join('\n\n')}`,
    `### Regras de conteúdo\n${list(regras)}`,
    `### Tecnologia\nReact, Vite, TypeScript e Tailwind CSS, com a biblioteca Motion para as animações.`,
    `### Design\nAntes de codar, decida o design system a partir da atmosfera e do público do negócio: cores, tipografia, espaçamento, layout e movimento. Registre as decisões num \`DESIGN.md\` e entregue esse arquivo no fim, junto com o projeto.${f.paleta ? ` Referência de cores observada no negócio (só referência, não regra): ${f.paleta}.` : ''}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

const MODULES = {
  site: (f) => `## O que construir: Site
Uma landing page, uma página só, para quem procura o negócio pela primeira vez.
- Abertura que diga em uma frase o que o negócio é e leve ao WhatsApp.
- Seções, na ordem que fizer mais sentido, só quando houver dado para elas: diferenciais, catálogo, depoimentos, localização com horários.
- Mobile em primeiro lugar, acessível e rápida.${f.mapsLink ? '' : '\n- Sem link do Google Maps, não crie botão de mapa.'}`,
};

function buildEnding(pendencias) {
  const gaps =
    pendencias.length > 0
      ? `\n\n## Pendências do Prompt\nDados que faltam. Pergunte ao operador sobre eles na entrevista e nunca os preencha com texto inventado:\n${list(pendencias)}`
      : '';
  return `## Antes de construir
Não comece a construir ainda. Primeiro:
1. Entreviste o operador sobre o que estiver ambíguo ou faltando, uma pergunta por vez, até não restar dúvida.
2. Escreva uma especificação do projeto com as decisões tomadas.
3. Divida a especificação em tarefas pequenas, cada uma entregando algo que funciona.
Só depois construa, tarefa por tarefa.${gaps}`;
}

/** Prompt Mestre de um Tipo de Projeto (por enquanto, o Site). */
export function buildMasterPrompt(input, tipo = 'site') {
  const facts = collectFacts(input || {});
  const module = MODULES[tipo] || MODULES.site;
  return [`# Prompt Mestre: ${facts.companyName}`, buildBriefing(facts), module(facts), buildEnding(facts.pendencias)].join('\n\n') + '\n';
}
