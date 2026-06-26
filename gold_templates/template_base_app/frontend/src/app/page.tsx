import Link from 'next/link';
import React from 'react';
import { promises as fs } from 'fs';
import path from 'path';
import Header from '@/components/Header';

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
    };
  }
}

export default async function LandingPage() {
  const config = await getConfig();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header appName={config.app_name} primaryColor={config.primary_color} />

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white shadow-xl rounded-3xl p-8 border border-gray-100 flex flex-col items-center text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
            Vitrine do Negócio
          </h2>
          <p className="mt-4 text-sm text-gray-500 leading-relaxed">
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
    </div>
  );
}
