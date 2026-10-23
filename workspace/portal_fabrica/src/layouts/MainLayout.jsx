import React from 'react';
import { Outlet } from 'react-router-dom';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#12151B] text-[#ECEEF2]">
      {/* Top Studio Workbench Bar */}
      <header className="sticky top-0 z-40 bg-[#12151B]/95 backdrop-blur-sm border-b border-[#282F3D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-md bg-[#E59A28] text-[#12151B] flex items-center justify-center font-mono text-xs font-bold tracking-tight group-hover:bg-[#F2AA3C] transition-colors">
              PF
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-base leading-none text-[#ECEEF2]">
                Portal Fábrica
              </span>
              <span className="text-xs text-[#949BA8] mt-0.5">
                Mesa de especificação e despacho de software
              </span>
            </div>
          </a>

          <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-6 text-sm font-medium text-[#949BA8]">
            <a href="#configurador" className="hover:text-[#ECEEF2] transition-colors">
              Caderno de escopo
            </a>
            <a href="#fila-producao" className="hover:text-[#ECEEF2] transition-colors">
              Fila de produção
            </a>
            <a href="#arquitetura-entrega" className="hover:text-[#ECEEF2] transition-colors">
              Fluxo de compilação
            </a>
            <a href="#projetos-homologados" className="hover:text-[#ECEEF2] transition-colors">
              Projetos homologados
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="#configurador"
              className="px-4 py-2 rounded-md bg-[#E59A28] hover:bg-[#D48817] text-[#12151B] text-sm font-semibold transition-colors"
            >
              Configurar pedido
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children || <Outlet />}
      </main>

      {/* Studio Technical Footer */}
      <footer className="border-t border-[#282F3D] bg-[#141820] py-12 text-sm text-[#949BA8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="font-display font-semibold text-[#ECEEF2]">
              Portal Fábrica
            </p>
            <p className="text-xs text-[#949BA8] max-w-md">
              Sistema integrado de especificação técnica, coleta de briefing e provisionamento automatizado de aplicações web e mobile.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-[#949BA8]">
            <span>Motor: LangGraph + FastAPI</span>
            <span>Persistência: Supabase</span>
            <span>© {new Date().getFullYear()} Portal Fábrica</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
