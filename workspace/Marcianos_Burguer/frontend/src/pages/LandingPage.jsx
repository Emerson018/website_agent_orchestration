import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col font-sans">
      {/* Hero Section */}
      <section className="relative py-20 px-6 sm:px-12 flex flex-col items-center text-center max-w-5xl mx-auto">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary/10 rounded-full filter blur-3xl pointer-events-none"></div>
        <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
          Bem-vindo
        </span>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mt-6 leading-tight">
          Realce Sua Beleza Natural Com Nossos Tratamentos
        </h1>
        <p className="mt-6 text-base sm:text-lg opacity-85 max-w-2xl leading-relaxed">
          Descubra a melhor versão de si mesma na Marcianos Burguer. Clínicas de estética facial, corporal e tratamentos de alta performance.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link 
            to="/agendar"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:brightness-110 hover:shadow-primary/35 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Agendar Horário</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Serviços Section */}
      <section className="py-20 border-t border-gray-900/10 dark:border-gray-800/80 px-6 sm:px-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold">Nossos Serviços</h2>
          <p className="text-xs sm:text-sm opacity-60 mt-2">Diferenciais e cuidados que fazem a diferença no seu dia</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
        <div className="p-6 rounded-2xl border bg-white border-stone-100 shadow-sm transition-all duration-300 hover:-translate-y-1 text-left">
          <h4 className="text-lg font-bold text-primary">Limpeza de Pele Profunda</h4>
          <p className="text-sm opacity-80 mt-2">Remoção de impurezas, hidratação profunda e renovação celular.</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs opacity-60 font-semibold uppercase tracking-wider">Valor</span>
            <span className="text-sm font-black text-primary">R$ 120</span>
          </div>
        </div>
        
        <div className="p-6 rounded-2xl border bg-white border-stone-100 shadow-sm transition-all duration-300 hover:-translate-y-1 text-left">
          <h4 className="text-lg font-bold text-primary">Massagem Modeladora</h4>
          <p className="text-sm opacity-80 mt-2">Redução de medidas, drenagem linfática e tonificação corporal.</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs opacity-60 font-semibold uppercase tracking-wider">Valor</span>
            <span className="text-sm font-black text-primary">R$ 150</span>
          </div>
        </div>
        
        <div className="p-6 rounded-2xl border bg-white border-stone-100 shadow-sm transition-all duration-300 hover:-translate-y-1 text-left">
          <h4 className="text-lg font-bold text-primary">Toxina Botulínica</h4>
          <p className="text-sm opacity-80 mt-2">Prevenção e suavização de linhas de expressão com naturalidade.</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs opacity-60 font-semibold uppercase tracking-wider">Valor</span>
            <span className="text-sm font-black text-primary">Consulte</span>
          </div>
        </div>
        
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 px-6 sm:px-12 bg-primary/5 border border-primary/10 rounded-3xl max-w-5xl mx-auto w-full my-10 text-center flex flex-col items-center">
        <h3 className="text-2xl font-bold">Pronto para ter uma experiência incrível?</h3>
        <p className="text-sm opacity-80 mt-3 max-w-md">Escolha o melhor dia, horário e o profissional da sua preferência diretamente no nosso sistema.</p>
        <Link 
          to="/agendar"
          className="mt-8 px-6 py-3 rounded-lg bg-primary text-white font-bold shadow-md hover:brightness-105 transition-all"
        >
          Iniciar Agendamento Online
        </Link>
      </section>
    </div>
  );
}
