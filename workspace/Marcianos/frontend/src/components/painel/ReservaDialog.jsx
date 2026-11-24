import React, { useEffect, useRef } from 'react';
import { MessageCircle, Phone, X } from 'lucide-react';
import { longDateLabel, pessoasLabel, shortDateLabel, telLink, whatsappLink } from '../../services/agenda';
import { StatusPill, actionsFor, toneClass } from './status';

/** Detalhes de uma reserva, com todas as mudanças de status. Usa o <dialog> nativo: Esc fecha e o foco fica preso. */
export default function ReservaDialog({ booking, onClose, onStatus }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (booking && !dialog.open) dialog.showModal();
    if (!booking && dialog.open) dialog.close();
  }, [booking]);

  const wa = booking && whatsappLink(booking.telefone, `Olá, ${booking.nome?.split(' ')[0] || ''}! Aqui é do Marcianos, sobre sua reserva de ${shortDateLabel(booking.data)} às ${booking.horario}.`);
  const tel = booking && telLink(booking.telefone);

  return (
    <dialog
      ref={ref}
      className="panel-dialog m-auto"
      aria-labelledby="reserva-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        // Clique fora da janela fecha
        if (e.target === ref.current) ref.current.close();
      }}
    >
      {booking && (
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="reserva-dialog-title" className="text-xl font-bold tracking-[-0.01em]">
                {booking.nome || 'Nome não informado'}
              </h2>
              <p className="mt-1 text-[15px] text-panel-ink-soft">
                {longDateLabel(booking.data)} às {booking.horario}
              </p>
            </div>
            <button type="button" onClick={() => ref.current.close()} className="panel-btn panel-btn-ghost size-10 shrink-0 px-0" aria-label="Fechar">
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-panel-bg p-4 text-[15px]">
            <div>
              <dt className="text-[13px] text-panel-ink-soft">Status</dt>
              <dd className="mt-1">
                <StatusPill status={booking.status} />
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-panel-ink-soft">Pessoas</dt>
              <dd className="mt-1 font-semibold">{pessoasLabel(booking.pessoas)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[13px] text-panel-ink-soft">WhatsApp</dt>
              <dd className="mt-1 font-semibold">{booking.telefone || 'Não informado'}</dd>
            </div>
            {booking.observacoes && (
              <div className="col-span-2">
                <dt className="text-[13px] text-panel-ink-soft">Observação</dt>
                <dd className="mt-1">{booking.observacoes}</dd>
              </div>
            )}
          </dl>

          {(wa || tel) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className="panel-btn panel-btn-soft">
                  <MessageCircle className="size-4" aria-hidden /> Conversar no WhatsApp
                </a>
              )}
              {tel && (
                <a href={tel} className="panel-btn panel-btn-ghost">
                  <Phone className="size-4" aria-hidden /> Ligar
                </a>
              )}
            </div>
          )}

          <div className="mt-6 border-t border-panel-line pt-5">
            <p className="text-sm font-semibold">Mudar status</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {actionsFor(booking).map((action) => (
                <button
                  key={action.status + action.label}
                  type="button"
                  className={`panel-btn ${toneClass[action.tone]}`}
                  onClick={() => {
                    onStatus(booking, action.status);
                    ref.current.close();
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-panel-ink-soft">Cancelar não apaga a reserva: ela continua no histórico e pode ser reativada.</p>
          </div>
        </div>
      )}
    </dialog>
  );
}
