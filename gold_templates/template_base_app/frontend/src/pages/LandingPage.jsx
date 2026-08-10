import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const menuItems = [
    {
      id: 1,
      name: "Mini Burgers Salgados",
      description: "Mais de 15 sabores de mini hambúrgueres servidos em pães artesanais coloridos (Verde Alien, Vermelho Marte e Roxo Nebulosa). Sabores incluem Blend Bovino Premium, muito cheddar derretido, cebola caramelizada, bacon crocante, gorgonzola, costela desfiada e opções vegetarianas.",
      price: "Incluso no Rodízio",
      image: "https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?auto=format&fit=crop&w=400&q=80",
      tag: "Rodízio Livre"
    },
    {
      id: 2,
      name: "Mini Burgers Doces",
      description: "A sobremesa mais amada da galáxia! Mini pães doces com recheio generoso de Nutella com morangos frescos, Doce de Leite artesanal, Chocolate Branco Galáctico e marshmallow tostado no fogo.",
      price: "Incluso no Rodízio",
      image: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=400&q=80",
      tag: "Doce"
    },
    {
      id: 3,
      name: "Mini Pastéis & Espetinhos",
      description: "Pastéis sequinhos e crocantes fritos na hora nos sabores queijo, carne e pizza, além de espetinhos artesanais grelhados (carne bovina, frango com bacon e queijo coalho com melaço) servidos diretamente na mesa.",
      price: "Incluso no Rodízio",
      image: "https://images.unsplash.com/photo-1563379971899-660589a01cf3?auto=format&fit=crop&w=400&q=80",
      tag: "Petiscos"
    },
    {
      id: 4,
      name: "Sorvetes & Refil de Bebidas",
      description: "Buffet livre de sorvetes artesanais com caldas de chocolate e caramelo espacial, granulados e coberturas, além da opção de refil livre de refrigerantes, água e suco durante toda a sua permanência.",
      price: "Sob Consulta / Adicional",
      image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=400&q=80",
      tag: "Sobremesa/Bebidas"
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
      {/* Hero Section */}
      <section className="relative py-20 px-6 sm:px-12 flex flex-col md:flex-row items-center justify-between max-w-6xl mx-auto w-full gap-12">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full filter blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
        
        <div className="flex-1 text-left z-10">
          <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
            Marciano's Burguer 🛸
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight mt-6 leading-tight">
            O Maior Rodízio <br />
            de Mini Burgers do <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">
              Universo! 🍔✨
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg opacity-85 max-w-lg leading-relaxed">
            Venha se deliciar com nosso rodízio livre de mini hambúrgueres coloridos (salgados e doces), mini pastéis sequinhos, espetinhos grelhados e buffet de sorvetes. Tudo em um ambiente temático espacial instagramável com boliche integrado em Porto Alegre!
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
            <Link 
              to="/agendar"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:brightness-110 hover:shadow-primary/35 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Realizar reserva</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="flex-1 w-full max-w-md md:max-w-none flex justify-center z-10">
          <div className="relative p-2 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl shadow-primary/10 overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80" 
              alt="Rodízio de Mini Burgers Marcianos" 
              className="rounded-2xl max-h-[380px] object-cover transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-slate-950/90 backdrop-blur border border-slate-800 text-left">
              <span className="text-xs font-semibold text-primary">Estilo Único</span>
              <p className="text-sm font-bold mt-1">Mais de 20 sabores livres com pães coloridos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Diferenciais Section */}
      <section className="py-16 bg-slate-900/40 border-y border-slate-900 px-6 sm:px-12 w-full">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
          <div className="flex gap-4 items-start">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-lg">Temática & Diversão</h4>
              <p className="text-sm opacity-70 mt-1">Ambiente com luzes neon e temática alienígena incrível, além de pistas de boliche integradas.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-lg">Rodízio Super Completo</h4>
              <p className="text-sm opacity-70 mt-1">Mini burgers de dar água na boca, petiscos variados, pastéis e sobremesas inclusas.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-lg">Localização Privilegiada</h4>
              <p className="text-sm opacity-70 mt-1">Av. Padre Cacique, 580 - Menino Deus, Porto Alegre (ao lado do Estádio Beira-Rio).</p>
            </div>
          </div>
        </div>
      </section>

      {/* Menu/Rodízio Section */}
      <section className="py-24 px-6 sm:px-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">O que está incluso no seu Rodízio</h2>
          <p className="text-sm sm:text-base opacity-60 mt-3 max-w-md mx-auto">Prepare-se para uma viagem de sabores ilimitados que passam pela sua mesa.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {menuItems.map((item) => (
            <div 
              key={item.id}
              className="flex flex-col sm:flex-row gap-6 p-5 rounded-2xl border bg-slate-900 border-slate-800/80 transition-all duration-300 hover:border-primary/45 hover:-translate-y-1 text-left items-center sm:items-start"
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
                    <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-sm opacity-70 mt-2 line-clamp-3">{item.description}</p>
                </div>
                <div className="mt-4 flex items-center justify-between w-full pt-2 border-t border-slate-800/40">
                  <span className="text-xs opacity-50 uppercase font-semibold">Valor do Rodízio</span>
                  <span className="text-base font-black text-primary">{item.price}</span>
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
          <p className="text-sm opacity-70 mt-2 max-w-md mx-auto">Recomendamos reservar sua mesa para garantir pistas de boliche livres e evitar filas na entrada.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-12">
            <div className="flex flex-col items-center">
              <span className="w-10 h-10 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center justify-center font-bold text-lg">1</span>
              <h4 className="font-bold mt-4">Faça a Reserva Online</h4>
              <p className="text-xs opacity-70 mt-2">Escolha o dia, horário e quantidade de astronautas para sua mesa.</p>
            </div>
            <div className="flex flex-col items-center">
              <span className="w-10 h-10 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center justify-center font-bold text-lg">2</span>
              <h4 className="font-bold mt-4">Diga Sim ao Boliche</h4>
              <p className="text-xs opacity-70 mt-2">Indique em observações se deseja reservar horário para jogar boliche antes ou após comer.</p>
            </div>
            <div className="flex flex-col items-center">
              <span className="w-10 h-10 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center justify-center font-bold text-lg">3</span>
              <h4 className="font-bold mt-4">Aproveite Sem Limites</h4>
              <p className="text-xs opacity-70 mt-2">Nosso time servirá os mini burgers e acompanhamentos continuamente até você estar satisfeito.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Instagram feed simulation Section */}
      <section className="py-20 px-6 sm:px-12 max-w-6xl mx-auto w-full text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold">Siga @marcianos.burguer no Instagram</h2>
        <p className="text-sm opacity-60 mt-2">Acompanhe fotos reais de nossos clientes, boliches e novidades intergalácticas.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          {instagramPosts.map((url, i) => (
            <div key={i} className="relative group overflow-hidden rounded-2xl border border-slate-900 shadow-lg">
              <img 
                src={url} 
                alt={`Instagram Post ${i + 1}`} 
                className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <a 
                  href="https://www.instagram.com/marcianosoficial/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-3 rounded-full bg-primary text-white hover:scale-110 transition-transform"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 px-6 sm:px-12 bg-primary/5 border border-primary/10 rounded-3xl max-w-5xl mx-auto w-full my-10 text-center flex flex-col items-center">
        <h3 className="text-2xl font-bold">Ficou com fome de outro planeta?</h3>
        <p className="text-sm opacity-80 mt-3 max-w-md">Reserve a sua mesa agora mesmo e venha desfrutar do melhor rodízio livre de mini burgers com sua equipe ou família!</p>
        <Link 
          to="/agendar"
          className="mt-8 px-8 py-4 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:brightness-105 transition-all"
        >
          Realizar reserva
        </Link>
      </section>
    </div>
  );
}
