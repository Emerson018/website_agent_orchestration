import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import staticConfig from '../../ai_config.json';
import { getAgendaConfig } from '../services/api';

export default function MainLayout() {
  const [config, setConfig] = useState(staticConfig);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    async function loadConfig() {
      try {
        const cfg = await getAgendaConfig();
        if (cfg) {
          setConfig(prev => ({
            ...prev,
            ...cfg
          }));
        }
      } catch (err) {
        // Fallback silencioso para config estático
      }
    }
    loadConfig();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0E0D0C] text-[#F5F4F0]">
      {/* HEADER / NAVBAR */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#0E0D0C]/90 backdrop-blur-md shadow-lg border-b border-[#262320] py-3'
            : 'bg-transparent border-b border-[#262320]/40 py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* LOGO & BRAND */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E55A1B] to-[#D97706] flex items-center justify-center shadow-md shadow-[#E55A1B]/20 group-hover:scale-105 transition-transform">
              <span className="text-xl">🔥</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-xl tracking-tight text-[#F5F4F0] group-hover:text-[#E55A1B] transition-colors">
                {config.app_name || '20barranove'}
              </span>
              <span className="text-[10px] tracking-widest uppercase text-[#A8A29E] font-medium">
                Parrilla & Burger Bar
              </span>
            </div>
          </Link>

          {/* DESKTOP NAV LINKS */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className={`text-sm font-semibold transition-colors ${
                location.pathname === '/' ? 'text-[#E55A1B]' : 'text-[#A8A29E] hover:text-[#F5F4F0]'
              }`}
            >
              Início
            </Link>
            <a
              href="/#cardapio"
              className="text-sm font-semibold text-[#A8A29E] hover:text-[#F5F4F0] transition-colors"
            >
              Cortes & Cardápio
            </a>
            <a
              href="/#experiencia"
              className="text-sm font-semibold text-[#A8A29E] hover:text-[#F5F4F0] transition-colors"
            >
              A Casa
            </a>
            <a
              href="/#contato"
              className="text-sm font-semibold text-[#A8A29E] hover:text-[#F5F4F0] transition-colors"
            >
              Contato & Horários
            </a>
            <Link
              to="/admin"
              className="text-xs font-medium text-[#78716C] hover:text-[#A8A29E] transition-colors"
            >
              Painel
            </Link>
          </nav>

          {/* DESKTOP CTA BUTTON */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/agendar"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-[#E55A1B] hover:bg-[#C2410C] text-white shadow-md shadow-[#E55A1B]/25 hover:shadow-lg hover:shadow-[#E55A1B]/35 transition-all duration-200 active:scale-95"
            >
              <span>Reservar Mesa</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>

          {/* MOBILE MENU BUTTON */}
          <div className="flex md:hidden items-center gap-3">
            <Link
              to="/agendar"
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#E55A1B] text-white shadow-sm"
            >
              Reservar
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-[#1F1C19] border border-[#2E2924] text-[#F5F4F0] focus:outline-none"
              aria-label="Abrir Menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#171513] border-b border-[#2E2924] px-4 pt-3 pb-6 space-y-3">
            <Link
              to="/"
              className="block py-2 text-base font-semibold text-[#F5F4F0] hover:text-[#E55A1B]"
            >
              Início
            </Link>
            <a
              href="/#cardapio"
              className="block py-2 text-base font-semibold text-[#A8A29E] hover:text-[#F5F4F0]"
            >
              Cortes & Cardápio
            </a>
            <a
              href="/#experiencia"
              className="block py-2 text-base font-semibold text-[#A8A29E] hover:text-[#F5F4F0]"
            >
              A Casa & Ambiente
            </a>
            <a
              href="/#contato"
              className="block py-2 text-base font-semibold text-[#A8A29E] hover:text-[#F5F4F0]"
            >
              Contato & Horários
            </a>
            <Link
              to="/admin"
              className="block py-2 text-sm text-[#78716C] hover:text-[#A8A29E]"
            >
              Painel Administrativo
            </Link>
            <div className="pt-2">
              <Link
                to="/agendar"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-center font-bold bg-[#E55A1B] text-white shadow-md"
              >
                Reservar Horário na Parrilla
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* MAIN VIEW CONTENT */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="bg-[#121110] border-t border-[#262320] pt-14 pb-8 text-[#A8A29E] text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#262320]">
            {/* COL 1: SOBRE */}
            <div className="md:col-span-1 space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔥</span>
                <span className="font-display font-extrabold text-xl text-[#F5F4F0]">
                  {config.app_name || '20barranove'}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[#A8A29E]">
                {config.description || 'Parrilla contemporânea, hambúrgueres artesanais feitos na brasa e culto à boa carne com cerveja artesanal.'}
              </p>
              <div className="flex items-center gap-3 pt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1F1C19] border border-[#2E2924] text-[11px] text-[#E55A1B] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E55A1B] animate-pulse"></span>
                  Parrilla Porto Alegre
                </span>
              </div>
            </div>

            {/* COL 2: ENDEREÇO */}
            <div className="space-y-3">
              <h4 className="font-bold text-[#F5F4F0] text-sm uppercase tracking-wider">
                Endereço
              </h4>
              <p className="text-xs leading-relaxed text-[#D6D3D1]">
                {config.address || "Rua Silva Jardim, 167 - Mont'Serrat"}
              </p>
              <p className="text-xs text-[#78716C]">
                Porto Alegre - RS, Brasil
              </p>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(config.address || '20barranove Porto Alegre')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#E55A1B] hover:underline font-semibold"
              >
                <span>Ver no Mapa</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* COL 3: HORÁRIOS & CONTATO */}
            <div className="space-y-3">
              <h4 className="font-bold text-[#F5F4F0] text-sm uppercase tracking-wider">
                Horários da Cozinha
              </h4>
              <p className="text-xs leading-relaxed text-[#D6D3D1]">
                {config.working_hours || 'Terça a Domingo das 18h às 23h30'}
              </p>
              <div className="pt-2">
                <p className="text-xs text-[#78716C]">Atendimento / WhatsApp:</p>
                <p className="text-xs font-semibold text-[#F5F4F0]">
                  {config.phone || '(51) 99320-2009'}
                </p>
              </div>
            </div>

            {/* COL 4: RESERVA RÁPIDA */}
            <div className="space-y-4">
              <h4 className="font-bold text-[#F5F4F0] text-sm uppercase tracking-wider">
                Agendamento Online
              </h4>
              <p className="text-xs text-[#A8A29E] leading-relaxed">
                Garanta sua mesa sem filas de espera para você e seus convidados.
              </p>
              <Link
                to="/agendar"
                className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#E55A1B] hover:bg-[#C2410C] text-white shadow-md transition-colors"
              >
                <span>Reservar Mesa Agora</span>
              </Link>
            </div>
          </div>

          {/* BOTTOM BAR */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#78716C]">
            <p>
              © {new Date().getFullYear()} {config.app_name || '20barranove'}. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/agendar" className="hover:text-[#F5F4F0] transition-colors">
                Agendamentos
              </Link>
              <Link to="/login" className="hover:text-[#F5F4F0] transition-colors">
                Área Restrita
              </Link>
              <Link to="/admin" className="hover:text-[#F5F4F0] transition-colors">
                Gestão
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
