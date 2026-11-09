// PROTÓTIPO DESCARTÁVEL — dados fictícios e regras de status do novo perfil do lead.
// Não importe isto em código de produção.

export type StepStatus = 'feito' | 'faltando' | 'opcional' | 'desatualizado';

export type StepKey = 'briefing' | 'dossie' | 'raspagem' | 'catalogo' | 'diagnostico' | 'prompt';

export interface FakeLead {
  key: string;
  label: string;
  contact: { name?: string; company?: string; phone?: string; email?: string; website?: string };
  hasSite: boolean;
  dossie?: {
    consultado_em: string;
    nome_verificado: string;
    telefone?: string;
    endereco?: string;
    maps_url?: string;
    horarios: string[];
    nota: number;
    total_avaliacoes: number;
    fotos: number;
    avaliacoes5: string[];
    dores: string[];
    modalidades: string[];
    pitch: string;
  };
  raspagem?: { raspado_em: string; urls: string[]; itens: number; sobre?: string };
  catalogo?: { gerado_em: string; editado_em?: string; arquivos: number; itens: number; categorias: string[]; pagamento?: string };
  diagnostico?: { gerado_em: string; resumo: string; vibe: string; publico: string };
  prompt?: { gerado_em: string; texto: string };
  desqualificacao?: { motivo: string; detalhe?: string; em: string };
}

const PROMPT_SAMPLE = `# BRIEFING MESTRE DO PROJETO

### BLOCO 1: IDENTIDADE
- Nome da Empresa: Pizzaria Bella Napoli
- O que a empresa realmente é: pizzaria de bairro com forno a lenha...

### BLOCO 2: DADOS VERIFICADOS
- Reputação: 4.8★ (312 avaliações)
- Endereço: Rua das Flores, 123 — Porto Alegre/RS
...`;

export const FAKE_LEADS: FakeLead[] = [
  {
    key: 'novo',
    label: 'Recém-captado',
    contact: { name: 'Roberto Alencar', phone: '(11) 98888-1234', email: 'roberto@exemplo.com' },
    hasSite: true,
  },
  {
    key: 'metade',
    label: 'Pela metade',
    contact: { name: 'Camila Rocha', company: 'Barbearia Dom Lucas', phone: '(51) 99777-2211', email: 'camila@domlucas.com' },
    hasSite: false,
    dossie: {
      consultado_em: '2026-11-07T14:10:00Z',
      nome_verificado: 'Barbearia Dom Lucas',
      telefone: '(51) 3333-4455',
      endereco: 'Av. Ipiranga, 500 — Porto Alegre/RS',
      maps_url: 'https://maps.app.goo.gl/domlucas',
      horarios: ['Ter–Sex 09:00–20:00', 'Sáb 08:00–18:00'],
      nota: 4.9,
      total_avaliacoes: 187,
      fotos: 6,
      avaliacoes5: ['Melhor degradê da cidade e cerveja gelada.', 'Atendimento pontual, agenda sempre respeitada.'],
      dores: ['Difícil conseguir horário no sábado.'],
      modalidades: ['Atendimento no local'],
      pitch: 'Olá equipe da Barbearia Dom Lucas! Parabéns pela nota 4.9★...',
    },
  },
  {
    key: 'completo',
    label: 'Completo, prompt desatualizado',
    contact: { name: 'Marco Bellini', company: 'Pizzaria Bella Napoli', phone: '(51) 99123-4567', email: 'marco@bellanapoli.com', website: 'https://bellanapoli.com.br' },
    hasSite: true,
    dossie: {
      consultado_em: '2026-11-01T10:00:00Z',
      nome_verificado: 'Pizzaria Bella Napoli',
      telefone: '(51) 3222-1100',
      endereco: 'Rua das Flores, 123 — Porto Alegre/RS',
      maps_url: 'https://maps.app.goo.gl/bellanapoli',
      horarios: ['Ter–Dom 18:00–23:30'],
      nota: 4.8,
      total_avaliacoes: 312,
      fotos: 6,
      avaliacoes5: ['Massa de fermentação natural incrível.', 'Forno a lenha de verdade, sabor único.'],
      dores: ['Entrega demorou 1h numa sexta.'],
      modalidades: ['Entrega', 'Consumo no local', 'Retirada'],
      pitch: 'Olá equipe da Pizzaria Bella Napoli! Analisei o perfil de vocês...',
    },
    raspagem: { raspado_em: '2026-11-01T10:20:00Z', urls: ['https://bellanapoli.com.br/cardapio'], itens: 18, sobre: 'Tradição napolitana desde 1998.' },
    diagnostico: {
      gerado_em: '2026-11-02T09:00:00Z',
      resumo: 'Pizzaria de bairro com forno a lenha e massa de fermentação natural.',
      vibe: 'Rústico acolhedor, tijolo aparente e luz âmbar.',
      publico: 'Famílias e casais do bairro, ticket médio.',
    },
    prompt: { gerado_em: '2026-11-02T09:00:00Z', texto: PROMPT_SAMPLE },
    // O catálogo foi extraído depois do prompt: o prompt fica desatualizado
    catalogo: { gerado_em: '2026-11-06T16:30:00Z', arquivos: 3, itens: 42, categorias: ['Pizzas Tradicionais', 'Pizzas Especiais', 'Bebidas', 'Sobremesas'], pagamento: 'Pix, cartão e dinheiro' },
  },
  {
    key: 'desqualificado',
    label: 'Desqualificado',
    contact: { name: 'Ana Souza', company: 'Estética Renascer', phone: '(51) 98111-0000', website: 'https://esteticarenascer.com.br' },
    hasSite: true,
    dossie: {
      consultado_em: '2026-11-03T11:00:00Z',
      nome_verificado: 'Estética Renascer',
      endereco: 'Rua Padre Chagas, 80 — Porto Alegre/RS',
      maps_url: 'https://maps.app.goo.gl/renascer',
      horarios: ['Seg–Sáb 09:00–19:00'],
      nota: 4.6,
      total_avaliacoes: 54,
      fotos: 4,
      avaliacoes5: ['Equipe muito atenciosa.'],
      dores: [],
      modalidades: ['Atendimento no local'],
      pitch: 'Olá equipe da Estética Renascer!...',
    },
    desqualificacao: { motivo: 'Já tem site', detalhe: 'Site novo feito em outubro por outra agência.', em: '2026-11-08T13:00:00Z' },
  },
];

export const STEP_LABELS: Record<StepKey, string> = {
  briefing: 'Briefing',
  dossie: 'Dossiê',
  raspagem: 'Raspagem',
  catalogo: 'Catálogo Extraído',
  diagnostico: 'Diagnóstico',
  prompt: 'Prompt Mestre',
};

export const STEP_ACTIONS: Record<StepKey, string> = {
  briefing: 'Completar briefing',
  dossie: 'Consultar Google Maps',
  raspagem: 'Raspar site',
  catalogo: 'Enviar arquivos',
  diagnostico: 'Gerar Diagnóstico',
  prompt: 'Gerar Prompt Mestre',
};

export interface StepState {
  key: StepKey;
  label: string;
  status: StepStatus;
  summary: string;
}

const newer = (a?: string, b?: string) => Boolean(a && b && new Date(a) > new Date(b));

export function computeSteps(lead: FakeLead): StepState[] {
  const missingBriefing = (['name', 'company', 'phone'] as const).filter((k) => !lead.contact[k]);
  const briefing: StepStatus = missingBriefing.length === 0 ? 'feito' : 'faltando';

  const promptStale =
    lead.prompt &&
    (newer(lead.dossie?.consultado_em, lead.prompt.gerado_em) ||
      newer(lead.raspagem?.raspado_em, lead.prompt.gerado_em) ||
      newer(lead.catalogo?.editado_em || lead.catalogo?.gerado_em, lead.prompt.gerado_em));

  const steps: Array<[StepKey, StepStatus, string]> = [
    ['briefing', briefing, briefing === 'feito' ? 'Nome, empresa e telefone' : `Falta: ${missingBriefing.map((k) => ({ name: 'nome', company: 'empresa', phone: 'telefone' })[k]).join(', ')}`],
    ['dossie', lead.dossie ? 'feito' : 'faltando', lead.dossie ? `${lead.dossie.nota}★ · ${lead.dossie.fotos} fotos` : 'Ainda não consultado'],
    [
      'raspagem',
      lead.raspagem ? 'feito' : lead.hasSite ? 'faltando' : 'opcional',
      lead.raspagem ? `${lead.raspagem.itens} itens do site` : lead.hasSite ? 'Site não raspado' : 'Lead sem site',
    ],
    ['catalogo', lead.catalogo && lead.catalogo.itens > 0 ? 'feito' : 'opcional', lead.catalogo ? `${lead.catalogo.itens} itens de ${lead.catalogo.arquivos} arquivos` : 'Nenhum arquivo enviado'],
    ['diagnostico', lead.diagnostico ? 'feito' : 'faltando', lead.diagnostico ? 'Gerado' : 'Ainda não gerado'],
    ['prompt', !lead.prompt ? 'faltando' : promptStale ? 'desatualizado' : 'feito', !lead.prompt ? 'Ainda não gerado' : promptStale ? 'Dados mudaram depois do prompt' : 'Pronto para copiar'],
  ];
  return steps.map(([key, status, summary]) => ({ key, label: STEP_LABELS[key], status, summary }));
}

export function nextStep(steps: StepState[]): StepState | null {
  return steps.find((s) => s.status === 'faltando' || s.status === 'desatualizado') || null;
}

export interface ChecklistItem {
  label: string;
  present: boolean;
  source?: string;
}

export function computeChecklist(lead: FakeLead): ChecklistItem[] {
  const d = lead.dossie;
  const catalogItems = (lead.catalogo?.itens || 0) + (lead.raspagem?.itens || 0);
  return [
    { label: 'Nome do estabelecimento', present: Boolean(d?.nome_verificado || lead.contact.company), source: d ? 'Google Maps' : lead.contact.company ? 'Briefing' : undefined },
    { label: 'Telefone / WhatsApp', present: Boolean(d?.telefone || lead.contact.phone), source: lead.contact.phone ? 'Briefing' : d?.telefone ? 'Google Maps' : undefined },
    { label: 'Endereço', present: Boolean(d?.endereco), source: d?.endereco ? 'Google Maps' : undefined },
    { label: 'Link do Google Maps', present: Boolean(d?.maps_url), source: d?.maps_url ? 'Google Maps' : undefined },
    { label: 'Horários', present: Boolean(d?.horarios.length), source: d?.horarios.length ? 'Google Maps' : undefined },
    { label: 'Site oficial', present: Boolean(lead.contact.website), source: lead.contact.website ? 'Briefing' : undefined },
    { label: 'Fotos', present: Boolean(d?.fotos), source: d?.fotos ? `${d.fotos} do Google Maps` : undefined },
    { label: 'Avaliações 5 estrelas', present: Boolean(d?.avaliacoes5.length), source: d?.avaliacoes5.length ? `${d.avaliacoes5.length} do Google Maps` : undefined },
    {
      label: 'Itens de catálogo',
      present: catalogItems > 0,
      source: catalogItems > 0 ? [lead.catalogo && 'Catálogo Extraído', lead.raspagem && 'Raspagem'].filter(Boolean).join(' + ') : undefined,
    },
    { label: 'Formas de pagamento', present: Boolean(lead.catalogo?.pagamento), source: lead.catalogo?.pagamento ? 'Catálogo Extraído' : undefined },
  ];
}
