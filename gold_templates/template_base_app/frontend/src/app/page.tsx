import Link from 'next/link';
import React from 'react';
import { promises as fs } from 'fs';
import path from 'path';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

async function getConfig() {
  try {
    const configPath = path.join(process.cwd(), 'ai_config.json');
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return {
      app_name: 'Agendador PWA',
      primary_color: '#4F46E5',
      secondary_color: '#10B981',
      logo_url: '/logo.png',
      address: 'Av. Principal, 1000 - Centro - Porto Alegre/RS',
      phone: '(51) 99999-9999',
      working_hours: 'Segunda a Sábado das 9h às 18h'
    };
  }
}

export default async function LandingPage() {
  const config = await getConfig();
  const theme = config.app_name?.toLowerCase().includes('marcianos') ? 'dark' : 'light';

  return (
    <div className="min-h-screen flex flex-col">
      <Header appName={config.app_name} primaryColor={config.primary_color} logoUrl={config.logo_url} theme={theme} />

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 shadow-xl rounded-3xl p-8 border border-gray-100 dark:border-slate-800 flex flex-col items-center text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight sm:text-4xl">
            Vitrine do Negócio
          </h2>
          <p className="mt-4 text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
            Bem-vindo ao {config.app_name}. Conheça nossos profissionais, serviços e agende o seu horário online com facilidade e conforto.
          </p>
          <Link 
            href="/agendar" 
            className="w-full py-3 mt-6 text-white text-center font-bold rounded-2xl shadow-md transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: config.primary_color }}
          >
            Realizar reserva
          </Link>
        </div>
      </main>

      <Footer 
        appName={config.app_name}
        address={config.address}
        phone={config.phone}
        workingHours={config.working_hours}
        primaryColor={config.primary_color}
        theme={theme}
      />
    </div>
  );
}
