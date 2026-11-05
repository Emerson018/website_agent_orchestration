import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const heroContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.05,
    },
  },
};

const heroItemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const servicesData = [
  {
    name: 'Atendimento Individual',
    price: 'Sob consulta',
    description:
      'Sessão dedicada com horário reservado exclusivamente para a sua demanda.',
    badge: 'Mais procurado',
    image:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
    spanClass: 'lg:col-span-7',
    featured: true,
  },
  {
    name: 'Avaliação e Diagnóstico',
    price: 'Sob consulta',
    description:
      'Análise técnica detalhada com apresentação de etapas e prazos claros.',
    badge: 'Hora marcada',
    image:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
    spanClass: 'lg:col-span-5',
    featured: false,
  },
  {
    name: 'Agendamento Online Direto',
    price: 'Online',
    description:
      'Seleção imediata de data e horário disponível com confirmação automática.',
    badge: 'Hora marcada',
    image:
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80',
    spanClass: 'lg:col-span-12',
    featured: false,
  },
];

const operationalPillars = [
  {
    title: 'Atendimento individual preparado antes da sua chegada',
    summary:
      'Nossa equipe revisa a sua solicitação antes do horário marcado para conduzir uma sessão objetiva e sem atrasos.',
    metric: 'Sessão dedicada',
    detail: 'Zero fila de espera na recepção',
  },
  {
    title: 'Estrutura de decisão clara sobre etapas e valores',
    summary:
      'Você recebe o escopo completo da avaliação técnica e os horários disponíveis antes de confirmar o seu comparecimento.',
    metric: 'Escopo transparente',
    detail: 'Etapas definidas desde o primeiro contato',
  },
  {
    title: 'Reserva online integrada com confirmação imediata',
    summary:
      'Escolha o dia e a janela de atendimento pelo celular ou computador e garanta seu horário em poucos cliques.',
    metric: 'Agenda em tempo real',
    detail: 'Confirmação direta no sistema',
  },
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen font-sans antialiased selection:bg-[var(--primary-color)] selection:text-white"
      style={{
        backgroundColor: 'var(--bg-color)',
        color: 'var(--text-color)',
      }}
    >
      {/* 1. Bento Hero Mosaico */}
      <section
        id="inicio"
        className="scroll-mt-24 pt-8 pb-16 md:pt-12 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <motion.div
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5"
        >
          {/* Célula Principal (8 colunas) */}
          <motion.div
            variants={heroItemVariants}
            className="lg:col-span-8 rounded-2xl p-6 sm:p-10 md:p-12 border flex flex-col justify-between relative overflow-hidden"
            style={{
              backgroundColor: 'var(--surface-color)',
              borderColor: 'rgba(148, 163, 184, 0.16)',
            }}
          >
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-sm font-medium mb-6 border"
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  borderColor: 'rgba(99, 102, 241, 0.35)',
                  color: 'var(--text-color)',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                />
                <span>Atendimento com hora marcada na AppCustomizado</span>
              </div>

              <h1 className="font-display text-3xl sm:text-5xl lg:text-[3.35rem] font-bold tracking-tight leading-[1.08] mb-6">
                Serviços especializados com horário reservado e diagnóstico claro.
              </h1>

              <p
                className="text-base sm:text-lg leading-relaxed max-w-prose mb-8"
                style={{ color: 'var(--muted-color)' }}
              >
                Realize seu Atendimento Individual ou Avaliação e Diagnóstico sem fila de espera. Escolha o dia pelo celular ou computador e conte com preparo prévio da nossa equipe.
              </p>
            </div>

            <div className="relative z-10 pt-6 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              style={{ borderColor: 'rgba(148, 163, 184, 0.14)' }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
                  <Link
                    to="/agendar"
                    className="inline-flex items-center justify-center min-h-[48px] px-7 py-3.5 rounded-xl font-medium text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    Reservar horário online
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
                  <a
                    href="#destaques"
                    className="inline-flex items-center justify-center min-h-[48px] px-6 py-3.5 rounded-xl font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2"
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.55)',
                      borderColor: 'rgba(148, 163, 184, 0.24)',
                      color: 'var(--text-color)',
                    }}
                  >
                    Conhecer modalidades
                  </a>
                </motion.div>
              </div>

              <div className="text-sm" style={{ color: 'var(--muted-color)' }}>
                Confirmação direta na agenda
              </div>
            </div>
          </motion.div>

          {/* 2 Células Laterais Empilhadas (4 colunas) */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-5">
            {/* Célula Lateral 1: Imagem + Horário ao vivo */}
            <motion.div
              variants={heroItemVariants}
              className="rounded-2xl overflow-hidden border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--surface-color)',
                borderColor: 'rgba(148, 163, 184, 0.16)',
              }}
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"
                  alt="Ambiente de atendimento AppCustomizado"
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to top, var(--surface-color) 4%, rgba(15, 23, 42, 0.25) 60%, transparent 100%)',
                  }}
                />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                  <span
                    className="px-3 py-1 rounded-lg text-xs font-medium border backdrop-blur-md"
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      borderColor: 'rgba(148, 163, 184, 0.25)',
                      color: 'var(--text-color)',
                    }}
                  >
                    Unidade Centro
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <p
                  className="text-xs font-medium mb-1"
                  style={{ color: 'var(--muted-color)' }}
                >
                  Janela de funcionamento
                </p>
                <p className="font-display text-lg font-bold mb-3">
                  Segunda a Sábado das 9h às 18h
                </p>
                <p className="text-sm leading-snug" style={{ color: 'var(--muted-color)' }}>
                  Horários organizados para evitar espera e garantir pontualidade.
                </p>
              </div>
            </motion.div>

            {/* Célula Lateral 2: Localização rápida e contato */}
            <motion.div
              variants={heroItemVariants}
              className="rounded-2xl p-5 sm:p-6 border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--surface-color)',
                borderColor: 'rgba(148, 163, 184, 0.16)',
              }}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--muted-color)' }}
                  >
                    Endereço e acesso rápido
                  </span>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  />
                </div>
                <p className="font-display text-lg font-bold leading-snug mb-2">
                  Av. Principal, 1000 - Centro - Porto Alegre/RS
                </p>
                <p className="text-sm mb-4" style={{ color: 'var(--muted-color)' }}>
                  Telefone de suporte: (51) 99999-9999
                </p>
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/agendar"
                  className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2"
                  style={{
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                    borderColor: 'rgba(99, 102, 241, 0.4)',
                    color: 'var(--text-color)',
                  }}
                >
                  Consultar horários vagos
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* 2. Matriz Modular de Serviços */}
      <section
        id="destaques"
        className="scroll-mt-24 py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight mb-3">
              Modalidades de atendimento disponíveis para reserva
            </h2>
            <p
              className="text-base sm:text-lg max-w-prose"
              style={{ color: 'var(--muted-color)' }}
            >
              Selecione o serviço adequado para a sua necessidade e confirme sua data diretamente na plataforma.
            </p>
          </div>
          <div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
              <Link
                to="/agendar"
                className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2"
                style={{
                  backgroundColor: 'var(--surface-color)',
                  borderColor: 'rgba(148, 163, 184, 0.24)',
                  color: 'var(--text-color)',
                }}
              >
                Abrir calendário completo
              </Link>
            </motion.div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">
          {servicesData.map((service, idx) => (
            <motion.article
              key={service.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: idx * 0.08 }}
              className={`${service.spanClass} rounded-2xl border overflow-hidden flex flex-col justify-between`}
              style={{
                backgroundColor: 'var(--surface-color)',
                borderColor: service.featured
                  ? 'rgba(99, 102, 241, 0.45)'
                  : 'rgba(148, 163, 184, 0.16)',
              }}
            >
              <div
                className={`grid grid-cols-1 ${
                  idx === 2 ? 'md:grid-cols-12 items-center' : ''
                } h-full`}
              >
                <div
                  className={`${
                    idx === 2 ? 'md:col-span-5 h-56 md:h-full' : 'h-52'
                  } relative overflow-hidden`}
                >
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(15, 23, 42, 0.7) 0%, transparent 65%)',
                    }}
                  />
                  <div className="absolute top-4 left-4">
                    <span
                      className="px-3 py-1 rounded-lg text-xs font-medium border"
                      style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.85)',
                        borderColor: 'rgba(99, 102, 241, 0.45)',
                        color: 'var(--text-color)',
                      }}
                    >
                      {service.badge}
                    </span>
                  </div>
                </div>

                <div
                  className={`${
                    idx === 2 ? 'md:col-span-7' : ''
                  } p-6 sm:p-8 flex flex-col justify-between flex-1`}
                >
                  <div>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                      <h3 className="font-display text-xl sm:text-2xl font-bold">
                        {service.name}
                      </h3>
                      <span
                        className="px-3 py-1 rounded-lg text-sm font-semibold"
                        style={{
                          backgroundColor: 'rgba(99, 102, 241, 0.14)',
                          color: 'var(--text-color)',
                        }}
                      >
                        {service.price}
                      </span>
                    </div>

                    <p
                      className="text-base leading-relaxed max-w-prose mb-6"
                      style={{ color: 'var(--muted-color)' }}
                    >
                      {service.description}
                    </p>
                  </div>

                  <div
                    className="pt-4 border-t flex items-center justify-between gap-4"
                    style={{ borderColor: 'rgba(148, 163, 184, 0.14)' }}
                  >
                    <span
                      className="text-sm"
                      style={{ color: 'var(--muted-color)' }}
                    >
                      Disponível na unidade Centro
                    </span>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
                      <Link
                        to="/agendar"
                        className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                      >
                        Escolher este serviço
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* 3. Painel de Diferenciais Operacionais */}
      <section
        id="sobre"
        className="scroll-mt-24 py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45 }}
            className="lg:col-span-8 rounded-2xl p-6 sm:p-10 border"
            style={{
              backgroundColor: 'var(--surface-color)',
              borderColor: 'rgba(148, 163, 184, 0.16)',
            }}
          >
            <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight mb-4">
              Como funciona o padrão de atendimento na AppCustomizado
            </h2>
            <p
              className="text-base sm:text-lg leading-relaxed max-w-prose"
              style={{ color: 'var(--muted-color)' }}
            >
              Organizamos nossa operação para que você tenha previsibilidade de horário, clareza sobre cada etapa técnica e acompanhamento dedicado do início ao fim.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="lg:col-span-4 rounded-2xl p-6 sm:p-8 border flex flex-col justify-between"
            style={{
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              borderColor: 'rgba(99, 102, 241, 0.35)',
            }}
          >
            <div>
              <p
                className="text-sm font-medium mb-2"
                style={{ color: 'var(--muted-color)' }}
              >
                Segmento de atuação
              </p>
              <p className="font-display text-2xl font-bold mb-2">
                Serviços Especializados
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-color)' }}>
                Foco em Atendimento Individual, Avaliação e Diagnóstico e Agendamento Online Direto em Porto Alegre.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t" style={{ borderColor: 'rgba(99, 102, 241, 0.25)' }}>
              <span className="text-sm font-medium">
                Atendimento de Segunda a Sábado
              </span>
            </div>
          </motion.div>
        </div>

        {/* 3 Células Técnicas Lado a Lado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {operationalPillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: index * 0.1 }}
              className="rounded-2xl p-6 sm:p-8 border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--surface-color)',
                borderColor: 'rgba(148, 163, 184, 0.16)',
              }}
            >
              <div>
                <div className="inline-block px-3 py-1 rounded-lg text-xs font-medium mb-5 border"
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    borderColor: 'rgba(148, 163, 184, 0.2)',
                    color: 'var(--text-color)',
                  }}
                >
                  {pillar.metric}
                </div>
                <h3 className="font-display text-xl font-bold leading-snug mb-3">
                  {pillar.title}
                </h3>
                <p
                  className="text-sm sm:text-base leading-relaxed max-w-prose mb-6"
                  style={{ color: 'var(--muted-color)' }}
                >
                  {pillar.summary}
                </p>
              </div>

              <div
                className="pt-4 border-t text-xs font-medium"
                style={{
                  borderColor: 'rgba(148, 163, 184, 0.14)',
                  color: 'var(--muted-color)',
                }}
              >
                {pillar.detail}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. Barra de Ação & Atendimento Direto */}
      <section
        id="contato"
        className="scroll-mt-24 pt-8 pb-20 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5"
        >
          {/* Bloco Principal de Conversão (8 colunas) */}
          <div
            className="lg:col-span-8 rounded-2xl p-6 sm:p-10 md:p-12 border flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--surface-color)',
              borderColor: 'rgba(99, 102, 241, 0.4)',
            }}
          >
            <div className="max-w-xl mb-8">
              <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight mb-4">
                Reserve seu horário na AppCustomizado agora mesmo
              </h2>
              <p
                className="text-base sm:text-lg leading-relaxed max-w-prose"
                style={{ color: 'var(--muted-color)' }}
              >
                Acesse a agenda em tempo real, selecione entre Atendimento Individual ou Avaliação e Diagnóstico e confirme sua visita sem burocracia.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/agendar"
                  className="inline-flex items-center justify-center min-h-[48px] px-8 py-4 rounded-xl font-medium text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  Confirmar horário na agenda online
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Bloco de Dados de Atendimento (4 colunas) */}
          <div
            className="lg:col-span-4 rounded-2xl p-6 sm:p-8 border flex flex-col justify-between gap-6"
            style={{
              backgroundColor: 'var(--surface-color)',
              borderColor: 'rgba(148, 163, 184, 0.16)',
            }}
          >
            <div>
              <h3 className="font-display text-lg font-bold mb-4">
                Informações da unidade
              </h3>

              <div className="space-y-4 text-sm">
                <div>
                  <p style={{ color: 'var(--muted-color)' }}>Endereço</p>
                  <p className="font-medium mt-0.5">
                    Av. Principal, 1000 - Centro - Porto Alegre/RS
                  </p>
                </div>

                <div>
                  <p style={{ color: 'var(--muted-color)' }}>Horário de atendimento</p>
                  <p className="font-medium mt-0.5">
                    Segunda a Sábado das 9h às 18h
                  </p>
                </div>

                <div>
                  <p style={{ color: 'var(--muted-color)' }}>Telefone direto</p>
                  <p className="font-medium mt-0.5">(51) 99999-9999</p>
                </div>
              </div>
            </div>

            <div
              className="pt-4 border-t"
              style={{ borderColor: 'rgba(148, 163, 184, 0.14)' }}
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/agendar"
                  className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2"
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    borderColor: 'rgba(148, 163, 184, 0.24)',
                    color: 'var(--text-color)',
                  }}
                >
                  Ver datas disponíveis
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}