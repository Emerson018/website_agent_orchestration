import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import config from '../../ai_config.json';

function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  // Função auxiliar para verificar se a rota está ativa
  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6] text-gray-800 font-sans">
      {/* Header Premium */}
      <header 
        style={{ backgroundColor: config.primary_color || '#007A78' }}
        className="h-16 px-6 text-white flex justify-between items-center shadow-md z-20"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-inner">
            <span style={{ color: config.primary_color || '#007A78' }} className="font-bold text-lg">S</span>
          </div>
          <h1 className="text-xl font-bold tracking-wide">{config.app_name}</h1>
        </div>
        
        <div className="flex items-center gap-4 text-sm font-medium opacity-90">
          <span>Olá, Administrador</span>
          <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center cursor-pointer hover:bg-white/30 transition">
            👤
          </div>
        </div>
      </header>

      {/* Main Workspace (Sidebar + Outlet Content) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Lateral Elegante */}
        <aside 
          className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out shadow-lg z-10 ${
            isCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Botão de Colapsar */}
          <div className="p-4 flex justify-end border-b border-gray-100">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-800 transition shadow-sm"
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {isCollapsed ? '➡️' : '⬅️'}
            </button>
          </div>

          {/* Links de Navegação */}
          <nav className="flex-1 p-3 space-y-1">
            {/* Link Início */}
            <Link 
              to="/" 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                isActive('/') 
                  ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-100/50' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              style={isActive('/') ? { color: config.primary_color, backgroundColor: `${config.primary_color}10` } : {}}
            >
              <span className="text-lg">🏠</span>
              {!isCollapsed && <span className="text-sm">Início</span>}
            </Link>

            {/* Link Agendar */}
            <Link 
              to="/agendar" 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                isActive('/agendar') 
                  ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-100/50' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              style={isActive('/agendar') ? { color: config.primary_color, backgroundColor: `${config.primary_color}10` } : {}}
            >
              <span className="text-lg">📅</span>
              {!isCollapsed && <span className="text-sm">Agendar Consulta</span>}
            </Link>

            {/* Link Admin */}
            <Link 
              to="/admin" 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                isActive('/admin') 
                  ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-100/50' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              style={isActive('/admin') ? { color: config.primary_color, backgroundColor: `${config.primary_color}10` } : {}}
            >
              <span className="text-lg">🛠️</span>
              {!isCollapsed && <span className="text-sm">Painel Admin</span>}
            </Link>
          </nav>

          {/* Footer da Sidebar */}
          <div className="p-4 border-t border-gray-100 text-xs text-gray-400 text-center font-medium">
            {!isCollapsed ? 'Sorriso Perfeito © 2026' : 'v1.0'}
          </div>
        </aside>

        {/* Área Principal de Conteúdo */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-xl p-8 min-h-[80vh]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;