import React from 'react';
import { CalendarCheck, CircleSlash, PartyPopper, Settings, UserCheck, UserX, Hourglass } from 'lucide-react';
import { STATUS } from '../../services/agenda';

const KIND = {
  create: { icon: PartyPopper, tone: 'bg-mint-soft text-mint-strong' },
  config: { icon: Settings, tone: 'bg-panel-sunken text-panel-ink' },
  [STATUS.CONFIRMADA]: { icon: CalendarCheck, tone: 'bg-st-confirmada-bg text-st-confirmada-ink' },
  [STATUS.PRE_RESERVA]: { icon: Hourglass, tone: 'bg-st-pre-bg text-st-pre-ink' },
  [STATUS.CHEGOU]: { icon: UserCheck, tone: 'bg-st-chegou-bg text-st-chegou-ink' },
  [STATUS.NAO_VEIO]: { icon: UserX, tone: 'bg-st-naoveio-bg text-st-naoveio-ink' },
  [STATUS.CANCELADA]: { icon: CircleSlash, tone: 'bg-st-cancelada-bg text-st-cancelada-ink' },
  cancel: { icon: CircleSlash, tone: 'bg-st-cancelada-bg text-st-cancelada-ink' },
};

const dayLabel = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
};

/** O que aconteceu, do mais recente para o mais antigo. Fica guardado neste aparelho. */
export default function HistoricoView({ logs }) {
  const groups = [];
  logs.forEach((log) => {
    const label = dayLabel(log.timestamp);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(log);
    else groups.push({ label, items: [log] });
  });

  return (
    <section aria-labelledby="historico-title" className="space-y-5">
      <div>
        <h2 id="historico-title" className="text-xl font-bold tracking-[-0.01em] sm:text-2xl">
          Histórico
        </h2>
        <p className="mt-1 text-[15px] text-panel-ink-soft">Reservas novas e cada mudança de status ou configuração feita neste aparelho.</p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-panel-line-strong px-6 py-10 text-center">
          <p className="text-[16px] font-semibold">Nada por aqui ainda.</p>
          <p className="mt-1 text-[15px] text-panel-ink-soft">Quando chegar uma reserva ou você mudar um status, aparece aqui.</p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.label} aria-label={group.label}>
            <h3 className="mb-2 text-sm font-semibold capitalize text-panel-ink-soft">{group.label}</h3>
            <ul className="divide-y divide-panel-line overflow-hidden rounded-[20px] border border-panel-line bg-panel-sheet">
              {group.items.map((log) => {
                const kind = KIND[log.actionType] || KIND.config;
                const Icon = kind.icon;
                return (
                  <li key={log.id} className="flex items-start gap-3 px-4 py-3">
                    <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${kind.tone}`} aria-hidden>
                      <Icon className="size-4" />
                    </span>
                    <p className="min-w-0 flex-1 text-[15px] leading-snug">{log.details}</p>
                    <time dateTime={log.timestamp} className="shrink-0 text-[13px] text-panel-ink-soft">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}
