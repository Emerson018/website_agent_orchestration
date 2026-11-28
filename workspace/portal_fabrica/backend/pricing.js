// Tabela de preços da Aether (ADR 0013). Único lugar onde estes valores vivem:
// o backend calcula o Orçamento do lead com ela. Não depende de nada do Node,
// para a página do portal poder ler os mesmos números (#21, #22).
import { PROJECT_TYPE_KEYS } from './project_types.js';

// Mensalidade da Agenda por faixa de profissionais: 1, 2 a 5, 6 ou mais.
function mensalidadeDaAgenda(profissionais) {
  if (profissionais >= 6) return 179;
  if (profissionais >= 2) return 129;
  return 89;
}

const TIPOS = {
  site: { implantacao: 1490, mensalidade: () => 59, prazo_dias_uteis: 7 },
  // A única Mensalidade que muda por faixa: por isso é mostrada como "a partir de".
  agenda: { implantacao: 1990, mensalidade: mensalidadeDaAgenda, prazo_dias_uteis: 10, mensalidade_por_faixa: true },
  dashboard: { implantacao: 990, mensalidade: () => 49, prazo_dias_uteis: 7 },
};

// Mesma ordem fixa dos Tipos de Projeto do formulário.
const ORDEM = PROJECT_TYPE_KEYS;

// Combinações: preço fechado da Implantação, prazo total e o dia útil em que cada tipo é entregue
// (o Design do Cliente é feito uma vez só). A economia é a soma dos tipos menos esse preço.
const COMBINACOES = {
  'site+agenda': { implantacao: 2990, prazo_dias_uteis: 15, entregas: { site: 6, agenda: 15 } },
  'agenda+dashboard': { implantacao: 2590, prazo_dias_uteis: 15, entregas: { agenda: 10, dashboard: 15 } },
  'site+agenda+dashboard': { implantacao: 3690, prazo_dias_uteis: 20, entregas: { site: 6, agenda: 15, dashboard: 20 } },
};

// Condições de pagamento da Implantação (ADR 0013), também mostradas na página.
export const DESCONTO_PIX = 0.05;
export const PARCELAS = 10;

const centavos = (valor) => Math.round(valor * 100) / 100;

/**
 * Cotação de um pedido: Implantação, Mensalidade, economia da Combinação, prazo,
 * parcela em 10x sem juros e preço no Pix (5% de desconto).
 * Devolve null quando o pedido não tem preço: nenhum tipo conhecido, ou Dashboard sem Agenda.
 */
export function quoteProject({ tipos = [], profissionais = 1 } = {}) {
  const escolhidos = ORDEM.filter((tipo) => tipos.includes(tipo));
  // O Dashboard só é vendido junto com a Agenda (GLOSSARY.md, Combinação).
  if (escolhidos.length === 0 || (escolhidos.includes('dashboard') && !escolhidos.includes('agenda'))) {
    return null;
  }
  const soma = escolhidos.reduce((total, tipo) => total + TIPOS[tipo].implantacao, 0);
  const { implantacao, prazo_dias_uteis, entregas } =
    escolhidos.length > 1
      ? COMBINACOES[escolhidos.join('+')]
      : { ...TIPOS[escolhidos[0]], entregas: { [escolhidos[0]]: TIPOS[escolhidos[0]].prazo_dias_uteis } };
  const mensalidade = escolhidos.reduce((total, tipo) => total + TIPOS[tipo].mensalidade(profissionais), 0);
  return {
    tipos: escolhidos,
    implantacao,
    mensalidade,
    // "menos de R$ X por dia", num mês de 30 dias
    mensalidade_por_dia_menos_de: Math.floor(mensalidade / 30) + 1,
    economia: soma - implantacao,
    prazo_dias_uteis,
    entregas,
    mensalidade_a_partir_de: escolhidos.some((tipo) => TIPOS[tipo].mensalidade_por_faixa === true),
    parcelas: PARCELAS,
    parcela_10x: centavos(implantacao / PARCELAS),
    pix: centavos(implantacao * (1 - DESCONTO_PIX)),
  };
}
