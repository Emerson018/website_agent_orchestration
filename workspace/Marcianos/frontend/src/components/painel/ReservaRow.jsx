import React from 'react';
import { MessageCircle, Phone, TriangleAlert } from 'lucide-react';
import { STATUS, pessoasLabel, shortDateLabel, telLink, whatsappLink } from '../../services/agenda';
import { StatusPill, actionsFor, toneClass } from './status';

/** Uma reserva na lista de hoje: quem, quantos, contato e o próximo passo. */
export default function ReservaRow({ booking, onStatus, onOpen }) {
  const closed = booking.status === STATUS.CANCELADA || booking.status === STATUS.NAO_VEIO;
  const actions = actionsFor(booking);
  const primary = actions[0];
  const wa = whatsappLink(booking.telefone, `Olá, ${booking.nome?.split(' ')[0] || ''}! Aqui é do Marcianos, sobre sua reserva de ${shortDateLabel(booking.data)} às ${booking.horario}.`);
  const tel = telLink(booking.telefone);

  return (
    <li className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 ${closed ? 'opacity-70' : ''}`}>
      <button
        type="button"
        onClick={() => onOpen(booking)}
        className="min-w-0 flex-1 rounded-lg text-left"
        aria-label={`Ver detalhes da reserva de ${booking.nome || 'cliente sem nome'}`}
      >
        <span className="flex flex-wrap items-center gap-2">
          {booking.nome ? (
            <span className={`text-[16px] font-semibold ${booking.status === STATUS.CANCELADA ? 'line-through' : ''}`}>{booking.nome}</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[16px] font-semibold text-st-pre-ink">
              <TriangleAlert className="size-4" aria-hidden /> Nome não informado
            </span>
          )}
          <StatusPill status={booking.status} />
        </span>
        <span className="mt-1 block text-[14px] text-panel-ink-soft">
          {pessoasLabel(booking.pessoas)}
          {booking.telefone ? ` · ${booking.telefone}` : ' · telefone não informado'}
        </span>
        {booking.observacoes && <span className="mt-1 block text-[14px] text-panel-ink">“{booking.observacoes}”</span>}
      </button>

      <div className="flex flex-wrap items-center gap-2">
        {primary && (
          <button type="button" className={`panel-btn ${toneClass[primary.tone]}`} onClick={() => onStatus(booking, primary.status)}>
            {primary.label}
          </button>
        )}
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="panel-btn panel-btn-ghost" aria-label={`WhatsApp de ${booking.nome || 'cliente'}`}>
            <MessageCircle className="size-4" aria-hidden />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        )}
        {tel && (
          <a href={tel} className="panel-btn panel-btn-ghost px-3" aria-label={`Ligar para ${booking.nome || 'cliente'}`}>
            <Phone className="size-4" aria-hidden />
          </a>
        )}
        <button type="button" className="panel-btn panel-btn-ghost" onClick={() => onOpen(booking)}>
          Mais
        </button>
      </div>
    </li>
  );
}
