import React, { useEffect, useRef } from 'react';
import { CalendarPlus, MapPin, MessageCircle } from 'lucide-react';
import { STATUS, buildIcs, longDateLabel, pessoasLabel, whatsappLink } from '../../services/agenda';
import logo from '../../logo.png';

/** O fim da reserva: um cartão de embarque da nave Marcianos com tudo para chegar lá. */
export default function BoardingPass({ booking, config, headingId, Heading = 'h1', onRestart }) {
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
        className="px-1 font-display text-[28px] font-bold leading-tight tracking-[-0.01em] text-ship-ink outline-none sm:text-[32px]"
      >
        {isPre ? `Pré-reserva enviada, ${firstName}!` : `Reserva confirmada, ${firstName}!`}
      </Heading>
      <p className="mt-2 px-1 text-[15px] leading-relaxed text-ship-ink-soft">
        {isPre
          ? `A equipe do ${appName} vai confirmar sua mesa para ${pessoasLabel(booking.guests)} pelo WhatsApp ${booking.phone}.`
          : 'Sua mesa está garantida. Guarde seu cartão de embarque.'}
      </p>

      <article
        aria-label="Cartão de embarque"
        className="boarding-pass mt-6 overflow-hidden rounded-[24px] border border-ship-line-strong bg-ship-hull shadow-[0_18px_40px_-18px_rgb(61_217_245/0.45)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-ship-line px-5 py-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" width="40" height="40" className="size-10 rounded-xl object-cover" />
            <div>
              <p className="font-display text-[15px] font-bold uppercase tracking-[0.06em] text-ship-ink">{appName}</p>
              <p className="text-[13px] text-ship-ink-soft">Cartão de embarque</p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[13px] font-bold ${
              isPre ? 'bg-ship-orange text-ship-on-cyan' : 'bg-ship-green text-ship-on-green'
            }`}
          >
            {isPre ? 'Pré-reserva' : 'Confirmada'}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 px-5 py-5">
          <div className="col-span-2">
            <dt className="text-[13px] text-ship-ink-soft">Passageiro</dt>
            <dd className="font-display text-xl font-semibold text-ship-ink">{booking.name}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ship-ink-soft">Embarque</dt>
            <dd className="text-[15px] font-semibold text-ship-ink">{longDateLabel(booking.date)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-ship-ink-soft">Tripulação</dt>
            <dd className="text-[15px] font-semibold text-ship-ink">{pessoasLabel(booking.guests)}</dd>
          </div>
          {booking.notes && (
            <div className="col-span-2">
              <dt className="text-[13px] text-ship-ink-soft">Observação</dt>
              <dd className="text-[15px] text-ship-ink">{booking.notes}</dd>
            </div>
          )}
        </dl>

        <div className="pass-perforation h-2 border-t border-dashed border-ship-line-strong" aria-hidden />

        <div className="flex items-end justify-between gap-4 px-5 py-5">
          <div>
            <p className="text-[13px] text-ship-ink-soft">Horário</p>
            <p className="font-display text-[44px] font-bold leading-none text-ship-green">{booking.time}</p>
          </div>
          {config.address && (
            <p className="max-w-[60%] text-right text-[13px] leading-snug text-ship-ink-soft">
              <span className="block font-semibold text-ship-ink">Base</span>
              {config.address}
            </p>
          )}
        </div>
      </article>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={saveToCalendar}
          className="ship-key min-h-12 gap-2 px-4 text-[15px] font-semibold"
        >
          <CalendarPlus className="size-5" aria-hidden /> Salvar data
        </button>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="ship-key min-h-12 gap-2 px-4 text-[15px] font-semibold">
            <MapPin className="size-5" aria-hidden /> Como chegar
          </a>
        )}
        {restaurantWhatsapp && (
          <a href={restaurantWhatsapp} target="_blank" rel="noreferrer" className="ship-key min-h-12 gap-2 px-4 text-[15px] font-semibold">
            <MessageCircle className="size-5" aria-hidden /> WhatsApp
          </a>
        )}
      </div>

      <p className="mt-5 px-1 text-sm leading-relaxed text-ship-ink-soft">
        Precisa mudar ou cancelar? Fale com o {appName} pelo WhatsApp{config.phone ? ` ${config.phone}` : ''}.
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="mt-3 min-h-11 px-1 text-[15px] font-semibold text-ship-cyan underline underline-offset-4"
      >
        Fazer outra reserva
      </button>
    </div>
  );
}
