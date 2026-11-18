// Tipos de projeto que o cliente escolhe no formulário do portal (múltipla escolha).
// O portal envia as chaves; o CRM guarda os rótulos legíveis em contacts.additional_data.tipos_projeto.
export const PROJECT_TYPES = [
  { key: 'site', label: 'Site' },
  { key: 'app_mobile', label: 'App mobile' },
  { key: 'agenda', label: 'Agenda' },
];

/**
 * Converte as chaves recebidas em rótulos, na ordem fixa acima, sem repetição.
 * Valores desconhecidos ou de outro tipo são ignorados.
 */
export function normalizeProjectTypes(raw) {
  if (!Array.isArray(raw)) return [];
  const chosen = new Set(raw.filter((value) => typeof value === 'string'));
  return PROJECT_TYPES.filter(({ key }) => chosen.has(key)).map(({ label }) => label);
}
