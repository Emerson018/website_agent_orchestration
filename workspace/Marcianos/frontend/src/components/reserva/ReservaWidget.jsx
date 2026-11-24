import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarDays, Clock, Loader2, Minus, Plus, TriangleAlert, User, Users } from 'lucide-react';
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
import logo from '../../logo.png';
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

  // Mudou o dia ou o grupo e o horário escolhido não cabe mais: solta o horário e explica por quê
  useEffect(() => {
    if (!time || !date || !config) return;
    const { state } = availabilityOf(time);
    if (state !== 'livre' && state !== 'poucos') {
      setTimeCleared(`O horário ${time} não tem lugar para ${pessoasLabel(guests)} nesse dia. Escolha outro.`);
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

  const chooseDate = (key, el) => {
    setDate(key);
    // O dia escolhido fica sempre à vista na fileira rolável
    el?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
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
      <section className="ship-root mx-auto w-full max-w-[560px] px-4 pb-10 pt-6 font-sans" aria-labelledby={ids.heading}>
        <BoardingPass booking={confirmed} config={config || {}} headingId={ids.heading} Heading={Heading} onRestart={restart} />
      </section>
    );
  }

  // Resumo curto o bastante para caber ao lado do botão: o que já foi escolhido e só o próximo passo
  const summaryWhen = date ? `${shortDateLabel(date)}${time ? ` · ${time}` : ''}` : pessoasLabel(guests);
  const nextStep = !date ? 'falta escolher o dia' : !time ? 'falta o horário' : !name.trim() || !isValidPhone(phone) ? 'faltam seus dados' : isBig ? 'pré-reserva' : 'tudo pronto';

  return (
    <section className="ship-root mx-auto w-full max-w-[560px] font-sans" aria-labelledby={ids.heading}>
      <form onSubmit={handleSubmit} noValidate>
        <header className="flex items-center gap-4 px-4 pb-6 pt-6">
          <img
            src={logo}
            alt={`Logo do ${appName}`}
            width="64"
            height="64"
            className="size-16 shrink-0 rounded-2xl border border-ship-line-strong object-cover"
          />
          <div className="min-w-0">
            <Heading id={ids.heading} className="font-display text-[28px] font-bold leading-tight tracking-[-0.01em] text-ship-ink sm:text-[32px]">
              Reserve sua mesa
            </Heading>
            <p className="mt-1 text-[15px] text-ship-ink-soft">Pessoas, dia e horário. Leva menos de um minuto.</p>
          </div>
        </header>

        <ol className="relative px-4">
          <span aria-hidden className="flight-path absolute bottom-6 left-[35px] top-6 w-0.5" />

          {/* 1. Pessoas */}
          <Step icon={Users} title="Quantas pessoas?" done={pessoasLabel(guests)}>
            <div role="radiogroup" aria-label="Quantas pessoas" className="grid grid-cols-6 gap-2">
              {PEOPLE_KEYS.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={!bigGroup && guests === n}
                  aria-label={pessoasLabel(n)}
                  onClick={() => chooseGuests(n)}
                  className="ship-key h-12 font-display text-lg font-semibold"
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
                className="ship-key h-12 font-display text-lg font-semibold"
              >
                6+
              </button>
            </div>

            {bigGroup && (
              <div className="mt-3 rounded-2xl border border-ship-line-strong bg-ship-hull p-3">
                <div className="flex items-center justify-between gap-3">
                  <span id={`${uid}-big-label`} className="text-[15px] text-ship-ink">
                    Quantas pessoas no grupo?
                  </span>
                  <div className="flex items-center gap-2" role="group" aria-labelledby={`${uid}-big-label`}>
                    <button
                      type="button"
                      className="ship-key size-11"
                      aria-label="Uma pessoa a menos"
                      disabled={guests <= GRUPO_GRANDE}
                      onClick={() => setGuests((g) => Math.max(GRUPO_GRANDE, g - 1))}
                    >
                      <Minus className="size-5" aria-hidden />
                    </button>
                    <output aria-live="polite" className="w-10 text-center font-display text-xl font-bold">
                      {guests}
                    </output>
                    <button
                      type="button"
                      className="ship-key size-11"
                      aria-label="Uma pessoa a mais"
                      disabled={guests >= MAX_PESSOAS}
                      onClick={() => setGuests((g) => Math.min(MAX_PESSOAS, g + 1))}
                    >
                      <Plus className="size-5" aria-hidden />
                    </button>
                  </div>
                </div>
                <p className="mt-3 flex gap-2 text-sm leading-relaxed text-ship-ink-soft">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-ship-orange" aria-hidden />
                  <span>
                    Grupos a partir de {GRUPO_GRANDE} pessoas fazem <strong className="font-semibold text-ship-ink">pré-reserva</strong>: a equipe do{' '}
                    {appName} confirma pelo WhatsApp. Mais de {MAX_PESSOAS} pessoas? Fale com a gente.
                  </span>
                </p>
              </div>
            )}
          </Step>

          {/* 2. Dia */}
          <Step icon={CalendarDays} title="Que dia?" done={date ? shortDateLabel(date) : null}>
            <div
              ref={daysRef}
              role="radiogroup"
              aria-label="Dia da reserva"
              aria-describedby={errors.date ? ids.dateError : undefined}
              className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 scroll-row"
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
                    onClick={(e) => chooseDate(key, e.currentTarget)}
                    className="ship-key h-[72px] min-w-[72px] shrink-0 snap-start flex-col gap-0.5 px-2"
                  >
                    <span className="text-[13px] font-medium">{label}</span>
                    <span className="font-display text-xl font-bold leading-none">{dayMonth(d)}</span>
                  </button>
                );
              })}
              {!loadingSlots && openDays.length === 0 && (
                <p className="text-[15px] text-ship-ink-soft">Não há dias abertos para reserva agora. Fale com o {appName} pelo WhatsApp.</p>
              )}
            </div>
            <FieldError id={ids.dateError} message={errors.date} />
          </Step>

          {/* 3. Horário */}
          <Step icon={Clock} title="Que horário?" done={time || null}>
            <div ref={timesRef} aria-describedby={errors.time ? ids.timeError : undefined}>
              {!date ? (
                <p className="text-[15px] text-ship-ink-soft">Escolha o dia para ver os horários livres.</p>
              ) : loadingSlots ? (
                <p className="flex items-center gap-2 text-[15px] text-ship-ink-soft" role="status">
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Vendo os lugares livres…
                </p>
              ) : times.length === 0 ? (
                <p className="text-[15px] text-ship-ink-soft">Nenhum horário de reserva cadastrado para esse dia.</p>
              ) : (
                <div role="radiogroup" aria-label="Horário da reserva" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {times.map((slot) => {
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
                        className="ship-key h-16 flex-col gap-0.5"
                      >
                        <span className={`font-display text-lg font-bold leading-none ${disabled ? 'line-through' : ''}`}>{slot}</span>
                        {note && (
                          <span className={`text-xs font-medium ${state === 'poucos' && time !== slot ? 'text-ship-orange' : ''}`}>{note}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {timeCleared && (
              <p className="mt-2 text-sm text-ship-orange" role="status">
                {timeCleared}
              </p>
            )}
            <FieldError id={ids.timeError} message={errors.time} />
          </Step>

          {/* 4. Dados */}
          <Step icon={User} title="Seus dados" last>
            <div className="space-y-4">
              <div>
                <label htmlFor={ids.name} className="mb-1.5 block text-sm font-medium text-ship-ink">
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
                  className="ship-field"
                />
                <FieldError id={ids.nameError} message={errors.name} />
              </div>
              <div>
                <label htmlFor={ids.phone} className="mb-1.5 block text-sm font-medium text-ship-ink">
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
                  className="ship-field"
                />
                <FieldError id={ids.phoneError} message={errors.phone} />
              </div>
              {notesEnabled && (
                <div>
                  <label htmlFor={ids.notes} className="mb-1.5 block text-sm font-medium text-ship-ink">
                    Alguma observação? <span className="font-normal text-ship-ink-soft">(opcional)</span>
                  </label>
                  <textarea
                    id={ids.notes}
                    rows={2}
                    maxLength={200}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Aniversário, alergia, cadeirinha para criança…"
                    className="ship-field resize-none"
                  />
                  <p className="mt-1 text-right text-xs text-ship-ink-soft" aria-hidden>
                    {notes.length}/200
                  </p>
                </div>
              )}
            </div>
          </Step>
        </ol>

        {submitError && (
          <div role="alert" className="mx-4 mb-4 rounded-2xl border border-ship-danger/60 bg-ship-hull p-4 text-[15px] leading-relaxed">
            <p className="font-semibold text-ship-ink">Não conseguimos salvar sua reserva.</p>
            <p className="mt-1 text-ship-ink-soft">
              Seus dados continuam aqui: tente de novo em instantes
              {restaurantWhatsapp ? (
                <>
                  {' '}
                  ou{' '}
                  <a href={restaurantWhatsapp} target="_blank" rel="noreferrer" className="font-semibold text-ship-cyan underline underline-offset-4">
                    reserve pelo WhatsApp
                  </a>
                </>
              ) : null}
              .
            </p>
          </div>
        )}

        {/* Resumo sempre à mão, com o botão no alcance do polegar */}
        <div className="sticky bottom-0 z-10 border-t border-ship-line-strong bg-ship-hull/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1" aria-live="polite">
              <p className="truncate font-display text-[15px] font-semibold text-ship-ink">{summaryWhen}</p>
              <p className="truncate text-[13px] text-ship-ink-soft">
                {date ? `${pessoasLabel(guests)} · ${nextStep}` : nextStep}
              </p>
            </div>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-ship-cyan px-5 font-display text-[15px] font-bold text-ship-on-cyan transition-[background-color,transform] duration-150 enabled:active:scale-[0.97] disabled:cursor-wait disabled:opacity-80 [@media(hover:hover)]:enabled:hover:bg-ship-cyan-hover"
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

function Step({ icon: Icon, title, done, last = false, children }) {
  return (
    <li className={`relative pl-12 ${last ? 'pb-6' : 'pb-8'}`}>
      <span
        aria-hidden
        className={`absolute left-0 top-0 grid size-10 place-items-center rounded-full border ${
          done ? 'border-ship-green bg-ship-hull text-ship-green' : 'border-ship-line-strong bg-ship-hull text-ship-ink-soft'
        }`}
      >
        <Icon className="size-5" />
      </span>
      {/* min-w-0: um fieldset não encolhe abaixo do conteúdo e a fileira de dias esticaria a página */}
      <fieldset className="min-w-0">
        <legend className="mb-3 w-full">
          <span className="flex min-h-10 items-center justify-between gap-3">
            <span className="font-display text-lg font-semibold text-ship-ink">{title}</span>
            {done && <span className="text-sm font-medium text-ship-ink">{done}</span>}
          </span>
        </legend>
        {children}
      </fieldset>
    </li>
  );
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-sm font-medium text-ship-danger">
      {message}
    </p>
  );
}
