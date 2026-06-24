import Link from 'next/link';
import React from 'react';
import { promises as fs } from 'fs';
import path from 'path';

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

export default async function BookingPage() {
  const config = await getConfig();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header 
        className="px-6 py-4 flex items-center justify-between shadow-sm border-b border-gray-150"
        style={{ backgroundColor: config.primary_color }}
      >
        <h1 className="text-xl font-bold tracking-tight text-white">
          {config.app_name}
        </h1>
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold text-white/90 hover:text-white transition-colors">
            Início
          </Link>
          <Link href="/agendar" className="text-sm font-semibold text-white/90 hover:text-white transition-colors">
            Agendar
          </Link>
          <Link href="/admin/dashboard" className="text-sm font-semibold text-white/90 hover:text-white transition-colors">
            Painel
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white shadow-xl rounded-3xl p-8 border border-gray-100 flex flex-col items-center text-center">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Fluxo de Agendamento
          </h2>
          <p className="mt-4 text-sm text-gray-500 leading-relaxed">
            Selecione os serviços, escolha a data/hora ideal e confirme sua reserva em poucos passos.
          </p>
          <div className="w-full mt-6 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-xs text-gray-500 font-mono">
            [Módulo de agendamento carregando...]
          </div>
          <Link 
            href="/" 
            className="w-full py-2 mt-4 border border-gray-250 text-center font-bold rounded-2xl shadow-sm hover:bg-gray-50 transition-all text-xs"
          >
            Voltar para Início
          </Link>
        </div>
      </main>
    </div>
  );
}
