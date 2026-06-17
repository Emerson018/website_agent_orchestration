import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import config from '../../ai_config.json';

function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const primaryColor = config.primary_color || '#007A78';

  // Helper para rota ativa
  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] text-gray-800 font-sans antialiased">
      {/* Header Profissional e Elegante */}
      <header 
        style={{ borderBottom: `2px solid ${primaryColor}30` }}
        className="h-16 bg-white px-6 flex justify-between items-center shadow-sm z-30 relative"
      >
        <div className="flex items-center gap-3">
          <div 
            style={{ backgroundColor: primaryColor }}
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md shadow-emerald-900/10"
          >
            {/* Ícone de Dente ou Logotipo Minimalista */}
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            {config.app_name}
          </span>
        </div>

        {/* Informações do Usuário no Header */}
        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
            <span style={{ backgroundColor: primaryColor }} className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white"></span>
          </button>

          <div className="h-8 w-[1px] bg-gray-200"></div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-sm font-semibold text-gray-900">Dr. Emerson</span>
              <span className="text-xs text-gray-500 font-medium">Administrador</span>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120"
                alt="Profile Avatar"
                className="w-9 h-9 rounded-xl object-cover shadow-sm border border-gray-200"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white"></span>
            </div>
          </div>
        </div>
      </header>

      {/* Container Principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Lateral Profissional */}
        <aside 
          className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out relative z-20 ${
            isCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Botão de Colapsar Lateral */}
          <div className="p-4 flex justify-end border-b border-gray-100">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-800 transition shadow-sm"
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              <svg 
                className={`w-4 h-4 transform transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
          </div>

          {/* Links da Navegação */}
          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            {/* Link Início */}
            <Link 
              to="/" 
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium transition-all duration-200 group relative ${
                isActive('/') 
                  ? 'text-gray-900 shadow-sm border border-gray-100' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
              style={isActive('/') ? { 
                backgroundColor: `${primaryColor}10`,
                borderColor: `${primaryColor}20`
              } : {}}
            >
              {/* Indicador Ativo Lateral */}
              {isActive('/') && (
                <span 
                  style={{ backgroundColor: primaryColor }} 
                  className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
                ></span>
              )}
              <span className={`transition-colors duration-200 ${isActive('/') ? 'text-emerald-700' : 'text-gray-400 group-hover:text-gray-700'}`} style={isActive('/') ? { color: primaryColor } : {}}>
                {/* SVG Home */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
              </span>
              {!isCollapsed && <span className="text-sm font-semibold tracking-wide">Início</span>}
              {/* Tooltip quando colapsado */}
              {isCollapsed && (
                <div className="absolute left-16 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-md whitespace-nowrap">
                  Início
                </div>
              )}
            </Link>

            {/* Link Agendar */}
            <Link 
              to="/agendar" 
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium transition-all duration-200 group relative ${
                isActive('/agendar') 
                  ? 'text-gray-900 shadow-sm border border-gray-100' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
              style={isActive('/agendar') ? { 
                backgroundColor: `${primaryColor}10`,
                borderColor: `${primaryColor}20`
              } : {}}
            >
              {isActive('/agendar') && (
                <span 
                  style={{ backgroundColor: primaryColor }} 
                  className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
                ></span>
              )}
              <span className={`transition-colors duration-200 ${isActive('/agendar') ? 'text-emerald-700' : 'text-gray-400 group-hover:text-gray-700'}`} style={isActive('/agendar') ? { color: primaryColor } : {}}>
                {/* SVG Calendar */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </span>
              {!isCollapsed && <span className="text-sm font-semibold tracking-wide">Agendar</span>}
              {isCollapsed && (
                <div className="absolute left-16 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-md whitespace-nowrap">
                  Agendar Consulta
                </div>
              )}
            </Link>

            {/* Link Admin */}
            <Link 
              to="/admin" 
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium transition-all duration-200 group relative ${
                isActive('/admin') 
                  ? 'text-gray-900 shadow-sm border border-gray-100' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
              style={isActive('/admin') ? { 
                backgroundColor: `${primaryColor}10`,
                borderColor: `${primaryColor}20`
              } : {}}
            >
              {isActive('/admin') && (
                <span 
                  style={{ backgroundColor: primaryColor }} 
                  className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
                ></span>
              )}
              <span className={`transition-colors duration-200 ${isActive('/admin') ? 'text-emerald-700' : 'text-gray-400 group-hover:text-gray-700'}`} style={isActive('/admin') ? { color: primaryColor } : {}}>
                {/* SVG Shield / Admin */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </span>
              {!isCollapsed && <span className="text-sm font-semibold tracking-wide">Admin</span>}
              {isCollapsed && (
                <div className="absolute left-16 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-md whitespace-nowrap">
                  Painel Administrativo
                </div>
              )}
            </Link>
          </nav>

          {/* Footer da Sidebar com info de Copyright */}
          <div className="p-4 border-t border-gray-100 text-center font-medium bg-gray-50/50">
            {!isCollapsed ? (
              <span className="text-[10px] text-gray-400 tracking-wider uppercase">Sorriso Perfeito © 2026</span>
            ) : (
              <span className="text-[10px] text-gray-400 font-bold">v1.0</span>
            )}
          </div>
        </aside>

        {/* Área Principal de Conteúdo */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F9FAFB]">
          <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 min-h-[82vh]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;