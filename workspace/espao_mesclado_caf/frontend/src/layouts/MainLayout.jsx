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

  const primaryColor = config.primary_color || '#E55A1B';
  const appName = config.app_name || 'Seu Estabelecimento';
  const brandInitial = appName.trim().charAt(0).toUpperCase() || 'A';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-color,#0E0D0C)] text-[var(--text-color,#F5F4F0)] font-sans">
      {/* HEADER / NAVBAR */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 border-b border-[var(--border-color,#2E2924)] ${
          isScrolled
            ? 'bg-[var(--bg-color,#0E0D0C)]/95 backdrop-blur-md shadow-sm py-3'
            : 'bg-[var(--bg-color,#0E0D0C)] py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* LOGO & BRAND */}
          <Link to="/" className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] rounded-lg">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 text-white font-display font-bold text-lg"
              style={{ backgroundColor: primaryColor }}
            >
              {brandInitial}
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-xl tracking-tight text-[var(--text-color,#F5F4F0)] group-hover:text-[var(--primary-color,#E55A1B)] transition-colors">
                {appName}
              </span>
              {config.niche && (
                <span className="text-xs text-[var(--muted-color,#A8A29E)] font-medium">
                  {config.niche}
                </span>
              )}
            </div>
          </Link>

          {/* DESKTOP NAV LINKS */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className={`text-sm font-semibold transition-colors ${
                location.pathname === '/'
                  ? 'text-[var(--primary-color,#E55A1B)]'
                  : 'text-[var(--muted-color,#A8A29E)] hover:text-[var(--text-color,#F5F4F0)]'
              }`}
            >
              Início
            </Link>
            <a
              href="/#destaques"
              className="text-sm font-semibold text-[var(--muted-color,#A8A29E)] hover:text-[var(--text-color,#F5F4F0)] transition-colors"
            >
              Especialidades
            </a>
            <a
              href="/#sobre"
              className="text-sm font-semibold text-[var(--muted-color,#A8A29E)] hover:text-[var(--text-color,#F5F4F0)] transition-colors"
            >
              Sobre
            </a>
            <a
              href="/#contato"
              className="text-sm font-semibold text-[var(--muted-color,#A8A29E)] hover:text-[var(--text-color,#F5F4F0)] transition-colors"
            >
              Contato e horários
            </a>
            <Link
              to="/admin"
              className="text-xs font-medium text-[var(--muted-color,#A8A29E)] hover:text-[var(--text-color,#F5F4F0)] transition-colors"
            >
              Painel
            </Link>
          </nav>

          {/* DESKTOP CTA BUTTON */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/agendar"
              style={{ backgroundColor: primaryColor }}
              className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-bold text-white shadow-sm hover:brightness-110 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]"
            >
              Reservar horário
            </Link>
          </div>

          {/* MOBILE MENU BUTTON */}
          <div className="flex md:hidden items-center gap-3">
            <Link
              to="/agendar"
              style={{ backgroundColor: primaryColor }}
              className="px-3.5 py-2 min-h-[40px] inline-flex items-center rounded-xl text-xs font-bold text-white shadow-sm"
            >
              Agendar
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-[var(--surface-color,#181614)] border border-[var(--border-color,#2E2924)] text-[var(--text-color,#F5F4F0)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]"
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
          <div className="md:hidden bg-[var(--surface-color,#181614)] border-b border-[var(--border-color,#2E2924)] px-4 pt-3 pb-6 space-y-3">
            <Link
              to="/"
              className="block py-2 text-base font-semibold text-[var(--text-color,#F5F4F0)] hover:text-[var(--primary-color,#E55A1B)]"
            >
              Início
            </Link>
            <a
              href="/#destaques"
              className="block py-2 text-base font-semibold text-[var(--muted-color,#A8A29E)] hover:text-[var(--text-color,#F5F4F0)]"
            >
              Especialidades
            </a>
            <a
              href="/#sobre"
              className="block py-2 text-base font-semibold text-[var(--muted-color,#A8A29E)] hover:text-[var(--text-color,#F5F4F0)]"
            >
              Sobre
            </a>
            <a
              href="/#contato"
              className="block py-2 text-base font-semibold text-[var(--muted-color,#A8A29E)] hover:text-[var(--text-color,#F5F4F0)]"
            >
              Contato e horários
            </a>
            <Link
              to="/admin"
              className="block py-2 text-sm text-[var(--muted-color,#A8A29E)] hover:text-[var(--text-color,#F5F4F0)]"
            >
              Painel administrativo
            </Link>
            <div className="pt-2">
              <Link
                to="/agendar"
                style={{ backgroundColor: primaryColor }}
                className="w-full flex items-center justify-center py-3 min-h-[44px] rounded-xl text-center font-bold text-white shadow-sm"
              >
                Reservar horário online
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
      <footer className="bg-[var(--surface-color,#181614)] border-t border-[var(--border-color,#2E2924)] pt-14 pb-8 text-[var(--muted-color,#A8A29E)] text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[var(--border-color,#2E2924)]">
            {/* COL 1: SOBRE */}
            <div className="md:col-span-1 space-y-3">
              <span className="font-display font-bold text-xl text-[var(--text-color,#F5F4F0)] block">
                {appName}
              </span>
              <p className="text-xs leading-relaxed text-[var(--muted-color,#A8A29E)]">
                {config.tagline || 'Atendimento com hora marcada e reserva direta pela agenda online.'}
              </p>
            </div>

            {/* COL 2: ENDEREÇO */}
            <div className="space-y-2">
              <h4 className="font-semibold text-[var(--text-color,#F5F4F0)] text-sm">
                Endereço
              </h4>
              <p className="text-xs leading-relaxed text-[var(--muted-color,#A8A29E)]">
                {config.address || 'Endereço centralizado da empresa'}
              </p>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(config.address || appName || 'Brasil')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--primary-color,#E55A1B)] hover:underline font-semibold"
              >
                <span>Abrir no Google Maps</span>
              </a>
            </div>

            {/* COL 3: HORÁRIOS & CONTATO */}
            <div className="space-y-2">
              <h4 className="font-semibold text-[var(--text-color,#F5F4F0)] text-sm">
                Atendimento
              </h4>
              <p className="text-xs leading-relaxed text-[var(--muted-color,#A8A29E)]">
                {config.working_hours || 'Segunda a Sábado em horário comercial'}
              </p>
              <div className="pt-1">
                <p className="text-xs text-[var(--muted-color,#A8A29E)]">Telefone / WhatsApp:</p>
                <p className="text-xs font-semibold text-[var(--text-color,#F5F4F0)]">
                  {config.phone || '(51) 99999-9999'}
                </p>
              </div>
            </div>

            {/* COL 4: RESERVA RÁPIDA */}
            <div className="space-y-3">
              <h4 className="font-semibold text-[var(--text-color,#F5F4F0)] text-sm">
                Agenda online
              </h4>
              <p className="text-xs text-[var(--muted-color,#A8A29E)] leading-relaxed">
                Escolha o dia e o horário disponível em poucos segundos.
              </p>
              <Link
                to="/agendar"
                style={{ backgroundColor: primaryColor }}
                className="inline-flex w-full items-center justify-center px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-white shadow-sm hover:brightness-110 transition-colors"
              >
                Reservar horário
              </Link>
            </div>
          </div>

          {/* BOTTOM BAR */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--muted-color,#A8A29E)]">
            <p>
              © {new Date().getFullYear()} {appName}. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/agendar" className="hover:text-[var(--text-color,#F5F4F0)] transition-colors">
                Agendamentos
              </Link>
              <Link to="/login" className="hover:text-[var(--text-color,#F5F4F0)] transition-colors">
                Área restrita
              </Link>
              <Link to="/admin" className="hover:text-[var(--text-color,#F5F4F0)] transition-colors">
                Gestão
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
