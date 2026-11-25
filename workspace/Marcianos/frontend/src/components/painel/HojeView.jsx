import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  STATUS,
  fromDateKey,
  getPeopleBooked,
  getReservationsTaken,
  getSlotLimit,
  longDateLabel,
  vagasLabel,
  ocupaLugar,
  pessoasLabel,
  sortTimes,
  toDateKey,
} from '../../services/agenda';
import ReservaRow from './ReservaRow';

const FILTERS = [
  { id: 'ativas', label: 'Ativas', match: (s) => s === STATUS.CONFIRMADA || s === STATUS.PRE_RESERVA || s === STATUS.CHEGOU },
  { id: 'pre', label: 'Pré-reservas', match: (s) => s === STATUS.PRE_RESERVA },
  { id: 'encerradas', label: 'Canceladas e não vieram', match: (s) => s === STATUS.CANCELADA || s === STATUS.NAO_VEIO },
  { id: 'todas', label: 'Todas', match: () => true },
];

/** A noite de serviço: quem vem, em que horário, e o que falta fazer. */
export default function HojeView({ bookings, config, onStatus, onOpen }) {
  const todayKey = toDateKey(new Date());
  const [day, setDay] = useState(todayKey);
  const [filter, setFilter] = useState('ativas');

  const ofDay = useMemo(() => bookings.filter((b) => b.data === day), [bookings, day]);
  const active = ofDay.filter((b) => ocupaLugar(b.status));
  const people = active.reduce((sum, b) => sum + b.pessoas, 0);
  const pending = ofDay.filter((b) => b.status === STATUS.PRE_RESERVA).length;
  const arrived = ofDay.filter((b) => b.status === STATUS.CHEGOU).reduce((s, b) => s + b.pessoas, 0);

  const isOpen = (config.dias_funcionamento || []).includes(fromDateKey(day).getDay());
  // Vagas livres somadas por horário: um horário lotado acima do limite não "come" vagas de outro
  const slotTimes = isOpen ? sortTimes(config.horarios_disponiveis || []) : [];
  const freeSeats = slotTimes.reduce((sum, t) => sum + Math.max(0, getSlotLimit(config, day, t) - getReservationsTaken(bookings, day, t)), 0);

  const matcher = FILTERS.find((f) => f.id === filter).match;
  const visible = ofDay.filter((b) => matcher(b.status));
  const groups = sortTimes(visible.map((b) => b.horario)).map((time) => ({
    time,
    items: visible.filter((b) => b.horario === time),
  }));

  const shiftDay = (delta) => {
    const d = fromDateKey(day);
    d.setDate(d.getDate() + delta);
    setDay(toDateKey(d));
  };

  return (
    <section aria-labelledby="hoje-title" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" className="panel-btn panel-btn-ghost size-10 px-0" onClick={() => shiftDay(-1)} aria-label="Dia anterior">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <h2 id="hoje-title" className="min-w-0 text-xl font-bold tracking-[-0.01em] sm:text-2xl">
            {day === todayKey ? 'Hoje, ' : ''}
            {longDateLabel(day).replace(/^./, (c) => (day === todayKey ? c.toLowerCase() : c))}
          </h2>
          <button type="button" className="panel-btn panel-btn-ghost size-10 px-0" onClick={() => shiftDay(1)} aria-label="Próximo dia">
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
        {day !== todayKey && (
          <button type="button" className="panel-btn panel-btn-soft" onClick={() => setDay(todayKey)}>
            Voltar para hoje
          </button>
        )}
      </div>

      {/* Resumo da noite numa linha, não um painel de métricas */}
      <p className="panel-voice rounded-2xl bg-panel-sheet px-4 py-3 text-[16px] leading-relaxed text-panel-ink" aria-live="polite">
        {!isOpen && ofDay.length === 0 ? (
          'Fechado neste dia.'
        ) : (
          <>
            {!isOpen && <strong className="block font-semibold">Fechado para novas reservas</strong>}
            {/* Cada item leva o próprio separador e não quebra no meio: nunca sobra um "·" no fim da linha */}
            <span className="whitespace-nowrap">
              <strong className="font-semibold">{pessoasLabel(people)}</strong> em {active.length} {active.length === 1 ? 'reserva' : 'reservas'}
            </span>
            {arrived > 0 && <>{' '}<span className="whitespace-nowrap">· {arrived} já chegaram</span></>}
            {isOpen && slotTimes.length > 0 && <>{' '}<span className="whitespace-nowrap">· {vagasLabel(freeSeats)} livres</span></>}
            {pending > 0 && (
              <>
                {' '}
                <span className="whitespace-nowrap">
                · <button type="button" className="font-semibold text-st-pre-ink underline underline-offset-4" onClick={() => setFilter('pre')}>
                  {pending} {pending === 1 ? 'pré-reserva para confirmar' : 'pré-reservas para confirmar'}
                </button>
                </span>
              </>
            )}
          </>
        )}
      </p>

      <div role="group" aria-label="Filtrar reservas" className="scroll-row -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => {
          const count = ofDay.filter((b) => f.match(b.status)).length;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`panel-btn shrink-0 ${filter === f.id ? 'bg-mint text-mint-deep' : 'panel-btn-ghost'}`}
            >
              {f.label}
              <span className="rounded-full bg-panel-sheet/70 px-1.5 text-[13px]">{count}</span>
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-panel-line-strong px-6 py-10 text-center">
          <p className="text-[16px] font-semibold">
            {ofDay.length === 0 ? 'Nenhuma reserva para este dia.' : 'Nenhuma reserva com esse filtro.'}
          </p>
          <p className="mt-1 text-[15px] text-panel-ink-soft">
            {ofDay.length === 0 ? 'As reservas feitas pela página aparecem aqui na hora.' : 'Escolha outro filtro para ver as demais.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(({ time, items }) => {
            const limit = getSlotLimit(config, day, time);
            const taken = getReservationsTaken(bookings, day, time);
            const peopleInSlot = getPeopleBooked(bookings, day, time);
            return (
              <section key={time} aria-labelledby={`slot-${time}`} className="overflow-hidden rounded-[20px] border border-panel-line bg-panel-sheet">
                <header className="flex items-baseline justify-between gap-3 border-b border-panel-line bg-panel-bg/60 px-4 py-2.5">
                  <h3 id={`slot-${time}`} className="font-display text-lg font-bold">
                    {time}
                  </h3>
                  <p className={`text-[14px] ${taken > limit ? 'font-semibold text-st-naoveio-ink' : 'text-panel-ink-soft'}`}>
                    {taken} de {vagasLabel(limit)}
                    {taken > limit ? ' (acima do limite)' : ''}
                    <span className="text-panel-ink-soft"> · {pessoasLabel(peopleInSlot)}</span>
                  </p>
                </header>
                <ul className="divide-y divide-panel-line">
                  {items.map((b) => (
                    <ReservaRow key={b.id} booking={b} onStatus={onStatus} onOpen={onOpen} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
