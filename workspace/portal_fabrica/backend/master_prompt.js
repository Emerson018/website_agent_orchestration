import { catalogGeneralInfo, catalogHasItems } from './catalog_extraction.js';
import { PROJECT_TYPE_KEYS, projectTypeKeysFromLabels } from './project_types.js';

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
function collectFacts({ companyName, dossie, diagnostico, scrapedData, mapsUrl, catalogoExtraido, designDoCliente, tiposProjeto }) {
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

  // Nomes dos itens/serviços conhecidos (catálogo, site), sem repetição: a Agenda pergunta a duração de cada um
  const nomesItens = [
    ...new Set([
      ...[...catalogoArquivos.matchAll(/^###\s+(.+)$/gm)].map((m) => m[1].trim()),
      ...(Array.isArray(scrapedData?.cardapio) ? scrapedData.cardapio : []).map((it) => it?.nome).filter(Boolean),
      ...servicosSite,
    ]),
  ];

  return {
    companyName,
    // Design do Cliente: o DESIGN.md do primeiro projeto deste cliente, colado pelo operador no WACRM
    designDoCliente: typeof designDoCliente === 'string' ? designDoCliente.trim() : '',
    // Tipos de Projeto que o cliente pediu, como chaves ("agenda"); o contato guarda os rótulos ("Agenda")
    tiposProjeto: projectTypeKeysFromLabels(tiposProjeto),
    resumo: diag.resumo_empresa || '',
    atmosfera: diag.estilo_visual_vibe || '',
    publico: diag.publico_alvo || '',
    paleta: diag.paleta_cores_sugerida || '',
    diferenciais,
    sobreSite,
    servicosSite,
    nomesItens,
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

/**
 * Design: com Design do Cliente, os projetos seguem o design que o primeiro projeto definiu (para poderem
 * ser conectados); sem ele, a IA decide o design e entrega o DESIGN.md para o operador guardar.
 */
function buildDesignSection(f) {
  if (f.designDoCliente) {
    return `### Design
Este cliente já tem um design, definido no primeiro projeto feito para ele. Siga este design à risca: cores, tipografia, espaçamento, layout, componentes e movimento. Não crie um design novo; se faltar alguma decisão, siga o espírito do que está aqui.

${f.designDoCliente}`;
  }
  return `### Design
Antes de codar, decida o design system a partir da atmosfera e do público do negócio: cores, tipografia, espaçamento, layout e movimento. Registre as decisões num \`DESIGN.md\` e entregue esse arquivo no fim, junto com o projeto.${f.paleta ? ` Referência de cores observada no negócio (só referência, não regra): ${f.paleta}.` : ''}`;
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
    buildDesignSection(f),
  ]
    .filter(Boolean)
    .join('\n\n');
}

// Módulo do Tipo de Projeto: o que construir, e o que falta só para este tipo
const MODULES = {
  site: (f) => ({
    texto: `## O que construir: Site
Uma landing page, uma página só, para quem procura o negócio pela primeira vez.
- Abertura que diga em uma frase o que o negócio é e leve ao WhatsApp.
- Seções, na ordem que fizer mais sentido, só quando houver dado para elas: diferenciais, catálogo, depoimentos, localização com horários.
- Mobile em primeiro lugar, acessível e rápida.${f.mapsLink ? '' : '\n- Sem link do Google Maps, não crie botão de mapa.'}`,
    pendencias: [],
  }),
  agenda: (f) => ({
    texto: `## O que construir: Agenda
Um agendamento online para os clientes do negócio, com um painel para o dono.
- O cliente escolhe o serviço, o dia e um horário livre, e informa nome e WhatsApp.
- O dono entra num painel com login, vê os agendamentos e confirma ou cancela cada um.
- A confirmação ao cliente sai por um link do WhatsApp com a mensagem pronta, sem API paga.
- Os serviços e os horários de atendimento vêm dos dados do negócio; horário ocupado não aparece como livre.
- Sem pagamento online e com um profissional só, a menos que os dados do negócio mostrem mais de um.
- Os dados ficam no Supabase (banco e login do dono), no mesmo projeto Supabase de todos os projetos deste cliente: use o projeto existente ou crie um se ainda não houver. O operador fornece URL e chaves na configuração; elas nunca vão para o código.`,
    pendencias: [
      f.nomesItens.length > 0
        ? `Duração de cada serviço (não estime: pergunte): ${f.nomesItens.slice(0, 20).join(', ')}`
        : 'Duração de cada serviço (não estime: pergunte)',
    ],
  }),
  // Dashboard ("Painel de resultados" para o cliente): lê a Agenda quando o cliente a pediu, senão começa por planilhas
  dashboard: (f) => {
    const comAgenda = f.tiposProjeto.includes('agenda');
    const fontes = comAgenda
      ? `- Lê os agendamentos da Agenda deste cliente (por dia, por serviço, por horário, cancelamentos, clientes que voltam) e também aceita planilhas ou CSV que o dono importar (vendas, pedidos, atendimentos).`
      : `- O cliente não pediu a Agenda: o painel começa pela importação de planilhas ou CSV que o dono já usa (vendas, pedidos, atendimentos). Se a Agenda vier depois, ele passa a ler os agendamentos dela.`;
    return {
      texto: `## O que construir: Dashboard
Um painel de resultados para o dono acompanhar os números do negócio (para o cliente, "Painel de resultados").
- Acesso só para o dono, com login: o mesmo login do painel da Agenda quando houver.
${fontes}
- Os dados ficam no mesmo projeto Supabase de todos os projetos deste cliente: use o projeto existente ou crie um se ainda não houver. O operador fornece URL e chaves na configuração; elas nunca vão para o código.
- Quais números mostrar são decididos na entrevista, porque dependem do negócio. Sugestões, não obrigações: movimento por dia e por horário, itens ou serviços mais procurados, clientes que voltam, comparação com o mês anterior.`,
      pendencias: comAgenda ? [] : ['Fonte dos dados do Dashboard (que planilhas ou sistemas o dono usa hoje)'],
    };
  },
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

function assemble(facts, briefing, tipo) {
  const module = (MODULES[tipo] || MODULES.site)(facts);
  return (
    [`# Prompt Mestre: ${facts.companyName}`, briefing, module.texto, buildEnding([...facts.pendencias, ...module.pendencias])].join('\n\n') + '\n'
  );
}

/** Prompt Mestre de um Tipo de Projeto (Site por padrão). */
export function buildMasterPrompt(input, tipo = 'site') {
  const facts = collectFacts(input || {});
  return assemble(facts, buildBriefing(facts), tipo);
}

/** Um Prompt Mestre por Tipo de Projeto, todos com o mesmo Briefing do Negócio. Montado pelo código: não gasta IA. */
export function buildMasterPrompts(input) {
  const facts = collectFacts(input || {});
  const briefing = buildBriefing(facts);
  return Object.fromEntries(PROJECT_TYPE_KEYS.map((tipo) => [tipo, assemble(facts, briefing, tipo)]));
}
