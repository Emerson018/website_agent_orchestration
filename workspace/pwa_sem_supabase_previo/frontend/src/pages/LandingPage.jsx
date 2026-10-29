import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="w-full bg-[var(--bg-color)] text-[var(--text-color)] font-sans selection:bg-[var(--primary-color)] selection:text-white">
      {/* Abertura Editorial Assimétrica com Motion Hero */}
      <section id="inicio" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 lg:py-24 border-b border-[var(--border-color)] scroll-mt-24">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center"
        >
          <div className="lg:col-span-7 space-y-6 text-left">
            <p className="text-sm font-medium text-[var(--primary-color)]">
              Serviços Especializados · PWA Sem Supabase Previo
            </p>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-color)] leading-[1.08]">
              Atendimento com hora marcada na PWA Sem Supabase Previo
            </h1>

            <p className="text-base sm:text-lg text-[var(--muted-color)] max-w-2xl leading-relaxed">
              Escolha o serviço e reserve o melhor dia e horário diretamente pelo navegador.
            </p>

            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                to="/agendar"
                className="inline-flex items-center justify-center px-8 py-4 min-h-[48px] rounded-xl text-base font-bold bg-[var(--primary-color)] hover:brightness-110 text-white shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]"
              >
                Reservar horário
              </Link>

              <a
                href="#destaques"
                className="inline-flex items-center justify-center px-6 py-4 min-h-[48px] rounded-xl text-base font-semibold bg-[var(--surface-color)] text-[var(--text-color)] border border-[var(--border-color)] hover:border-[var(--primary-color)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]"
              >
                Ver especialidades e valores
              </a>
            </div>

            <dl className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[var(--border-color)] text-sm">
              <div>
                <dt className="font-semibold text-[var(--text-color)]">Funcionamento</dt>
                <dd className="text-[var(--muted-color)] mt-0.5">Segunda a Sábado das 9h às 18h</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--text-color)]">Localização</dt>
                <dd className="text-[var(--muted-color)] mt-0.5">Av. Principal, 1000 - Centro - Porto Alegre/RS</dd>
              </div>
            </dl>
          </div>

          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] shadow-lg">
              <img
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"
                alt="PWA Sem Supabase Previo"
                className="w-full h-[380px] sm:h-[460px] object-cover"
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Quadro de Especialidades & Preços (Estrutura Linear Informativa com Motion InView) */}
      <section id="destaques" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 scroll-mt-24">
        <div className="max-w-2xl space-y-2 mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-color)]">
            Especialidades e atendimento
          </h2>
          <p className="text-base text-[var(--muted-color)] leading-relaxed">
            Confira as opções disponíveis no PWA Sem Supabase Previo e escolha o horário diretamente na agenda online.
          </p>
        </div>

        <div className="border-t border-[var(--border-color)]">
          
            <article className="py-8 border-b border-[var(--border-color,#2E2924)] grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-3 overflow-hidden rounded-xl bg-[var(--surface-color,#181614)] border border-[var(--border-color,#2E2924)]">
                <img
                  src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80"
                  alt="Atendimento Individual"
                  className="w-full h-40 object-cover"
                  loading="lazy"
                />
              </div>
              <div className="md:col-span-6 space-y-2">
                <h3 className="font-display text-xl font-bold text-[var(--text-color,#F5F4F0)]">
                  Atendimento Individual
                </h3>
                <p className="text-sm text-[var(--muted-color,#A8A29E)] max-w-prose leading-relaxed">
                  Sessão dedicada com horário reservado exclusivamente para a sua demanda.
                </p>
              </div>
              <div className="md:col-span-3 flex md:flex-col items-center md:items-end justify-between gap-3">
                <span className="font-display text-lg font-bold text-[var(--text-color,#F5F4F0)]">
                  Sob consulta
                </span>
                <Link
                  to="/agendar"
                  className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold bg-[var(--surface-color,#181614)] hover:bg-[var(--primary-color,#E55A1B)] hover:text-white text-[var(--text-color,#F5F4F0)] border border-[var(--border-color,#2E2924)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color,#E55A1B)]"
                >
                  Escolher horário
                </Link>
              </div>
            </article>
        
            <article className="py-8 border-b border-[var(--border-color,#2E2924)] grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-3 overflow-hidden rounded-xl bg-[var(--surface-color,#181614)] border border-[var(--border-color,#2E2924)]">
                <img
                  src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80"
                  alt="Avaliação e Diagnóstico"
                  className="w-full h-40 object-cover"
                  loading="lazy"
                />
              </div>
              <div className="md:col-span-6 space-y-2">
                <h3 className="font-display text-xl font-bold text-[var(--text-color,#F5F4F0)]">
                  Avaliação e Diagnóstico
                </h3>
                <p className="text-sm text-[var(--muted-color,#A8A29E)] max-w-prose leading-relaxed">
                  Análise técnica detalhada com apresentação de etapas e prazos claros.
                </p>
              </div>
              <div className="md:col-span-3 flex md:flex-col items-center md:items-end justify-between gap-3">
                <span className="font-display text-lg font-bold text-[var(--text-color,#F5F4F0)]">
                  Sob consulta
                </span>
                <Link
                  to="/agendar"
                  className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold bg-[var(--surface-color,#181614)] hover:bg-[var(--primary-color,#E55A1B)] hover:text-white text-[var(--text-color,#F5F4F0)] border border-[var(--border-color,#2E2924)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color,#E55A1B)]"
                >
                  Escolher horário
                </Link>
              </div>
            </article>
        
            <article className="py-8 border-b border-[var(--border-color,#2E2924)] grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-3 overflow-hidden rounded-xl bg-[var(--surface-color,#181614)] border border-[var(--border-color,#2E2924)]">
                <img
                  src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80"
                  alt="Agendamento Online Direto"
                  className="w-full h-40 object-cover"
                  loading="lazy"
                />
              </div>
              <div className="md:col-span-6 space-y-2">
                <h3 className="font-display text-xl font-bold text-[var(--text-color,#F5F4F0)]">
                  Agendamento Online Direto
                </h3>
                <p className="text-sm text-[var(--muted-color,#A8A29E)] max-w-prose leading-relaxed">
                  Seleção imediata de data e horário disponível com confirmação automática.
                </p>
              </div>
              <div className="md:col-span-3 flex md:flex-col items-center md:items-end justify-between gap-3">
                <span className="font-display text-lg font-bold text-[var(--text-color,#F5F4F0)]">
                  Online
                </span>
                <Link
                  to="/agendar"
                  className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold bg-[var(--surface-color,#181614)] hover:bg-[var(--primary-color,#E55A1B)] hover:text-white text-[var(--text-color,#F5F4F0)] border border-[var(--border-color,#2E2924)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color,#E55A1B)]"
                >
                  Escolher horário
                </Link>
              </div>
            </article>
        
        </div>
      </section>

      {/* Sobre o Estabelecimento & Endereço */}
      <section id="sobre" className="bg-[var(--surface-color)] border-t border-[var(--border-color)] py-20 scroll-mt-24">
        <div id="contato" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start scroll-mt-24">
          <div className="lg:col-span-7 space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-color)]">
              Atendimento com hora marcada no PWA Sem Supabase Previo
            </h2>
            <p className="text-base text-[var(--muted-color)] max-w-prose leading-relaxed">
              Organizamos nossa agenda para receber você no horário combinado, com preparo prévio da equipe e confirmação imediata pelo sistema.
            </p>
          </div>

          <div className="lg:col-span-5 p-6 sm:p-8 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)] space-y-5">
            <div className="space-y-1">
              <h3 className="font-display text-xl font-bold text-[var(--text-color)]">
                Informações para visita
              </h3>
              <p className="text-sm text-[var(--muted-color)]">
                Av. Principal, 1000 - Centro - Porto Alegre/RS
              </p>
            </div>

            <div className="space-y-2 text-sm border-y border-[var(--border-color)] py-4">
              <p className="flex justify-between gap-4">
                <span className="text-[var(--muted-color)]">Horários:</span>
                <span className="font-medium text-[var(--text-color)] text-right">Segunda a Sábado das 9h às 18h</span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-[var(--muted-color)]">Telefone / WhatsApp:</span>
                <span className="font-medium text-[var(--text-color)] text-right">51999999999</span>
              </p>
            </div>

            <Link
              to="/agendar"
              className="w-full inline-flex items-center justify-center px-6 py-3.5 min-h-[44px] rounded-xl font-bold text-sm bg-[var(--primary-color)] hover:brightness-110 text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]"
            >
              Agendar horário agora
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
