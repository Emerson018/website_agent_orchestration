import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dynamic style using CSS variables defined in root.
  // We can also inline some values or read them from state.
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full ambient-glow pointer-events-none" style={{ animationDelay: '0s' }}></div>
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full ambient-glow pointer-events-none" style={{ animationDelay: '-3s' }}></div>
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-blue-600/10 rounded-full ambient-glow pointer-events-none" style={{ animationDelay: '-6s' }}></div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-gray-800/80 backdrop-blur-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Fábrica de IA
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
              <a href="#beneficios" className="hover:text-white transition-colors duration-200">Como Funciona</a>
              <a href="#modulos" className="hover:text-white transition-colors duration-200">Módulos</a>
              <a href="#configurador" className="hover:text-white transition-colors duration-200">Configurador</a>
              <a href="#depoimentos" className="hover:text-white transition-colors duration-200">Cases</a>
            </nav>

            {/* Header Actions */}
            <div className="hidden md:flex items-center gap-4">
              <a 
                href="#configurador" 
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-indigo-500/35 flex items-center gap-2"
              >
                <span>Criar Projeto</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 focus:outline-none"
              >
                <span className="sr-only">Abrir Menu</span>
                {mobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu, show/hide based on menu state */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 bg-gray-950/95 backdrop-blur-lg px-4 pt-2 pb-6 space-y-2">
            <a 
              href="#beneficios" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800"
            >
              Como Funciona
            </a>
            <a 
              href="#modulos" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800"
            >
              Módulos
            </a>
            <a 
              href="#configurador" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800"
            >
              Configurador
            </a>
            <a 
              href="#depoimentos" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800"
            >
              Cases
            </a>
            <div className="pt-4 border-t border-gray-800">
              <a 
                href="#configurador"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center block px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold"
              >
                Criar Projeto
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-950 border-t border-gray-900 py-16 z-10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-lg font-bold tracking-tight text-white">Fábrica de IA</span>
              </div>
              <p className="text-gray-400 text-sm max-w-sm">
                Desenvolvemos e orquestramos soluções completas baseadas em inteligência artificial para o seu negócio. Sites, Apps, Agendamentos e Integrações autônomas prontas para usar.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Soluções</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#modulos" className="hover:text-white transition-colors">Site Completo</a></li>
                <li><a href="#modulos" className="hover:text-white transition-colors">Aplicativo Mobile</a></li>
                <li><a href="#modulos" className="hover:text-white transition-colors">Agendamento Online</a></li>
                <li><a href="#modulos" className="hover:text-white transition-colors">Orquestração por WhatsApp</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Negócio</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#beneficios" className="hover:text-white transition-colors">Como Funciona</a></li>
                <li><a href="#configurador" className="hover:text-white transition-colors">Painel de Branding</a></li>
                <li><a href="#configurador" className="hover:text-white transition-colors">Simular Orçamento</a></li>
                <li><span className="text-indigo-400 flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span> Live Demo</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-900 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <p>&copy; {new Date().getFullYear()} Fábrica de IA. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-gray-300 transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-gray-300 transition-colors">Política de Privacidade</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
