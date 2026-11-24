// Regras da agenda do Marcianos, compartilhadas pelo widget de reserva e pelo painel.
// Não falam com o banco: recebem configuração e reservas e devolvem decisões.

/** Status de uma reserva. Cancelar nunca apaga: a reserva só muda de status. */
export const STATUS = {
  CONFIRMADA: 'Confirmada',
  PRE_RESERVA: 'Pré-reserva',
  CHEGOU: 'Chegou',
  NAO_VEIO: 'Não veio',
  CANCELADA: 'Cancelada',
};

/** A partir de quantas pessoas a reserva vira pré-reserva, que o dono confirma. */
export const GRUPO_GRANDE = 6;
/** Maior grupo que o widget aceita reservar sozinho. */
export const MAX_PESSOAS = 20;

// Valores antigos do banco e do modo local, traduzidos para o vocabulário novo
const LEGACY_STATUS = {
  Agendado: STATUS.CONFIRMADA,
  Confirmado: STATUS.CONFIRMADA,
  'Em andamento': STATUS.CONFIRMADA,
  Finalizado: STATUS.CONFIRMADA,
  Pendente: STATUS.PRE_RESERVA,
  Cancelado: STATUS.CANCELADA,
};

export function normalizeStatus(raw) {
  if (Object.values(STATUS).includes(raw)) return raw;
  return LEGACY_STATUS[raw] || STATUS.CONFIRMADA;
}

/** Reservas que ainda ocupam lugar no horário. */
export function ocupaLugar(status) {
  return status !== STATUS.CANCELADA && status !== STATUS.NAO_VEIO;
}

export const pad2 = (n) => String(n).padStart(2, '0');

export function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function fromDateKey(key) {
  return new Date(`${key}T00:00:00`);
}

/** Lugares do horário: exceção do dia quando houver, senão o padrão. 0 = horário bloqueado. */
export function getSlotLimit(config, dateKey, time) {
  const custom = config.limites_customizados?.[dateKey]?.[time];
  const value = custom ?? config.vagas_padrao ?? 0;
  return Math.max(0, Number(value) || 0);
}

/** Pessoas já reservadas num horário. A capacidade conta pessoas, não reservas. */
export function getSeatsTaken(bookings, dateKey, time) {
  return bookings
    .filter((b) => b.data === dateKey && b.horario === time && ocupaLugar(b.status))
    .reduce((sum, b) => sum + (Number(b.pessoas) || 0), 0);
}

/** Horário que já passou hoje (com o relógio informado). */
export function isPastSlot(dateKey, time, now = new Date()) {
  const today = toDateKey(now);
  if (dateKey < today) return true;
  if (dateKey > today) return false;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m <= now.getHours() * 60 + now.getMinutes();
}

/**
 * Disponibilidade de um horário para um grupo.
 * @returns {{state: 'livre'|'poucos'|'cheio'|'bloqueado'|'passou', remaining: number, limit: number}}
 */
export function getSlotAvailability({ config, bookings, dateKey, time, guests = 1, now = new Date() }) {
  const limit = getSlotLimit(config, dateKey, time);
  if (isPastSlot(dateKey, time, now)) return { state: 'passou', remaining: 0, limit };
  if (limit === 0) return { state: 'bloqueado', remaining: 0, limit };
  const remaining = Math.max(0, limit - getSeatsTaken(bookings, dateKey, time));
  // Grupo grande é pré-reserva: o dono decide, então não esbarra no limite de lugares
  if (guests >= GRUPO_GRANDE) return { state: remaining > 0 ? 'livre' : 'cheio', remaining, limit };
  if (remaining < guests) return { state: 'cheio', remaining, limit };
  return { state: remaining - guests <= 1 ? 'poucos' : 'livre', remaining, limit };
}

/** Dias abertos dentro da janela de antecedência, a partir de hoje. */
export function getOpenDays(config, now = new Date()) {
  const days = [];
  const limit = Number(config.antecedencia_maxima_dias ?? 7) || 7;
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < limit; i++) {
    if ((config.dias_funcionamento || []).includes(current.getDay())) days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/** Ordena horários "HH:MM". */
export function sortTimes(times) {
  return [...new Set(times)].sort((a, b) => a.localeCompare(b));
}

/** Telefone brasileiro mascarado enquanto a pessoa digita. */
export function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11;
}

/** Link de conversa no WhatsApp para um telefone brasileiro. */
export function whatsappLink(phone, text = '') {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (!digits.startsWith('55')) digits = `55${digits}`;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function telLink(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits ? `tel:+55${digits}` : null;
}

const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const WEEKDAYS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const weekdayShort = (date) => WEEKDAYS_SHORT[date.getDay()];
export const weekdayLong = (date) => WEEKDAYS_LONG[date.getDay()];
export const dayMonth = (date) => `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;

/** "sáb, 29/11" */
export function shortDateLabel(dateKey) {
  const d = fromDateKey(dateKey);
  return `${weekdayShort(d)}, ${dayMonth(d)}`;
}

/** "Sábado, 29 de novembro" */
export function longDateLabel(dateKey) {
  const d = fromDateKey(dateKey);
  const month = d.toLocaleDateString('pt-BR', { month: 'long' });
  return `${weekdayLong(d)}, ${d.getDate()} de ${month}`;
}

export const pessoasLabel = (n) => `${n} ${Number(n) === 1 ? 'pessoa' : 'pessoas'}`;
export const lugaresLabel = (n) => `${n} ${Number(n) === 1 ? 'lugar' : 'lugares'}`;

/** Arquivo .ics para o cliente salvar a reserva na agenda do celular. */
export function buildIcs({ title, dateKey, time, durationMinutes = 120, location, description }) {
  const [h, m] = time.split(':').map(Number);
  const start = fromDateKey(dateKey);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const stamp = (d) =>
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
  const esc = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Marcianos//Reserva//PT-BR',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@marcianos`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc(location)}`,
    `DESCRIPTION:${esc(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
