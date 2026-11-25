import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Loader2, Minus, Plus, TriangleAlert } from 'lucide-react';
import { createAgendamento, getAgendaConfig, getOcupacao, trackPageAccess } from '../../services/api';
import {
  GRUPO_GRANDE,
  MAX_PESSOAS,
  STATUS,
  dayMonth,
  formatPhone,
  getOpenDays,
  getSlotAvailability,
  isValidPhone,
  pessoasLabel,
  shortDateLabel,
  sortTimes,
  toDateKey,
  weekdayShort,
  whatsappLink,
} from '../../services/agenda';
import { notifyNewBooking } from '../../services/notify';
import BoardingPass from './BoardingPass';

const CONFIG_CACHE = 'cached_agenda_config';
const PEOPLE_KEYS = [1, 2, 3, 4, 5];

function readCachedConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_CACHE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// O céu do fim de tarde no Guaíba, do pêssego ao lilás. Cada horário ganha a cor da sua posição na noite.
const SKY_STOPS = ['#f8d9bd', '#f2c6aa', '#ecbcb2', '#e2b7c2', '#d5b5d3', '#c6b5e2', '#b3a9dc', '#a29bd2'];

function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, k) => Math.round(v + (pb[k] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** Cor do céu para o horário de índice i entre n horários. */
function skyColor(i, n) {
  if (n <= 1) return SKY_STOPS[0];
  const pos = (i / (n - 1)) * (SKY_STOPS.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(SKY_STOPS.length - 1, lo + 1);
  return mix(SKY_STOPS[lo], SKY_STOPS[hi], pos - lo);
}

const SLOT_NOTE = {
  poucos: 'últimos lugares',
  cheio: 'esgotado',
  bloqueado: 'fechado',
  passou: 'já passou',
};

/**
 * Widget de reserva do Marcianos. Independente da página: pode ser encaixado numa landing page.
 * @param {{ headingLevel?: 'h1' | 'h2' }} props
 */
export default function ReservaWidget({ headingLevel = 'h1' }) {
  const Heading = headingLevel;
  const uid = useId();
  const ids = {
    heading: `${uid}-heading`,
    name: `${uid}-name`,
    phone: `${uid}-phone`,
    notes: `${uid}-notes`,
    nameError: `${uid}-name-error`,
    phoneError: `${uid}-phone-error`,
    dateError: `${uid}-date-error`,
    timeError: `${uid}-time-error`,
  };

  const [config, setConfig] = useState(() => readCachedConfig());
  const [ocupacao, setOcupacao] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  const [guests, setGuests] = useState(2);
  const [bigGroup, setBigGroup] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [timeCleared, setTimeCleared] = useState('');
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  const daysRef = useRef(null);
  const timesRef = useRef(null);
  const nameRef = useRef(null);
  const phoneRef = useRef(null);

  useEffect(() => {
    let active = true;
    Promise.all([getAgendaConfig(), getOcupacao()])
      .then(([cfg, occ]) => {
        if (!active) return;
        setConfig(cfg);
        setOcupacao(occ);
        localStorage.setItem(CONFIG_CACHE, JSON.stringify(cfg));
      })
      .catch((err) => console.error('[Reserva] Erro ao carregar a agenda:', err))
      .finally(() => active && setLoadingSlots(false));
    trackPageAccess();
    return () => {
      active = false;
    };
  }, []);

  const openDays = useMemo(() => (config ? getOpenDays(config) : []), [config]);
  const times = useMemo(() => sortTimes(config?.horarios_disponiveis || []), [config]);
  const todayKey = toDateKey(new Date());
  const tomorrowKey = toDateKey(new Date(Date.now() + 86400000));

  const availabilityOf = (slot, dayKey = date, people = guests) =>
    getSlotAvailability({ config, bookings: ocupacao, dateKey: dayKey, time: slot, guests: people });

  // Mudou o dia e o horário escolhido lotou: solta o horário e explica por quê
  useEffect(() => {
    if (!time || !date || !config) return;
    const { state } = availabilityOf(time);
    if (state !== 'livre' && state !== 'poucos') {
      setTimeCleared(`O horário ${time} não tem mais vagas nesse dia. Escolha outro.`);
      setTime('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, guests, config, ocupacao]);

  const isBig = guests >= GRUPO_GRANDE;
  const notesEnabled = config?.campo_observacoes_ativo ?? true;

  const chooseGuests = (value) => {
    setBigGroup(false);
    setGuests(value);
  };

  const chooseBigGroup = () => {
    setBigGroup(true);
    setGuests((g) => Math.max(g, GRUPO_GRANDE));
  };

  const chooseDate = (key) => {
    setDate(key);
    setTimeCleared('');
    setErrors((e) => ({ ...e, date: undefined }));
  };

  const chooseTime = (slot) => {
    setTime(slot);
    setTimeCleared('');
    setErrors((e) => ({ ...e, time: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!date) next.date = 'Escolha o dia.';
    if (!time) next.time = date ? 'Escolha o horário.' : 'Escolha o dia para ver os horários.';
    if (name.trim().length < 2) next.name = 'Diga seu nome para a reserva.';
    if (!isValidPhone(phone)) next.phone = 'Digite o WhatsApp com DDD, por exemplo (51) 99999-9999.';
    return next;
  };

  const focusFirstError = (next) => {
    const target = next.date ? daysRef.current : next.time ? timesRef.current : next.name ? nameRef.current : phoneRef.current;
    if (!target) return;
    target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    const focusable = target.matches('input, textarea') ? target : target.querySelector('button:not(:disabled)');
    focusable?.focus({ preventScroll: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSubmitError(false);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      focusFirstError(next);
      return;
    }
    // Revalida o horário com a ocupação mais recente antes de gravar
    const { state } = availabilityOf(time);
    if (state !== 'livre' && state !== 'poucos') {
      setErrors({ time: 'Esse horário acabou de lotar. Escolha outro.' });
      setTime('');
      focusFirstError({ time: true });
      return;
    }

    setSending(true);
    const booking = { name: name.trim(), phone, guests, date, time, notes: notes.trim() };
    try {
      const res = await createAgendamento(booking);
      const status = res.data?.status || (isBig ? STATUS.PRE_RESERVA : STATUS.CONFIRMADA);
      notifyNewBooking({ booking: { ...booking, status }, config: config || {} });
      setConfirmed({ ...booking, status });
    } catch (err) {
      console.error('[Reserva] Erro ao salvar:', err);
      setSubmitError(true);
    } finally {
      setSending(false);
    }
  };

  const restart = () => {
    setConfirmed(null);
    setDate('');
    setTime('');
    setNotes('');
    setErrors({});
    getOcupacao().then(setOcupacao).catch(() => {});
  };

  const appName = config?.app_name || 'Marcianos';
  const restaurantWhatsapp = whatsappLink(config?.phone, `Olá! Quero falar sobre uma reserva no ${appName}.`);

  if (confirmed) {
    return (
      <section className="mx-auto w-full max-w-[1120px] px-5 pb-12 pt-10 sm:px-8 lg:pt-16" aria-labelledby={ids.heading}>
        <div className="max-w-[720px]">
        <BoardingPass
          booking={confirmed}
          config={config || {}}
          headingId={ids.heading}
          Heading={Heading}
          onRestart={restart}
          sky={skyColor(Math.max(0, times.indexOf(confirmed.time)), times.length)}
        />
        </div>
      </section>
    );
  }

  // Resumo curto: o que já foi escolhido e só o próximo passo
  const summaryWhen = date ? `${shortDateLabel(date)}${time ? ` · ${time}` : ''}` : pessoasLabel(guests);
  const nextStep = !date ? 'falta escolher o dia' : !time ? 'falta o horário' : !name.trim() || !isValidPhone(phone) ? 'faltam seus dados' : isBig ? 'pré-reserva' : 'tudo pronto';
  const cols = Math.min(Math.max(times.length, 1), 8);

  return (
    <section className="mx-auto w-full max-w-[1120px]" aria-labelledby={ids.heading}>
      <form onSubmit={handleSubmit} noValidate>
        <header className="px-5 pb-8 pt-8 sm:px-8 lg:pb-10 lg:pt-14">
          <div className="min-w-0">
            <Heading id={ids.heading} className="text-[30px] font-semibold leading-tight tracking-[-0.02em] text-dusk-ink sm:text-[38px]">
              Reserve sua mesa
            </Heading>
            <p className="mt-1 text-[16px] text-dusk-ink-soft">Pessoas, dia e horário. Leva menos de um minuto.</p>
          </div>
        </header>

        <div className="space-y-9 px-5 sm:px-8">
          {/* Pessoas */}
          <Group title="Quantas pessoas?" value={pessoasLabel(guests)}>
            <div role="radiogroup" aria-label="Quantas pessoas" className="grid grid-cols-6 gap-2 sm:gap-3">
              {PEOPLE_KEYS.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={!bigGroup && guests === n}
                  aria-label={pessoasLabel(n)}
                  onClick={() => chooseGuests(n)}
                  className="dusk-key h-14 text-lg font-semibold tabular-nums"
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                role="radio"
                aria-checked={bigGroup}
                aria-label="6 ou mais pessoas"
                onClick={chooseBigGroup}
                className="dusk-key h-14 text-lg font-semibold"
              >
                6+
              </button>
            </div>

            {bigGroup && (
              <div className="mt-3 rounded-2xl border border-dusk-line bg-dusk-surface p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
                <div className="flex items-center justify-between gap-4 sm:order-2">
                  <span id={`${uid}-big-label`} className="text-[15px] text-dusk-ink sm:sr-only">
                    Quantas pessoas no grupo?
                  </span>
                  <div className="flex items-center gap-2" role="group" aria-labelledby={`${uid}-big-label`}>
                    <button
                      type="button"
                      className="dusk-key size-11"
                      aria-label="Uma pessoa a menos"
                      disabled={guests <= GRUPO_GRANDE}
                      onClick={() => setGuests((g) => Math.max(GRUPO_GRANDE, g - 1))}
                    >
                      <Minus className="size-5" aria-hidden />
                    </button>
                    <output aria-live="polite" className="w-10 text-center text-xl font-semibold tabular-nums">
                      {guests}
                    </output>
                    <button
                      type="button"
                      className="dusk-key size-11"
                      aria-label="Uma pessoa a mais"
                      disabled={guests >= MAX_PESSOAS}
                      onClick={() => setGuests((g) => Math.min(MAX_PESSOAS, g + 1))}
                    >
                      <Plus className="size-5" aria-hidden />
                    </button>
                  </div>
                </div>
                <p className="mt-3 flex gap-2 text-[15px] leading-relaxed text-dusk-ink-soft sm:mt-0">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-dusk-amber" aria-hidden />
                  <span>
                    Grupos a partir de {GRUPO_GRANDE} pessoas fazem <strong className="font-semibold text-dusk-ink">pré-reserva</strong>: a equipe do{' '}
                    {appName} confirma pelo WhatsApp. Mais de {MAX_PESSOAS} pessoas? Fale com a gente.
                  </span>
                </p>
              </div>
            )}
          </Group>

          {/* Dia */}
          <Group title="Que dia?" value={date ? shortDateLabel(date) : null}>
            <div
              ref={daysRef}
              role="radiogroup"
              aria-label="Dia da reserva"
              aria-describedby={errors.date ? ids.dateError : undefined}
              className="grid grid-cols-[repeat(auto-fit,minmax(88px,1fr))] gap-2 sm:gap-3"
            >
              {openDays.map((d) => {
                const key = toDateKey(d);
                const label = key === todayKey ? 'hoje' : key === tomorrowKey ? 'amanhã' : weekdayShort(d);
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={date === key}
                    aria-label={shortDateLabel(key)}
                    onClick={() => chooseDate(key)}
                    className="dusk-key h-[76px] flex-col gap-1 px-2"
                  >
                    <span className="text-[13px] font-medium">{label}</span>
                    <span className="text-xl font-semibold leading-none tabular-nums text-dusk-ink">{dayMonth(d)}</span>
                  </button>
                );
              })}
              {!loadingSlots && openDays.length === 0 && (
                <p className="col-span-full text-[15px] text-dusk-ink-soft">Não há dias abertos para reserva agora. Fale com o {appName} pelo WhatsApp.</p>
              )}
            </div>
            <FieldError id={ids.dateError} message={errors.date} />
          </Group>

          {/* Horário: a faixa de céu */}
          <Group title="Que horário?" value={time || null}>
            <div ref={timesRef} aria-describedby={errors.time ? ids.timeError : undefined}>
              {!date ? (
                <SkyPlaceholder>Escolha o dia para ver os horários livres.</SkyPlaceholder>
              ) : loadingSlots ? (
                <SkyPlaceholder>
                  <span className="flex items-center gap-2" role="status">
                    <Loader2 className="size-4 animate-spin" aria-hidden /> Vendo os horários livres…
                  </span>
                </SkyPlaceholder>
              ) : times.length === 0 ? (
                <SkyPlaceholder>Nenhum horário de reserva cadastrado para esse dia.</SkyPlaceholder>
              ) : (
                <div
                  role="radiogroup"
                  aria-label="Horário da reserva"
                  style={{ '--cols': cols }}
                  className="grid grid-cols-4 overflow-hidden rounded-[20px] sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
                >
                  {times.map((slot, i) => {
                    const { state } = availabilityOf(slot);
                    const disabled = state === 'cheio' || state === 'bloqueado' || state === 'passou';
                    const note = SLOT_NOTE[state];
                    return (
                      <button
                        key={slot}
                        type="button"
                        role="radio"
                        aria-checked={time === slot}
                        disabled={disabled}
                        aria-label={note ? `${slot}, ${note}` : slot}
                        onClick={() => chooseTime(slot)}
                        style={{ '--sky': skyColor(i, times.length) }}
                        className="dusk-slot"
                      >
                        <span className={`text-lg font-semibold leading-none tabular-nums ${disabled ? 'line-through' : ''}`}>{slot}</span>
                        {note && <span className={`text-[12px] ${state === 'poucos' ? 'font-bold' : 'font-medium'}`}>{note}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {timeCleared && (
              <p className="mt-2 text-sm font-medium text-dusk-amber" role="status">
                {timeCleared}
              </p>
            )}
            <FieldError id={ids.timeError} message={errors.time} />
          </Group>

          {/* Dados */}
          <Group title="Seus dados">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={ids.name} className="mb-1.5 block text-sm font-medium text-dusk-ink">
                  Nome para a reserva
                </label>
                <input
                  ref={nameRef}
                  id={ids.name}
                  type="text"
                  autoComplete="name"
                  maxLength={60}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
                  }}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? ids.nameError : undefined}
                  placeholder="Como devemos chamar você"
                  className="dusk-field"
                />
                <FieldError id={ids.nameError} message={errors.name} />
              </div>
              <div>
                <label htmlFor={ids.phone} className="mb-1.5 block text-sm font-medium text-dusk-ink">
                  WhatsApp
                </label>
                <input
                  ref={phoneRef}
                  id={ids.phone}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatPhone(e.target.value));
                    if (errors.phone) setErrors((x) => ({ ...x, phone: undefined }));
                  }}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? ids.phoneError : undefined}
                  placeholder="(51) 99999-9999"
                  className="dusk-field"
                />
                <FieldError id={ids.phoneError} message={errors.phone} />
              </div>
              {notesEnabled && (
                <div className="sm:col-span-2">
                  <label htmlFor={ids.notes} className="mb-1.5 block text-sm font-medium text-dusk-ink">
                    Alguma observação? <span className="font-normal text-dusk-ink-soft">(opcional)</span>
                  </label>
                  <textarea
                    id={ids.notes}
                    rows={2}
                    maxLength={200}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Aniversário, alergia, cadeirinha para criança…"
                    className="dusk-field resize-none"
                  />
                  <p className="mt-1 text-right text-xs text-dusk-ink-soft" aria-hidden>
                    {notes.length}/200
                  </p>
                </div>
              )}
            </div>
          </Group>

          {submitError && (
            <div role="alert" className="rounded-2xl border border-dusk-danger/40 bg-dusk-surface p-4 text-[15px] leading-relaxed">
              <p className="font-semibold text-dusk-ink">Não conseguimos salvar sua reserva.</p>
              <p className="mt-1 text-dusk-ink-soft">
                Seus dados continuam aqui: tente de novo em instantes
                {restaurantWhatsapp ? (
                  <>
                    {' '}
                    ou{' '}
                    <a href={restaurantWhatsapp} target="_blank" rel="noreferrer" className="font-semibold text-dusk-violet underline underline-offset-4">
                      reserve pelo WhatsApp
                    </a>
                  </>
                ) : null}
                .
              </p>
            </div>
          )}
        </div>

        {/* Resumo e botão sempre à mão, presos embaixo da tela */}
        <div className="sticky bottom-0 z-10 mt-9 border-t border-dusk-line bg-dusk-surface/95 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:mx-8 sm:mb-6 sm:rounded-[20px] sm:border sm:px-6 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="min-w-0 flex-1" aria-live="polite">
              <p className="flex items-center gap-2 text-[16px] font-semibold text-dusk-ink">
                {time && (
                  <span
                    aria-hidden
                    className="size-3.5 shrink-0 rounded-full ring-1 ring-dusk-ink/15"
                    style={{ background: skyColor(times.indexOf(time), times.length) }}
                  />
                )}
                <span className="truncate">{summaryWhen}</span>
              </p>
              <p className="text-[14px] leading-snug text-dusk-ink-soft">{date ? `${pessoasLabel(guests)} · ${nextStep}` : nextStep}</p>
            </div>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-dusk-violet px-5 text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 enabled:active:scale-[0.97] disabled:cursor-wait disabled:opacity-80 sm:h-14 sm:px-8 sm:text-[16px] [@media(hover:hover)]:enabled:hover:bg-dusk-violet-hover"
            >
              {sending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {sending ? 'Reservando…' : isBig ? 'Enviar pré-reserva' : 'Confirmar reserva'}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function Group({ title, value = null, children }) {
  return (
    // min-w-0: um fieldset não encolhe abaixo do conteúdo
    <fieldset className="min-w-0">
      <legend className="mb-3 w-full">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-[17px] font-semibold text-dusk-ink">{title}</span>
          {value && <span className="text-[15px] text-dusk-ink-soft">{value}</span>}
        </span>
      </legend>
      {children}
    </fieldset>
  );
}

/** Lugar da faixa de céu antes de haver horários. */
function SkyPlaceholder({ children }) {
  return (
    <div className="flex min-h-[88px] items-center justify-center rounded-[20px] border border-dashed border-dusk-line-strong bg-dusk-surface/60 px-4 text-center text-[15px] text-dusk-ink-soft">
      {children}
    </div>
  );
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-sm font-medium text-dusk-danger">
      {message}
    </p>
  );
}
