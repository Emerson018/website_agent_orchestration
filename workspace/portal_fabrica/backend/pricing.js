// Tabela de preços da Aether (ADR 0013). Único lugar onde estes valores vivem:
// o backend calcula o orçamento do lead com ela, e a página do portal lê os mesmos números.
// Sem dependências, para poder ser importada tanto no Node quanto no navegador.

// Mensalidade da Agenda por faixa de profissionais: 1, 2 a 5, 6 ou mais.
function mensalidadeDaAgenda(profissionais) {
  if (profissionais >= 6) return 179;
  if (profissionais >= 2) return 129;
  return 89;
}

const TIPOS = {
  site: { implantacao: 1490, mensalidade: () => 59, prazo_dias_uteis: 7 },
  agenda: { implantacao: 1990, mensalidade: mensalidadeDaAgenda, prazo_dias_uteis: 10 },
  dashboard: { implantacao: 990, mensalidade: () => 49, prazo_dias_uteis: 7 },
};

const ORDEM = Object.keys(TIPOS);

// Combinações: preço fechado da Implantação e prazo total. A economia é a soma dos tipos menos esse preço.
const COMBINACOES = {
  'site+agenda': { implantacao: 2990, prazo_dias_uteis: 15 },
  'agenda+dashboard': { implantacao: 2590, prazo_dias_uteis: 15 },
  'site+agenda+dashboard': { implantacao: 3690, prazo_dias_uteis: 20 },
};

const DESCONTO_PIX = 0.05;
const PARCELAS = 10;

const centavos = (valor) => Math.round(valor * 100) / 100;

/**
 * Cotação de um pedido: Implantação, Mensalidade, economia da Combinação, prazo,
 * parcela em 10x sem juros e preço no Pix (5% de desconto).
 * Devolve null quando o pedido não tem preço: nenhum tipo conhecido, ou Dashboard sem Agenda.
 */
export function cotarProjeto({ tipos = [], profissionais = 1 } = {}) {
  const escolhidos = ORDEM.filter((tipo) => tipos.includes(tipo));
  // O Dashboard só é vendido junto com a Agenda (GLOSSARY.md, Combinação).
  if (escolhidos.length === 0 || (escolhidos.includes('dashboard') && !escolhidos.includes('agenda'))) {
    return null;
  }
  const soma = escolhidos.reduce((total, tipo) => total + TIPOS[tipo].implantacao, 0);
  const { implantacao, prazo_dias_uteis } =
    escolhidos.length > 1 ? COMBINACOES[escolhidos.join('+')] : TIPOS[escolhidos[0]];
  return {
    tipos: escolhidos,
    implantacao,
    mensalidade: escolhidos.reduce((total, tipo) => total + TIPOS[tipo].mensalidade(profissionais), 0),
    economia: soma - implantacao,
    prazo_dias_uteis,
    parcela_10x: centavos(implantacao / PARCELAS),
    pix: centavos(implantacao * (1 - DESCONTO_PIX)),
  };
}
