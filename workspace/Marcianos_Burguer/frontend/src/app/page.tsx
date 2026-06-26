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
      app_name: 'Marcianos Burguer',
      primary_color: '#6366f1',
      secondary_color: '#FFFFFF',
    };
  }
}

export default async function LandingPage() {
  const config = await getConfig();

  const menuItems = [
    {
      id: 1,
      name: "Mini Burgers Salgados",
      description: "Mais de 15 sabores de mini hambúrgueres servidos em pães artesanais coloridos (Verde Alien, Vermelho Marte e Roxo Nebulosa). Sabores incluem Blend Bovino Premium, cheddar derretido, cebola caramelizada, bacon crocante e opções vegetarianas.",
      price: "Incluso no Rodízio",
      image: "https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?auto=format&fit=crop&w=400&q=80",
      tag: "Rodízio Livre"
    },
    {
      id: 2,
      name: "Mini Burgers Doces",
      description: "A sobremesa mais amada da galáxia! Mini pães doces com recheio generoso de Nutella com morangos frescos, Doce de Leite artesanal, Chocolate Branco Galáctico e marshmallow tostado.",
      price: "Incluso no Rodízio",
      image: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=400&q=80",
      tag: "Doce"
    },
    {
      id: 3,
      name: "Mini Pastéis & Espetinhos",
      description: "Pastéis sequinhos e crocantes fritos na hora nos sabores queijo, carne e pizza, além de espetinhos artesanais grelhados (carne bovina, frango com bacon e queijo coalho com melaço).",
      price: "Incluso no Rodízio",
      image: "https://images.unsplash.com/photo-1563379971899-660589a01cf3?auto=format&fit=crop&w=400&q=80",
      tag: "Petiscos"
    },
    {
      id: 4,
      name: "Sorvetes & Refil de Bebidas",
      description: "Buffet livre de sorvetes artesanais com caldas de chocolate e caramelo espacial, além da opção de refil livre de refrigerantes, água e suco durante toda a sua permanência.",
      price: "Sob Consulta / Adicional",
      image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=400&q=80",
      tag: "Bebidas"
    }
  ];

  const instagramPosts = [
    "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1538510122447-24839e4871ef?auto=format&fit=crop&w=300&q=80"
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>🛸</span> {config.app_name}
        </h1>
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
            Início
          </Link>
          <Link href="/agendar" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
            Agendar
          </Link>
          <Link href="/admin/dashboard" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
            Painel
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-6 sm:px-12 flex flex-col md:flex-row items-center justify-between max-w-6xl mx-auto w-full gap-12">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none"></div>
        
        <div className="flex-1 text-left z-10">
          <span 
            className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border"
            style={{ 
              color: config.primary_color, 
              backgroundColor: `${config.primary_color}1a`,
              borderColor: `${config.primary_color}33`
            }}
          >
            {config.app_name} 🛸
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight mt-6 leading-tight">
            O Maior Rodízio <br />
            de Mini Burgers do <br />
            <span 
              className="text-transparent bg-clip-text bg-gradient-to-r"
              style={{ backgroundImage: `linear-gradient(to right, ${config.primary_color}, #818cf8)` }}
            >
              Universo! 🍔✨
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg opacity-85 max-w-lg leading-relaxed text-slate-300">
            Venha se deliciar com nosso rodízio livre de mini hambúrgueres coloridos (salgados e doces), mini pastéis sequinhos, espetinhos grelhados e buffet de sorvetes. Tudo em um ambiente temático espacial instagramável com boliche integrado em Porto Alegre!
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
            <Link 
              href="/agendar"
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-white font-bold shadow-lg transition-all hover:brightness-110 flex items-center justify-center gap-2 group cursor-pointer"
              style={{ 
                backgroundColor: config.primary_color,
                boxShadow: `0 10px 15px -3px ${config.primary_color}40`
              }}
            >
              <span>Realizar reserva</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="flex-1 w-full max-w-md md:max-w-none flex justify-center z-10">
          <div className="relative p-2 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80" 
              alt="Rodízio de Mini Burgers Marcianos" 
              className="rounded-2xl max-h-[380px] object-cover transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-slate-950/90 backdrop-blur border border-slate-800 text-left">
              <span className="text-xs font-semibold" style={{ color: config.primary_color }}>Estilo Único</span>
              <p className="text-sm font-bold mt-1">Mais de 20 sabores livres com pães coloridos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Diferenciais Section */}
      <section className="py-16 bg-slate-900/40 border-y border-slate-900 px-6 sm:px-12 w-full">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
          <div className="flex gap-4 items-start">
            <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-lg">Temática & Diversão</h4>
              <p className="text-sm opacity-70 mt-1 text-slate-300">Ambiente com luzes neon e temática alienígena incrível, além de pistas de boliche integradas.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-lg">Rodízio Super Completo</h4>
              <p className="text-sm opacity-70 mt-1 text-slate-300">Mini burgers de dar água na boca, petiscos variados, pastéis e sobremesas inclusas.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-lg">Localização Privilegiada</h4>
              <p className="text-sm opacity-70 mt-1 text-slate-300">Av. Padre Cacique, 580 - Menino Deus, Porto Alegre (ao lado do Estádio Beira-Rio).</p>
            </div>
          </div>
        </div>
      </section>

      {/* Menu/Rodízio Section */}
      <section className="py-24 px-6 sm:px-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">O que está incluso no seu Rodízio</h2>
          <p className="text-sm sm:text-base opacity-60 mt-3 max-w-md mx-auto text-slate-300">Prepare-se para uma viagem de sabores ilimitados que passam pela sua mesa.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {menuItems.map((item) => (
            <div 
              key={item.id}
              className="flex flex-col sm:flex-row gap-6 p-5 rounded-2xl border bg-slate-900 border-slate-800/80 transition-all duration-300 hover:border-indigo-500/40 hover:-translate-y-1 text-left items-center sm:items-start"
            >
              <img 
                src={item.image} 
                alt={item.name} 
                className="w-32 h-32 rounded-xl object-cover border border-slate-800 shadow"
              />
              <div className="flex-1 flex flex-col justify-between h-full w-full">
                <div>
                  <div className="flex items-center justify-between w-full">
                    <h3 className="text-xl font-bold text-slate-100">{item.name}</h3>
                    <span 
                      className="text-xs font-bold border px-2.5 py-0.5 rounded-full"
                      style={{ 
                        color: config.primary_color, 
                        backgroundColor: `${config.primary_color}1a`, 
                        borderColor: `${config.primary_color}33`
                      }}
                    >
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-sm opacity-70 mt-2 text-slate-300">{item.description}</p>
                </div>
                <div className="mt-4 flex items-center justify-between w-full pt-2 border-t border-slate-800/40">
                  <span className="text-xs opacity-50 uppercase font-semibold">Valor do Rodízio</span>
                  <span className="text-base font-black" style={{ color: config.primary_color }}>{item.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Como Funciona Section */}
      <section className="py-20 bg-slate-900/20 border-t border-slate-900 px-6 sm:px-12 w-full text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold">Como Funciona a sua Visita</h2>
          <p className="text-sm opacity-70 mt-2 max-w-md mx-auto text-slate-300">Recomendamos reservar sua mesa para garantir pistas de boliche livres e evitar filas na entrada.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-12">
            <div className="flex flex-col items-center">
              <span 
                className="w-10 h-10 rounded-full border flex items-center justify-center font-bold text-lg"
                style={{ 
                  color: config.primary_color, 
                  backgroundColor: `${config.primary_color}15`, 
                  borderColor: `${config.primary_color}30` 
                }}
              >
                1
              </span>
              <h4 className="font-bold mt-4">Faça a Reserva Online</h4>
              <p className="text-xs opacity-70 mt-2 text-slate-300">Escolha o dia, horário e quantidade de astronautas para sua mesa.</p>
            </div>
            <div className="flex flex-col items-center">
              <span 
                className="w-10 h-10 rounded-full border flex items-center justify-center font-bold text-lg"
                style={{ 
                  color: config.primary_color, 
                  backgroundColor: `${config.primary_color}15`, 
                  borderColor: `${config.primary_color}30` 
                }}
              >
                2
              </span>
              <h4 className="font-bold mt-4">Diga Sim ao Boliche</h4>
              <p className="text-xs opacity-70 mt-2 text-slate-300">Indique em observações se deseja reservar horário para jogar boliche.</p>
            </div>
            <div className="flex flex-col items-center">
              <span 
                className="w-10 h-10 rounded-full border flex items-center justify-center font-bold text-lg"
                style={{ 
                  color: config.primary_color, 
                  backgroundColor: `${config.primary_color}15`, 
                  borderColor: `${config.primary_color}30` 
                }}
              >
                3
              </span>
              <h4 className="font-bold mt-4">Aproveite Sem Limites</h4>
              <p className="text-xs opacity-70 mt-2 text-slate-300">Nosso time servirá os mini burgers continuamente até você estar satisfeito.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500">
        <p>© 2026 {config.app_name}. Todos os direitos reservados. Feito com tecnologia de orquestração de IA.</p>
      </footer>
    </div>
  );
}
