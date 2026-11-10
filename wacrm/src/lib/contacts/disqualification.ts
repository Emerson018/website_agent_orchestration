// Desqualificação (Decision Gate). A mesma lista de motivos é validada no backend do Portal.

export const DISQUALIFY_REASONS = ['Já tem site', 'Sem perfil para o serviço', 'Sem resposta', 'Fora da região', 'Outro'] as const;

export type DisqualifyReason = (typeof DISQUALIFY_REASONS)[number];

/** Registro salvo em `contacts.additional_data.desqualificacao`. */
export interface Disqualification {
  motivo: DisqualifyReason;
  detalhe?: string;
  em: string;
  deals_fechados: string[];
}
