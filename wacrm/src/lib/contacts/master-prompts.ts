// Prompts Mestre por Tipo de Projeto (GLOSSARY.md): um por aba no Lead Profile Page.
// O backend do portal grava contacts.additional_data.prompts_mestre = { tipo: { texto, gerado_em } }.
// Contatos antigos têm um prompt único (prompt_mestre), que abre como a aba Site.

export type MasterPromptKey = "site" | "agenda" | "dashboard";

export const MASTER_PROMPT_TYPES: Array<{ key: MasterPromptKey; label: string }> = [
  { key: "site", label: "Site" },
  { key: "agenda", label: "Agenda" },
  { key: "dashboard", label: "Dashboard" },
];

export interface MasterPrompt {
  texto: string;
  geradoEm?: string;
}

/** Etapas cujos dados entram no Prompt Mestre: se mudarem depois dele, o prompt fica Desatualizado. */
export const PROMPT_SOURCE_STEP_LABELS = {
  dossie: "Dossiê",
  raspagem: "Raspagem",
  catalogo: "Catálogo Extraído",
} as const;

type Raw = Record<string, unknown> | null | undefined;

const isKey = (k: string): k is MasterPromptKey => MASTER_PROMPT_TYPES.some((t) => t.key === k);
const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : undefined);

export function masterPromptsOf(additionalData: Raw): Partial<Record<MasterPromptKey, MasterPrompt>> {
  const ad = additionalData || {};
  const perType = ad.prompts_mestre;
  const result: Partial<Record<MasterPromptKey, MasterPrompt>> = {};

  if (perType && typeof perType === "object") {
    for (const [key, value] of Object.entries(perType as Record<string, unknown>)) {
      const texto = str((value as { texto?: unknown } | null)?.texto);
      if (!isKey(key) || !texto) continue;
      const geradoEm = str((value as { gerado_em?: unknown }).gerado_em);
      result[key] = geradoEm ? { texto, geradoEm } : { texto };
    }
    if (Object.keys(result).length > 0) return result;
  }

  const legado = str(ad.prompt_mestre);
  if (legado) {
    const geradoEm = str(ad.prompt_mestre_gerado_em);
    return { site: geradoEm ? { texto: legado, geradoEm } : { texto: legado } };
  }
  return result;
}

/** Abas: os tipos que o cliente pediu primeiro, depois os outros, na ordem fixa. */
export function promptTabOrder(tiposProjeto: string[]): MasterPromptKey[] {
  const chosen = MASTER_PROMPT_TYPES.filter((t) => tiposProjeto.includes(t.label)).map((t) => t.key);
  const rest = MASTER_PROMPT_TYPES.map((t) => t.key).filter((k) => !chosen.includes(k));
  return [...chosen, ...rest];
}

const isAfter = (a?: unknown, b?: string) =>
  typeof a === "string" && Boolean(b) && new Date(a).getTime() > new Date(b as string).getTime();

/** As etapas cujos dados mudaram depois de um prompt gerado em `geradoEm`. */
export function promptChangesSince(additionalData: Raw, geradoEm?: string): string[] {
  const ad = (additionalData || {}) as {
    dossie?: { consultado_em?: string } | null;
    scraped_data?: { raspado_em?: string } | null;
    catalogo_extraido?: { editado_em?: string; gerado_em?: string } | null;
  };
  const catalog = ad.catalogo_extraido;
  return [
    isAfter(ad.dossie?.consultado_em, geradoEm) && PROMPT_SOURCE_STEP_LABELS.dossie,
    isAfter(ad.scraped_data?.raspado_em, geradoEm) && PROMPT_SOURCE_STEP_LABELS.raspagem,
    isAfter(catalog?.editado_em || catalog?.gerado_em, geradoEm) && PROMPT_SOURCE_STEP_LABELS.catalogo,
  ].filter(Boolean) as string[];
}
