'use client';

import React from 'react';
import { MapPin, Phone, Clock } from 'lucide-react';

interface FooterProps {
  appName: string;
  address?: string;
  phone?: string;
  workingHours?: string;
  primaryColor: string;
  theme?: 'dark' | 'light';
}

export default function Footer({
  appName,
  address,
  phone,
  workingHours,
  primaryColor,
  theme = 'light',
}: FooterProps) {
  const isDark = theme === 'dark' || appName.toLowerCase().includes('marcianos');

  return (
    <footer 
      className={`border-t py-12 px-6 transition-colors duration-300 mt-auto ${
        isDark 
          ? 'bg-slate-950/40 border-slate-900 text-slate-400' 
          : 'bg-white border-gray-100 text-gray-550'
      }`}
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h4 className={`text-lg font-bold mb-4 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
            {appName} {isDark && '🛸'}
          </h4>
          <p className="text-sm leading-relaxed max-w-sm">
            {appName.toLowerCase().includes('marcianos')
              ? 'O maior rodízio de mini burgers do universo, com boliche e diversão garantida para toda a família!'
              : 'Oferecemos uma experiência excepcional com agendamento online rápido, seguro e prático. Reserve o seu horário agora!'
            }
          </p>
        </div>
        
        <div>
          <h4 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
            Endereço 📍
          </h4>
          <div className="flex items-start gap-2.5 text-sm">
            <MapPin className="size-4 shrink-0 mt-0.5" style={{ color: primaryColor }} />
            <span>{address || 'Av. Principal, 1000 - Centro - Porto Alegre/RS'}</span>
          </div>
        </div>

        <div>
          <h4 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
            Contato & Horários 📞
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2.5">
              <Phone className="size-4 shrink-0" style={{ color: primaryColor }} />
              <span>{phone || '(51) 99999-9999'}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="size-4 shrink-0" style={{ color: primaryColor }} />
              <span>{workingHours || 'Segunda a Sábado das 9h às 18h'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`max-w-6xl mx-auto mt-10 pt-6 border-t text-center text-xs ${
        isDark ? 'border-slate-900 text-slate-500' : 'border-gray-100 text-gray-400'
      }`}>
        © {new Date().getFullYear()} {appName}. Todos os direitos reservados.
      </div>
    </footer>
  );
}
