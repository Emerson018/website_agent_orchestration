import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="w-full bg-[var(--bg-color)] text-[var(--text-color)] font-sans selection:bg-[var(--primary-color)] selection:text-white">
      <section id="inicio" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 scroll-mt-24">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          <div className="lg:col-span-8 p-8 sm:p-12 rounded-3xl bg-[var(--surface-color)] border border-[var(--border-color)] flex flex-col justify-between space-y-8">
            <div className="space-y-5">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-color)] text-[var(--primary-color)] border border-[var(--border-color)]">
                Serviços Especializados · AppCustomizado
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-color)] leading-[1.06]">
                Atendimento com hora marcada na AppCustomizado
              </h1>
              <p className="text-base sm:text-lg text-[var(--muted-color)] max-w-2xl leading-relaxed">
                Oferecer Atendimento Individual, Avaliação e Diagnóstico e Agendamento Online Direto no AppCustomizado com agendamento digital sem fila de espera, preparo prévio da equipe e transparência de valores e horários.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/agendar"
                className="inline-flex items-center justify-center px-8 py-4 min-h-[48px] rounded-xl text-base font-bold bg-[var(--primary-color)] hover:brightness-110 text-white transition-all"
              >
                Reservar horário
              </Link>
              <a
                href="#destaques"
                className="inline-flex items-center justify-center px-6 py-4 min-h-[48px] rounded-xl text-base font-semibold bg-[var(--bg-color)] text-[var(--text-color)] border border-[var(--border-color)] hover:border-[var(--primary-color)] transition-colors"
              >
                Explorar serviços e valores
              </a>
            </div>
          </div>

          <div className="lg:col-span-4 grid grid-cols-1 gap-6">
            <div className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--surface-color)] h-64 lg:h-full">
              <img
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"
                alt="AppCustomizado"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 rounded-3xl bg-[var(--surface-color)] border border-[var(--border-color)] space-y-2">
              <p className="text-xs font-semibold text-[var(--primary-color)]">Atendimento & Localização</p>
              <p className="text-sm font-medium text-[var(--text-color)]">Segunda a Sábado das 9h às 18h</p>
              <p className="text-xs text-[var(--muted-color)]">Av. Principal, 1000 - Centro - Porto Alegre/RS</p>
            </div>
          </div>
        </motion.div>
      </section>

      <section id="destaques" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-24">
        <div className="max-w-2xl space-y-2 mb-10">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-color)]">
            Especialidades do AppCustomizado
          </h2>
          <p className="text-base text-[var(--muted-color)]">
            AppCustomizado posiciona-se no segmento de Serviços Especializados combinando domínio técnico em Atendimento Individual, Avaliação e Diagnóstico e Agendamento Online Direto com uma atmosfera moderno, tecnológico, dinâmico e profissional.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
            <motion.article
              whileHover={{ y: -4 }}
              className="md:col-span-7 p-6 sm:p-8 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-color)] flex flex-col justify-between gap-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--bg-color)] text-[var(--primary-color)] border border-[var(--border-color)]">
                    Mais procurado
                  </span>
                  <span className="font-display text-xl font-bold text-[var(--text-color)]">
                    Sob consulta
                  </span>
                </div>
                <h3 className="font-display text-2xl font-bold text-[var(--text-color)]">
                  Atendimento Individual
                </h3>
                <p className="text-sm text-[var(--muted-color)] leading-relaxed">
                  Sessão dedicada com horário reservado exclusivamente para a sua demanda.
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                <span className="text-xs text-[var(--muted-color)]">Disponível na agenda online</span>
                <Link
                  to="/agendar"
                  className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-lg text-xs font-bold bg-[var(--primary-color)] text-white hover:brightness-110 transition-all"
                >
                  Reservar este serviço
                </Link>
              </div>
            </motion.article>
            <motion.article
              whileHover={{ y: -4 }}
              className="md:col-span-5 p-6 sm:p-8 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-color)] flex flex-col justify-between gap-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--bg-color)] text-[var(--primary-color)] border border-[var(--border-color)]">
                    Hora marcada
                  </span>
                  <span className="font-display text-xl font-bold text-[var(--text-color)]">
                    Sob consulta
                  </span>
                </div>
                <h3 className="font-display text-2xl font-bold text-[var(--text-color)]">
                  Avaliação e Diagnóstico
                </h3>
                <p className="text-sm text-[var(--muted-color)] leading-relaxed">
                  Análise técnica detalhada com apresentação de etapas e prazos claros.
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                <span className="text-xs text-[var(--muted-color)]">Disponível na agenda online</span>
                <Link
                  to="/agendar"
                  className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-lg text-xs font-bold bg-[var(--primary-color)] text-white hover:brightness-110 transition-all"
                >
                  Reservar este serviço
                </Link>
              </div>
            </motion.article>
            <motion.article
              whileHover={{ y: -4 }}
              className="md:col-span-6 p-6 sm:p-8 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-color)] flex flex-col justify-between gap-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--bg-color)] text-[var(--primary-color)] border border-[var(--border-color)]">
                    Hora marcada
                  </span>
                  <span className="font-display text-xl font-bold text-[var(--text-color)]">
                    Online
                  </span>
                </div>
                <h3 className="font-display text-2xl font-bold text-[var(--text-color)]">
                  Agendamento Online Direto
                </h3>
                <p className="text-sm text-[var(--muted-color)] leading-relaxed">
                  Seleção imediata de data e horário disponível com confirmação automática.
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                <span className="text-xs text-[var(--muted-color)]">Disponível na agenda online</span>
                <Link
                  to="/agendar"
                  className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-lg text-xs font-bold bg-[var(--primary-color)] text-white hover:brightness-110 transition-all"
                >
                  Reservar este serviço
                </Link>
              </div>
            </motion.article>
        </div>
      </section>

      <section id="sobre" className="bg-[var(--surface-color)] border-t border-[var(--border-color)] py-16 scroll-mt-24">
        <div id="contato" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 scroll-mt-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-6 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] space-y-2">
              <span className="font-mono text-xs font-bold text-[var(--primary-color)]">01</span>
              <p className="text-sm sm:text-base font-medium text-[var(--text-color)] leading-relaxed">
                Especialização em Atendimento Individual com padrão consistente de entrega
              </p>
            </div>
            <div className="p-6 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] space-y-2">
              <span className="font-mono text-xs font-bold text-[var(--primary-color)]">02</span>
              <p className="text-sm sm:text-base font-medium text-[var(--text-color)] leading-relaxed">
                Arquitetura visual Bento Grid Modular de Alta Precisão desenhada para leitura rápida e decisão imediata
              </p>
            </div>
            <div className="p-6 rounded-xl bg-[var(--bg-color)] border border-[var(--border-color)] space-y-2">
              <span className="font-mono text-xs font-bold text-[var(--primary-color)]">03</span>
              <p className="text-sm sm:text-base font-medium text-[var(--text-color)] leading-relaxed">
                Reserva online integrada em tempo real com confirmação direta de data e horário
              </p>
            </div>
          </div>
          <div className="p-8 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-color)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="font-display text-2xl font-bold text-[var(--text-color)]">Visite o AppCustomizado</h3>
              <p className="text-sm text-[var(--muted-color)]">Av. Principal, 1000 - Centro - Porto Alegre/RS · Segunda a Sábado das 9h às 18h · WhatsApp: (51) 99999-9999</p>
            </div>
            <Link
              to="/agendar"
              className="inline-flex items-center justify-center px-8 py-4 min-h-[48px] rounded-xl font-bold text-sm bg-[var(--primary-color)] text-white hover:brightness-110 transition-all"
            >
              Agendar horário agora
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
