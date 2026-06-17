import React from 'react';
import { Link } from 'react-router-dom';
import config from '../../ai_config.json';

function LandingPage() {
  const primaryColor = config.primary_color || '#007A78';

  const servicos = [
    {
      title: "Clareamento & Estética",
      desc: "Tratamentos modernos para devolver o brilho e a brancura natural aos seus dentes.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 113.536 0V21h2v-2.172a5 5 0 013.536-1.628z"></path>
        </svg>
      )
    },
    {
      title: "Ortodontia Invisível",
      desc: "Alinhadores transparentes sob medida para alinhar o seu sorriso com discrição e conforto.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
        </svg>
      )
    },
    {
      title: "Implantes & Próteses",
      desc: "Reabilitação oral completa com tecnologia de ponta para recuperar a funcionalidade e autoestima.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-16 py-4">
      {/* Seção Hero */}
      <div className="flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 flex flex-col items-start gap-6">
          <span 
            style={{ color: primaryColor, backgroundColor: `${primaryColor}15` }}
            className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase"
          >
            Clínica Odontológica Integrada
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
            Seu sorriso perfeito <br />
            <span style={{ color: primaryColor }}>começa com cuidado.</span>
          </h2>
          <p className="text-base text-gray-500 leading-relaxed max-w-lg">
            No **Sorriso Perfeito**, unimos tecnologia odontológica de ponta a um atendimento acolhedor para transformar a sua saúde bucal. Agende sua avaliação de forma 100% online em poucos cliques.
          </p>
          
          <div className="flex flex-wrap gap-4 w-full sm:w-auto">
            <Link 
              to="/agendar" 
              style={{ backgroundColor: primaryColor }}
              className="px-8 py-3.5 text-white font-semibold rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center gap-2 group"
            >
              Agendar Avaliação
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </Link>
            
            <a 
              href="#servicos" 
              className="px-8 py-3.5 bg-gray-50 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-all"
            >
              Conhecer Serviços
            </a>
          </div>
        </div>

        {/* Imagem Ilustrativa / Card Destaque */}
        <div className="flex-1 relative w-full max-w-md md:max-w-none">
          <div 
            style={{ backgroundColor: `${primaryColor}20` }}
            className="absolute -inset-4 rounded-3xl transform rotate-2 -z-10"
          ></div>
          <img 
            src="https://images.unsplash.com/photo-1461530751291-6897f0044c5b?auto=format&fit=crop&q=80&w=800"
            alt="Consultório Moderno"
            className="rounded-2xl shadow-xl w-full object-cover aspect-[4/3] border border-white"
          />
          {/* Badge Informativo Flutuante */}
          <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex items-center gap-3">
            <div style={{ backgroundColor: primaryColor }} className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl">
              ⭐
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Avaliação Google</p>
              <p className="text-sm font-bold text-gray-900">4.9 / 5.0 (480+ avaliações)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Seção Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 bg-gray-50 p-8 rounded-2xl border border-gray-100 shadow-inner">
        <div className="text-center">
          <h3 style={{ color: primaryColor }} className="text-3xl font-black">+10.000</h3>
          <p className="text-xs font-semibold text-gray-400 uppercase mt-1">Sorrisos Criados</p>
        </div>
        <div className="text-center">
          <h3 style={{ color: primaryColor }} className="text-3xl font-black">15 Anos</h3>
          <p className="text-xs font-semibold text-gray-400 uppercase mt-1">De Experiência</p>
        </div>
        <div className="text-center">
          <h3 style={{ color: primaryColor }} className="text-3xl font-black">100%</h3>
          <p className="text-xs font-semibold text-gray-400 uppercase mt-1">Online e Integrado</p>
        </div>
        <div className="text-center">
          <h3 style={{ color: primaryColor }} className="text-3xl font-black">Equipe</h3>
          <p className="text-xs font-semibold text-gray-400 uppercase mt-1">De Especialistas</p>
        </div>
      </div>

      {/* Seção Serviços */}
      <div id="servicos" className="flex flex-col gap-8">
        <div className="text-center max-w-xl mx-auto flex flex-col gap-3">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Especialidades Sorriso Perfeito</h2>
          <p className="text-sm text-gray-400 font-medium">Tratamentos odontológicos integrados para você e toda a sua família.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {servicos.map((serv, index) => (
            <div key={index} className="p-6 bg-white border border-gray-150 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col items-start gap-4">
              <div 
                style={{ color: primaryColor, backgroundColor: `${primaryColor}15` }}
                className="p-3 rounded-xl"
              >
                {serv.icon}
              </div>
              <h4 className="text-lg font-bold text-gray-900">{serv.title}</h4>
              <p className="text-xs text-gray-400 leading-relaxed font-medium">{serv.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
