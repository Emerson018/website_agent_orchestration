import React, { useEffect, useState } from 'react';
import { Clock, MapPin, Phone } from 'lucide-react';
import ReservaWidget from '../components/reserva/ReservaWidget';
import { getAgendaConfig } from '../services/api';
import { telLink } from '../services/agenda';
import aiConfig from '../../ai_config.json';

/** Página pública de reserva: o widget, e embaixo o essencial para chegar ao Marcianos. */
function BookingPage() {
  const [info, setInfo] = useState({
    app_name: aiConfig.app_name,
    address: aiConfig.address,
    phone: aiConfig.phone,
  });

  useEffect(() => {
    document.title = `Reserve sua mesa · ${aiConfig.app_name || 'Marcianos'}`;
    getAgendaConfig()
      .then((cfg) => setInfo({ app_name: cfg.app_name, address: cfg.address, phone: cfg.phone }))
      .catch(() => {});
  }, []);

  return (
    <div className="dusk-root min-h-dvh">
      <main>
        <ReservaWidget />
      </main>
      <footer className="mx-auto w-full max-w-[1120px] px-5 pb-10 pt-2 text-[15px] text-dusk-ink-soft sm:px-8">
        <ul className="flex flex-col gap-x-10 gap-y-2 border-t border-dusk-line pt-6 lg:flex-row lg:flex-wrap">
          {info.address && (
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{info.address}</span>
            </li>
          )}
          {aiConfig.working_hours && (
            <li className="flex gap-3">
              <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{aiConfig.working_hours}</span>
            </li>
          )}
          {info.phone && (
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
              <a href={telLink(info.phone)} className="underline underline-offset-4 hover:text-dusk-ink">
                {info.phone}
              </a>
            </li>
          )}
        </ul>
        <p className="mt-6 text-[13px]">© {new Date().getFullYear()} {info.app_name || 'Marcianos'}</p>
      </footer>
    </div>
  );
}

export default BookingPage;
