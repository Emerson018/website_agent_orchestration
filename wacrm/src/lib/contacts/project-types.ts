// Tipos de projeto (Site, Agenda, Dashboard) que o cliente escolheu no formulário do portal.
// O backend do portal grava os rótulos em contacts.additional_data.tipos_projeto.

type WithAdditionalData = { additional_data?: unknown } | null | undefined;

export function projectTypesOf(contact: WithAdditionalData): string[] {
  const data = contact?.additional_data;
  if (!data || typeof data !== "object") return [];
  const raw = (data as { tipos_projeto?: unknown }).tipos_projeto;
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is string => typeof value === "string" && value.trim() !== "");
}
