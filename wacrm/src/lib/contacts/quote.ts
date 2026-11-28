// Orçamento do lead, calculado pelo backend do portal com a tabela de preços (ADR 0013)
// e gravado em contacts.additional_data.orcamento. Orçamentos antigos só têm `valor`.

type WithAdditionalData = { additional_data?: unknown } | null | undefined;

export interface Quote {
  /** Implantação: o preço único de construir e entregar. */
  implantacao: number;
  moeda: string;
  /** Mensalidade "a partir de" (Agenda cotada para 1 profissional); null em orçamentos antigos. */
  mensalidade: number | null;
  /** Economia da Combinação em reais; 0 quando é um tipo só. */
  economia: number;
  prazoDiasUteis: number | null;
}

const numberOrNull = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

export function quoteOf(contact: WithAdditionalData): Quote | null {
  const data = contact?.additional_data;
  if (!data || typeof data !== "object") return null;
  const raw = (data as { orcamento?: unknown }).orcamento;
  if (!raw || typeof raw !== "object") return null;
  const orcamento = raw as Record<string, unknown>;

  const implantacao = numberOrNull(orcamento.valor);
  if (implantacao === null) return null;

  return {
    implantacao,
    moeda: typeof orcamento.moeda === "string" ? orcamento.moeda : "BRL",
    mensalidade: numberOrNull(orcamento.mensalidade),
    economia: numberOrNull(orcamento.economia) ?? 0,
    prazoDiasUteis: numberOrNull(orcamento.prazo_dias_uteis),
  };
}
