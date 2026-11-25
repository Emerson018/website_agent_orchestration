import React, { useEffect, useRef } from 'react';
import { CalendarPlus, MapPin, MessageCircle } from 'lucide-react';
import { STATUS, buildIcs, longDateLabel, pessoasLabel, whatsappLink } from '../../services/agenda';

/**
 * O fim da reserva: o cartão da mesa com tudo para chegar lá.
 * A faixa do topo leva a cor do céu do horário escolhido (`sky`).
 */
export default function BoardingPass({ booking, config, headingId, Heading = 'h1', onRestart, sky = '#e2b7c2' }) {
  const headingRef = useRef(null);
  const isPre = booking.status === STATUS.PRE_RESERVA;
  const appName = config.app_name || 'Marcianos';
  const firstName = booking.name.split(' ')[0];

  // Leva o foco (e o leitor de tela) para o resultado
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const mapsUrl = config.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${appName}, ${config.address}`)}` : null;
  const restaurantWhatsapp = whatsappLink(config.phone, `Olá! Tenho uma reserva no ${appName} para ${longDateLabel(booking.date)} às ${booking.time}.`);

  const saveToCalendar = () => {
    const ics = buildIcs({
      title: `Reserva no ${appName} (${pessoasLabel(booking.guests)})`,
      dateKey: booking.date,
      time: booking.time,
      location: config.address,
      description: `${isPre ? 'Pré-reserva' : 'Reserva confirmada'} em nome de ${booking.name}.`,
    });
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `reserva-${appName.toLowerCase()}-${booking.date}.ics`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div>
      <Heading
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="text-[30px] font-semibold leading-tight tracking-[-0.02em] text-dusk-ink outline-none sm:text-[36px]"
      >
        {isPre ? `Pré-reserva enviada, ${firstName}!` : `Reserva confirmada, ${firstName}!`}
      </Heading>
      <p className="mt-2 text-[16px] leading-relaxed text-dusk-ink-soft">
        {isPre
          ? `A equipe do ${appName} vai confirmar sua mesa para ${pessoasLabel(booking.guests)} pelo WhatsApp ${booking.phone}.`
          : 'Sua mesa está garantida. Até lá!'}
      </p>

      <article aria-label="Sua reserva" className="reserva-card mt-7 overflow-hidden rounded-[24px] border border-dusk-line bg-dusk-surface">
        <div className="flex items-end justify-between gap-4 px-6 pb-5 pt-6" style={{ background: sky }}>
          <div>
            <p className="text-[14px] font-medium text-dusk-ink/80">{longDateLabel(booking.date)}</p>
            <p className="text-[52px] font-semibold leading-none tracking-[-0.02em] text-dusk-ink tabular-nums">{booking.time}</p>
          </div>
          <span className="rounded-full bg-dusk-surface/90 px-3 py-1 text-[13px] font-semibold text-dusk-ink">
            {isPre ? 'Pré-reserva' : 'Confirmada'}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 px-6 py-6">
          <div>
            <dt className="text-[13px] text-dusk-ink-soft">Nome</dt>
            <dd className="text-[17px] font-semibold text-dusk-ink">{booking.name}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-dusk-ink-soft">Pessoas</dt>
            <dd className="text-[17px] font-semibold text-dusk-ink">{pessoasLabel(booking.guests)}</dd>
          </div>
          {booking.notes && (
            <div className="col-span-2">
              <dt className="text-[13px] text-dusk-ink-soft">Observação</dt>
              <dd className="text-[15px] text-dusk-ink">{booking.notes}</dd>
            </div>
          )}
          {config.address && (
            <div className="col-span-2">
              <dt className="text-[13px] text-dusk-ink-soft">Endereço</dt>
              <dd className="text-[15px] text-dusk-ink">{config.address}</dd>
            </div>
          )}
        </dl>
      </article>

      <div className="mt-5 grid gap-2 sm:grid-cols-3 sm:gap-3">
        <button type="button" onClick={saveToCalendar} className="dusk-key min-h-12 gap-2 px-4 text-[15px] font-semibold text-dusk-ink">
          <CalendarPlus className="size-5" aria-hidden /> Salvar data
        </button>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="dusk-key min-h-12 gap-2 px-4 text-[15px] font-semibold text-dusk-ink">
            <MapPin className="size-5" aria-hidden /> Como chegar
          </a>
        )}
        {restaurantWhatsapp && (
          <a href={restaurantWhatsapp} target="_blank" rel="noreferrer" className="dusk-key min-h-12 gap-2 px-4 text-[15px] font-semibold text-dusk-ink">
            <MessageCircle className="size-5" aria-hidden /> WhatsApp
          </a>
        )}
      </div>

      <p className="mt-6 text-[15px] leading-relaxed text-dusk-ink-soft">
        Precisa mudar ou cancelar? Fale com o {appName} pelo WhatsApp{config.phone ? ` ${config.phone}` : ''}.
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="mt-3 min-h-11 text-[15px] font-semibold text-dusk-violet underline underline-offset-4"
      >
        Fazer outra reserva
      </button>
    </div>
  );
}
