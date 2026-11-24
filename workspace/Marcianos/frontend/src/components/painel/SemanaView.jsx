import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { STATUS, dayMonth, ocupaLugar, pessoasLabel, toDateKey, weekdayLong } from '../../services/agenda';
import { StatusPill } from './status';

const DOT = {
  [STATUS.CONFIRMADA]: 'bg-st-confirmada-ink',
  [STATUS.PRE_RESERVA]: 'bg-st-pre-ink',
  [STATUS.CHEGOU]: 'bg-st-chegou-ink',
  [STATUS.NAO_VEIO]: 'bg-st-naoveio-ink',
  [STATUS.CANCELADA]: 'bg-st-cancelada-ink',
};

function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

/** A semana inteira à vista, fim de semana incluído. No celular vira uma lista por dia. */
export default function SemanaView({ bookings, config, onOpen }) {
  const [start, setStart] = useState(() => mondayOf(new Date()));
  const todayKey = toDateKey(new Date());

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      }),
    [start]
  );

  const shiftWeek = (delta) => {
    const d = new Date(start);
    d.setDate(d.getDate() + delta * 7);
    setStart(d);
  };

  const isThisWeek = toDateKey(start) === toDateKey(mondayOf(new Date()));

  return (
    <section aria-labelledby="semana-title" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" className="panel-btn panel-btn-ghost size-10 px-0" onClick={() => shiftWeek(-1)} aria-label="Semana anterior">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <h2 id="semana-title" className="text-xl font-bold tracking-[-0.01em] sm:text-2xl">
            Semana de {dayMonth(days[0])} a {dayMonth(days[6])}
          </h2>
          <button type="button" className="panel-btn panel-btn-ghost size-10 px-0" onClick={() => shiftWeek(1)} aria-label="Próxima semana">
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
        {!isThisWeek && (
          <button type="button" className="panel-btn panel-btn-soft" onClick={() => setStart(mondayOf(new Date()))}>
            Esta semana
          </button>
        )}
      </div>

      <ol className="grid gap-3 lg:grid-cols-7 lg:gap-2">
        {days.map((d) => {
          const key = toDateKey(d);
          const open = (config.dias_funcionamento || []).includes(d.getDay());
          const items = bookings.filter((b) => b.data === key).sort((a, b) => a.horario.localeCompare(b.horario));
          const people = items.filter((b) => ocupaLugar(b.status)).reduce((s, b) => s + b.pessoas, 0);
          const isToday = key === todayKey;
          return (
            <li
              key={key}
              className={`flex min-w-0 flex-col rounded-[18px] border p-3 ${
                isToday ? 'border-mint-strong bg-panel-sheet' : open ? 'border-panel-line bg-panel-sheet' : 'border-panel-line bg-panel-sunken/60'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2 lg:flex-col lg:items-start lg:gap-0">
                <h3 className="text-[15px] font-bold">
                  {weekdayLong(d)} <span className="font-normal text-panel-ink-soft">{dayMonth(d)}</span>
                </h3>
                <p className="text-[13px] text-panel-ink-soft">
                  {!open && items.length === 0 ? 'Fechado' : items.length === 0 ? 'Sem reservas' : pessoasLabel(people)}
                </p>
              </div>
              {items.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {items.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(b)}
                        className="block w-full min-w-0 rounded-xl bg-panel-bg px-2.5 py-2 text-left text-[13px] hover:bg-mint-soft"
                      >
                        {/* Horário e pessoas numa linha, o nome inteiro na de baixo: a coluna estreita não corta o nome */}
                        <span className="flex items-center gap-2">
                          <span className={`size-2 shrink-0 rounded-full ${DOT[b.status]}`} aria-hidden />
                          <span className="font-semibold">{b.horario}</span>
                          <span className="ml-auto shrink-0 text-panel-ink-soft">{pessoasLabel(b.pessoas)}</span>
                        </span>
                        <span className={`mt-0.5 block break-words pl-4 ${b.status === STATUS.CANCELADA ? 'line-through' : ''}`}>
                          {b.nome || 'Nome não informado'}
                        </span>
                        {/* Status com palavra, não só cor; "Confirmada" é o normal e fica só no ponto e no leitor de tela */}
                        {b.status === STATUS.CONFIRMADA ? (
                          <span className="sr-only">, {b.status}</span>
                        ) : (
                          <StatusPill status={b.status} className="ml-4 mt-1.5 px-2 py-0.5 text-[12px]" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-panel-ink-soft" aria-label="Legenda das cores">
        {Object.values(STATUS).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${DOT[s]}`} aria-hidden /> {s}
          </li>
        ))}
      </ul>
    </section>
  );
}
