import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import config from '../../ai_config.json';

// Variantes para orquestração da entrada do Hero
const heroContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const heroItemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.75,
      ease: [0.16, 1, 0.3, 1], // Curva spring suave natural
    },
  },
};

export default function LandingPage() {
  const [showFloatingPill, setShowFloatingPill] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Exibe a barra de reserva flutuante após rolar 450px
      setShowFloatingPill(window.scrollY > 450);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const cuts = [
    {
      title: 'O Lendário 20barra9',
      category: 'Burger Artesanal na Brasa',
      price: 'R$ 48',
      desc: 'Blend nobre de costela e peito moído na casa, queijo colonial gaúcho tostado, maionese defumada e pão brioche amanteigado selado na grelha.',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
      badge: 'Favorito da Casa'
    },
    {
      title: 'Bife de Tira na Brasa',
      category: 'Corte Especial de Parrilla',
      price: 'R$ 96',
      desc: 'Corte nobre transversal da costela, com marmoreio intenso, crosta tostada no fogo forte, servido com flor de sal e chimichurri fresco.',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
      badge: 'Angus Certificado'
    },
    {
      title: 'Entrecôte com Batatas Rústicas',
      category: 'Tradição Gaúcha',
      price: 'R$ 88',
      desc: 'Suculência e maciez no ponto rosado perfeito, acompanhado de batatas douradas na manteiga de garrafa e alecrim da horta.',
      image: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=800&q=80',
      badge: 'Clássico'
    },
    {
      title: 'Chopps Artesanais & Coquetéis',
      category: 'Bar & Torneiras Locais',
      price: 'A partir de R$ 18',
      desc: 'Torneiras rotativas das melhores microcervejarias do estado, além de coquetelaria autoral criada para harmonizar com carnes defumadas.',
      image: 'https://images.unsplash.com/photo-1538488881522-4326c36460f3?auto=format&fit=crop&w=800&q=80',
      badge: 'Torneiras Vivas'
    }
  ];

  return (
    <div className="w-full bg-[#0E0D0C] text-[#F5F4F0] overflow-hidden selection:bg-[#E55A1B] selection:text-white">
      {/* 1. HERO SECTION CINEMATOGRÁFICA COM STAGGER & FIRE GLOW */}
      <section id="inicio" className="relative min-h-[92vh] flex items-center justify-center pt-10 pb-24 px-4 sm:px-6 lg:px-8 scroll-mt-24">
        {/* Background Image com Zoom Lento e Scrim Profundo */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.img
            initial={{ scale: 1.08, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
            src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1920&q=85"
            alt="Parrilla e carnes na brasa"
            className="w-full h-full object-cover object-center filter brightness-[0.36] contrast-[1.12]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0E0D0C] via-[#0E0D0C]/60 to-transparent"></div>
          <div className="absolute inset-0 bg-radial-at-c from-transparent via-[#0E0D0C]/40 to-[#0E0D0C]"></div>
        </div>

        {/* Conteúdo Hero com Coreografia de Entrada */}
        <motion.div
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-4xl mx-auto text-center space-y-6"
        >
          {/* Badge com Pulso Suave */}
          <motion.div variants={heroItemVariants} className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1F1C19]/80 border border-[#E55A1B]/40 backdrop-blur-md shadow-lg shadow-[#E55A1B]/10">
              <span className="text-sm animate-pulse">🔥</span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#E55A1B]">
                Fogo no Ponto & Parrilla Acesa
              </span>
            </div>
          </motion.div>

          {/* Título de Impacto */}
          <motion.h1
            variants={heroItemVariants}
            className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#F5F4F0] leading-[1.08]"
          >
            Fogo, brasa e carnes nobres{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E55A1B] via-[#F97316] to-[#D97706]">
              sem frescura.
            </span>
          </motion.h1>

          {/* Subtítulo */}
          <motion.p
            variants={heroItemVariants}
            className="text-base sm:text-xl text-[#D6D3D1] max-w-2xl mx-auto leading-relaxed font-normal"
          >
            Hambúrgueres artesanais na brasa, cortes especiais na parrilla e torneiras de chopp gelado. O ritual autêntico da carne bem feita em Porto Alegre.
          </motion.p>

          {/* Ações com Efeito de Pulsação de Brasa (Fire Glow) */}
          <motion.div
            variants={heroItemVariants}
            className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 0px 0px rgba(229, 90, 27, 0.4)',
                  '0 0 30px 8px rgba(229, 90, 27, 0.35)',
                  '0 0 0px 0px rgba(229, 90, 27, 0.4)',
                ],
              }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              className="w-full sm:w-auto rounded-full"
            >
              <Link
                to="/agendar"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-base font-bold bg-[#E55A1B] hover:bg-[#C2410C] text-white transition-all duration-200 active:scale-95"
              >
                <span>Reservar uma Mesa</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </motion.div>

            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              href="#cardapio"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full text-base font-semibold bg-[#1F1C19]/90 hover:bg-[#2A2622] text-[#F5F4F0] border border-[#2E2924] backdrop-blur-sm transition-colors"
            >
              <span>Conhecer o Cardápio</span>
              <svg className="w-4 h-4 text-[#A8A29E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </motion.a>
          </motion.div>

          {/* Micro Pilares em Linha */}
          <motion.div
            variants={heroItemVariants}
            className="pt-10 grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-[#262320]/80 max-w-2xl mx-auto text-left"
          >
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#E55A1B] uppercase tracking-wider">100% Angus</p>
              <p className="text-xs text-[#A8A29E]">Cortes nobres com procedência garantida</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#E55A1B] uppercase tracking-wider">Lenha & Carvão</p>
              <p className="text-xs text-[#A8A29E]">Defumação natural e crosta perfeita</p>
            </div>
            <div className="col-span-2 md:col-span-1 space-y-1">
              <p className="text-xs font-bold text-[#E55A1B] uppercase tracking-wider">Chopps Locais</p>
              <p className="text-xs text-[#A8A29E]">Torneiras artesanais selecionadas</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* 2. SOBRE A CASA / A CULTURA DO FOGO COM SCROLL REVEAL */}
      <section id="experiencia" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="lg:col-span-6 space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1816] border border-[#2E2924] text-xs font-medium text-[#D97706]">
              <span>Origem Gaúcha</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F5F4F0] leading-tight">
              Onde o fogo encontra o ponto ideal.
            </h2>
            <p className="text-base text-[#D6D3D1] leading-relaxed">
              No 20barra9, acreditamos no poder de reunir pessoas em torno da brasa. Não usamos atalhos, frituras ou temperos artificiais: aqui o protagonista é o calor intenso, o sal grosso na medida certa e o ponto exato da carne.
            </p>
            <p className="text-sm text-[#A8A29E] leading-relaxed">
              Das mesas comunitárias ao balcão com vista para a grelha, cada detalhe foi pensado para criar uma atmosfera viva, descontraída e acolhedora para famílias, amigos e encontros com boa comida.
            </p>

            <div className="pt-2 flex flex-wrap gap-4 text-xs text-[#F5F4F0] font-semibold">
              <span className="flex items-center gap-2 bg-[#1A1816] px-3.5 py-2 rounded-lg border border-[#2E2924]">
                ✨ Ambiente Descontraído & Pet Friendly
              </span>
              <span className="flex items-center gap-2 bg-[#1A1816] px-3.5 py-2 rounded-lg border border-[#2E2924]">
                🥩 Cozinha Aberta com Visão da Grelha
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="lg:col-span-6 relative"
          >
            <div className="relative rounded-2xl overflow-hidden border border-[#2E2924] shadow-2xl group">
              <img
                src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80"
                alt="Parrilla e corte especial de carne"
                className="w-full h-[420px] object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0E0D0C]/85 via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-[#171513]/90 backdrop-blur-md border border-[#2E2924]/80">
                <p className="text-xs font-semibold text-[#E55A1B] uppercase tracking-wider">A Promessa da Casa</p>
                <p className="text-sm text-[#F5F4F0] font-medium mt-1">
                  "Carne de verdade, no ponto que você pedir, com o calor que só a brasa de lenha é capaz de entregar."
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. VITRINE DE CORTES & DESTAQUES (#cardapio) COM CARDS ANIMADOS */}
      <section id="cardapio" className="py-24 bg-[#121110] border-y border-[#262320] scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-14"
          >
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1F1C19] border border-[#2E2924] text-xs font-semibold text-[#E55A1B]">
                Seleção do Chef
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F5F4F0]">
                Cortes & Especialidades da Brasa
              </h2>
              <p className="text-sm text-[#A8A29E] max-w-xl">
                Pratos preparados na grelha no momento do pedido. Da suculência do hambúrguer ao marmoreio dos cortes nobres.
              </p>
            </div>
            <div>
              <Link
                to="/agendar"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#E55A1B] hover:text-[#F97316] transition-colors group"
              >
                <span>Garantir Mesa para Provar</span>
                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </motion.div>

          {/* Grid de Cards com Animação ao Entrar no Viewport e Hover 3D */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cuts.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: idx * 0.12 }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                className="group flex flex-col bg-[#181614] rounded-2xl overflow-hidden border border-[#2E2924] hover:border-[#E55A1B]/60 hover:shadow-2xl hover:shadow-[#E55A1B]/15 transition-all duration-300"
              >
                {/* Imagem do Prato com Zoom Cinemático */}
                <div className="relative h-52 overflow-hidden bg-[#1F1C19]">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                  />
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#0E0D0C]/85 backdrop-blur-md border border-[#2E2924] text-[11px] font-bold text-[#E55A1B]">
                    {item.badge}
                  </div>
                </div>

                {/* Dados do Item */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#D97706]">
                      {item.category}
                    </span>
                    <h3 className="font-display text-lg font-bold text-[#F5F4F0] group-hover:text-[#E55A1B] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#A8A29E] leading-relaxed line-clamp-3">
                      {item.desc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#262320] flex items-center justify-between">
                    <span className="text-base font-extrabold text-[#F5F4F0]">
                      {item.price}
                    </span>
                    <motion.div whileTap={{ scale: 0.94 }}>
                      <Link
                        to="/agendar"
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#262320] group-hover:bg-[#E55A1B] group-hover:text-white text-[#D6D3D1] transition-all"
                      >
                        Reservar
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. GALERIA DA EXPERIÊNCIA & AMBIENTE */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto space-y-3 mb-14"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-[#E55A1B]">
            A Atmosfera da Casa
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F5F4F0]">
            Mais do que comida: um ponto de encontro.
          </h2>
          <p className="text-sm text-[#A8A29E]">
            Música boa, atendimento caloroso e luz na medida certa para você curtir momentos memoráveis.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Salão & Varanda',
              desc: 'Espaços ventilados, confortáveis e acolhedores.',
              img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
            },
            {
              title: 'O Espetáculo da Brasa',
              desc: 'Cortes preparados na sua frente pelos nossos assadores.',
              img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
            },
            {
              title: 'Coquetelaria & Bar',
              desc: 'Drinks clássicos e combinações autorais para o happy hour.',
              img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
            },
          ].map((gal, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              whileHover={{ y: -4 }}
              className="relative rounded-2xl overflow-hidden border border-[#2E2924] group h-72 shadow-lg"
            >
              <img
                src={gal.img}
                alt={gal.title}
                className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-600"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0E0D0C]/90 via-transparent to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-sm font-bold text-[#F5F4F0]">{gal.title}</p>
                <p className="text-xs text-[#A8A29E]">{gal.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 5. LOCALIZAÇÃO & RESERVA RÁPIDA (#contato) */}
      <section id="contato" className="py-24 bg-[#121110] border-t border-[#262320] scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="bg-gradient-to-br from-[#1A1816] to-[#121110] rounded-3xl border border-[#2E2924] p-8 sm:p-12 shadow-2xl"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1F1C19] border border-[#2E2924] text-xs font-semibold text-[#E55A1B]">
                  Venha nos Visitar
                </div>
                <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F5F4F0] leading-tight">
                  Pronto para uma experiência autêntica de fogo?
                </h2>
                <p className="text-sm sm:text-base text-[#D6D3D1] leading-relaxed">
                  Evite filas e garanta o melhor lugar para você e seu grupo. Seja para comemorar um aniversário, um almoço executivo ou um jantar descontraído a dois.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-[#141211] border border-[#262320]">
                    <p className="text-xs text-[#78716C] uppercase tracking-wider font-semibold">Onde Estamos</p>
                    <p className="text-sm font-medium text-[#F5F4F0] mt-1">{config.address || "Rua Silva Jardim, 167 - Mont'Serrat"}</p>
                    <p className="text-xs text-[#A8A29E]">Porto Alegre/RS</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#141211] border border-[#262320]">
                    <p className="text-xs text-[#78716C] uppercase tracking-wider font-semibold">Horário da Cozinha</p>
                    <p className="text-sm font-medium text-[#F5F4F0] mt-1">{config.working_hours || 'Terça a Domingo das 18h às 23h30'}</p>
                    <p className="text-xs text-[#A8A29E]">Bar aberto até meia-noite</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-[#141211] border border-[#262320] text-center space-y-5">
                <div className="w-12 h-12 rounded-full bg-[#E55A1B]/15 border border-[#E55A1B]/30 flex items-center justify-center text-2xl">
                  📅
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-[#F5F4F0]">
                    Reserva Online Instantânea
                  </h3>
                  <p className="text-xs text-[#A8A29E] mt-1">
                    Escolha a data, o melhor horário e a quantidade de pessoas em poucos segundos.
                  </p>
                </div>

                <motion.div whileTap={{ scale: 0.96 }} className="w-full">
                  <Link
                    to="/agendar"
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-[#E55A1B] hover:bg-[#C2410C] text-white shadow-lg shadow-[#E55A1B]/25 transition-all"
                  >
                    <span>Reservar Mesa Agora</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </motion.div>

                <p className="text-[11px] text-[#78716C]">
                  Dúvidas ou grupos maiores? Fale no WhatsApp: <span className="text-[#D6D3D1] font-semibold">{config.phone || '(51) 99320-2009'}</span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 6. FLOATING RESERVATION PILL (MOBILE ONLY) */}
      <AnimatePresence>
        {showFloatingPill && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-5 left-4 right-4 sm:hidden z-50 flex justify-center"
          >
            <Link
              to="/agendar"
              className="w-full max-w-sm flex items-center justify-between px-5 py-3.5 rounded-full bg-[#E55A1B] text-white font-bold text-sm shadow-2xl shadow-[#E55A1B]/50 active:scale-95 transition-transform border border-white/20 backdrop-blur-md"
            >
              <div className="flex items-center gap-2">
                <span>🔥</span>
                <span>Reservar Mesa no 20barra9</span>
              </div>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
