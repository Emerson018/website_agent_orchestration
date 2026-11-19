// Horário Resumido (GLOSSARY.md): dias seguidos com o mesmo horário numa linha só.
// Mesma regra de workspace/portal_fabrica/backend/opening_hours.js, que grava o resumo em dossiês novos;
// aqui ela cobre os leads antigos, que só têm o texto original do Google.

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const DAY_KEYS = DAYS.map(plain);

const clock = (hour: string, minute?: string) => `${hour.padStart(2, "0")}:${minute || "00"}`;

function readHours(value: string): string | null {
  const text = plain(value);
  if (text === "fechado") return "Fechado";
  if (/24 horas/.test(text)) return "Aberto 24 horas";

  const shifts = text.split(",").map((shift) => shift.trim().match(/^(\d{1,2})[:h](\d{2})?\s*[–—-]\s*(\d{1,2})[:h](\d{2})?$/));
  if (shifts.some((shift) => !shift)) return null;
  return shifts.map((shift) => `${clock(shift![1], shift![2])} até ${clock(shift![3], shift![4])}`).join(" e ");
}

function readLine(line: string): { day: number; hours: string } | null {
  const match = line.replace(/[   ]/g, " ").match(/^\s*([^:]+?)\s*:\s*(.+?)\s*$/);
  if (!match) return null;
  const day = DAY_KEYS.indexOf(plain(match[1]).replace(/-feira$/, ""));
  const hours = readHours(match[2]);
  return day === -1 || !hours ? null : { day, hours };
}

function dayRange(first: number, last: number): string {
  if (first === last) return DAYS[first];
  const separator = last === first + 1 ? "e" : "a";
  return `${DAYS[first]} ${separator} ${DAYS[last].toLowerCase()}`;
}

/** Agrupa os dias seguidos iguais. Se alguma linha não puder ser lida, devolve o texto como veio. */
export function summarizeOpeningHours(lines: unknown): string[] {
  if (!Array.isArray(lines)) return [];
  const original = lines.filter((line): line is string => typeof line === "string" && line !== "");
  const days = original.map(readLine);
  if (days.some((d) => !d) || new Set(days.map((d) => d!.day)).size !== days.length) return original;

  const groups: Array<{ firstDay: number; lastDay: number; hours: string }> = [];
  for (const { day, hours } of [...days].sort((a, b) => a!.day - b!.day) as Array<{ day: number; hours: string }>) {
    const last = groups[groups.length - 1];
    if (last && last.hours === hours && last.lastDay === day - 1) last.lastDay = day;
    else groups.push({ firstDay: day, lastDay: day, hours });
  }
  return groups.map((g) => `${dayRange(g.firstDay, g.lastDay)}: ${g.hours}`);
}

/** Os horários para mostrar: o resumo salvo no dossiê ou, em leads antigos, calculado na hora. */
export function openingHoursOf(
  dossie: { horarios_resumidos?: unknown; horarios_funcionamento?: unknown } | null | undefined,
): string[] {
  const saved = dossie?.horarios_resumidos;
  if (Array.isArray(saved) && saved.length > 0) return saved as string[];
  return summarizeOpeningHours(dossie?.horarios_funcionamento);
}
