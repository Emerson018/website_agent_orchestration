// Horário Resumido (GLOSSARY.md): dias seguidos com o mesmo horário numa linha só.
// O texto original do Google continua guardado no dossiê; aqui só se deriva a forma legível.

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const plain = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const DAY_KEYS = DAYS.map(plain);

const clock = (hour, minute) => `${hour.padStart(2, '0')}:${minute || '00'}`;

/** "12:00 – 15:00, 18:00 – 23:00" vira "12:00 até 15:00 e 18:00 até 23:00"; null se não souber ler. */
function readHours(value) {
  const text = plain(value);
  if (text === 'fechado') return 'Fechado';
  if (/24 horas/.test(text)) return 'Aberto 24 horas';

  const shifts = text.split(',').map((shift) => shift.trim().match(/^(\d{1,2})[:h](\d{2})?\s*[–—-]\s*(\d{1,2})[:h](\d{2})?$/));
  if (shifts.some((shift) => !shift)) return null;
  return shifts.map(([, h1, m1, h2, m2]) => `${clock(h1, m1)} até ${clock(h2, m2)}`).join(' e ');
}

function readLine(line) {
  const match = String(line).replace(/[   ]/g, ' ').match(/^\s*([^:]+?)\s*:\s*(.+?)\s*$/);
  if (!match) return null;
  const day = DAY_KEYS.indexOf(plain(match[1]).replace(/-feira$/, ''));
  const hours = readHours(match[2]);
  return day === -1 || !hours ? null : { day, hours };
}

function dayRange(first, last) {
  if (first === last) return DAYS[first];
  const separator = last === first + 1 ? 'e' : 'a';
  return `${DAYS[first]} ${separator} ${DAYS[last].toLowerCase()}`;
}

/** Agrupa os dias seguidos iguais. Se alguma linha não puder ser lida, devolve o texto como veio. */
export function summarizeOpeningHours(lines) {
  if (!Array.isArray(lines)) return [];
  const original = lines.filter(Boolean);
  const days = original.map(readLine);
  if (days.some((d) => !d) || new Set(days.map((d) => d.day)).size !== days.length) return original;

  const groups = [];
  for (const { day, hours } of [...days].sort((a, b) => a.day - b.day)) {
    const last = groups[groups.length - 1];
    if (last && last.hours === hours && last.lastDay === day - 1) last.lastDay = day;
    else groups.push({ firstDay: day, lastDay: day, hours });
  }
  return groups.map((g) => `${dayRange(g.firstDay, g.lastDay)}: ${g.hours}`);
}
