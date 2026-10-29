import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DEFAULT_AGENDA_CONFIG,
  getLocalDateString,
  formatPhoneMask,
  formatWahaChatId,
  computeSlotAvailability,
  getAvailableBookingDays,
  getAgendaConfig,
  getAgendamentos,
  createAgendamento,
  trackPageAccess,
} from '../services/api';
import aiConfig from '../../ai_config.json';

function BookingPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    guests: '2',
    date: '',
    time: '',
    notes: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('cached_agenda_config');
      return saved ? JSON.parse(saved) : DEFAULT_AGENDA_CONFIG;
    } catch (e) {
      return DEFAULT_AGENDA_CONFIG;
    }
  });
  const [bookings, setBookings] = useState(() => {
    try {
      const saved = localStorage.getItem('cached_bookings');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [cfg, bks] = await Promise.all([getAgendaConfig(), getAgendamentos()]);
        setConfig(cfg);
        setBookings(bks);
        localStorage.setItem('cached_agenda_config', JSON.stringify(cfg));
        localStorage.setItem('cached_bookings', JSON.stringify(bks));

        trackPageAccess().catch(err => console.error(err));
      } catch (err) {
        console.error("Erro ao carregar configurações de agendamento:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      setFormData(prev => ({ ...prev, [name]: formatPhoneMask(value) }));
    } else if (name === 'date' && value) {
      const maxDate = new Date();
      const limitDays = config.antecedencia_maxima_dias ?? 7;
      maxDate.setDate(maxDate.getDate() + limitDays - 1);
      const maxDateStr = getLocalDateString(maxDate);

      if (value > maxDateStr) {
        alert(`Você só pode realizar agendamentos com até ${limitDays} dias de antecedência.`);
        setFormData(prev => ({ ...prev, date: '', time: '' }));
        return;
      }

      const selectedDate = new Date(value + 'T00:00:00');
      const weekday = selectedDate.getDay();
      if (!config.dias_funcionamento.includes(weekday)) {
        alert("O estabelecimento não funciona no dia da semana selecionado.");
        setFormData(prev => ({ ...prev, date: '', time: '' }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value, time: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const selectTime = (time) => {
    setFormData(prev => ({ ...prev, time }));
  };

  const getSlotAvailability = (timeSlot) =>
    computeSlotAvailability(formData.date, timeSlot, config, bookings);

  const getNext7Days = () => getAvailableBookingDays(config);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.date || !formData.time) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const { available } = getSlotAvailability(formData.time);
    if (!available) {
      alert("O horário selecionado atingiu o limite de vagas. Escolha outro horário disponível.");
      return;
    }

    try {
      const res = await createAgendamento(formData);
      if (res.success) {
        setIsSubmitted(true);

        if (aiConfig.n8n_webhook_url) {
          try {
            const chatId = formatWahaChatId(formData.phone);

            const payload = new URLSearchParams();
            payload.append('name', formData.name);
            payload.append('phone', formData.phone);
            payload.append('chatId', chatId);
            payload.append('date', formData.date);
            payload.append('time', formData.time);
            payload.append('guests', formData.guests);
            payload.append('notes', formData.notes || '');
            payload.append('establishment_name', config.app_name || aiConfig.app_name || 'Marcianos');
            payload.append('establishment_address', config.address || aiConfig.address || '');
            payload.append('establishment_phone', config.phone || aiConfig.phone || '');

            fetch(aiConfig.n8n_webhook_url, {
              method: 'POST',
              mode: 'no-cors',
              body: payload
            }).catch(e => console.error("Erro assíncrono ao disparar webhook n8n:", e));
          } catch (webhookErr) {
            console.error("Erro ao preparar chamada de webhook n8n:", webhookErr);
          }
        }
      }
    } catch (err) {
      alert("Não foi possível salvar o agendamento. Verifique sua conexão e tente novamente.");
      console.error(err);
    }
  };

  const todayStr = getLocalDateString(new Date());
  const maxDateStr = (() => {
    const maxDate = new Date();
    const limitDays = config.antecedencia_maxima_dias ?? 7;
    maxDate.setDate(maxDate.getDate() + limitDays - 1);
    return getLocalDateString(maxDate);
  })();

  const isLightTheme = aiConfig.theme === 'light';

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center py-12 px-4 font-sans bg-[var(--bg-color,#0E0D0C)] text-[var(--text-color,#F5F4F0)] relative overflow-hidden">
      <div className="w-full max-w-2xl bg-[var(--surface-color,#181614)] border border-[var(--border-color,#2E2924)] rounded-2xl p-6 sm:p-10 shadow-lg relative">
        {!isSubmitted ? (
          <>
            <div className="text-left sm:text-center mb-8">
              <p className="text-xs font-semibold text-[var(--primary-color,#E55A1B)]">
                {aiConfig.app_name || 'Agenda Online'}
              </p>
              <h2 className="font-display text-3xl font-bold mt-2 tracking-tight text-[var(--text-color,#F5F4F0)]">
                Reservar horário
              </h2>
              <p className="text-sm text-[var(--muted-color,#A8A29E)] mt-1.5">
                Escolha o dia, horário disponível e informe seus dados para confirmação.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome e Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-color,#A8A29E)] mb-2">
                    Nome completo *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    maxLength={30}
                    placeholder="Seu nome completo"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 min-h-[44px] rounded-xl bg-[var(--bg-color,#0E0D0C)] border border-[var(--border-color,#2E2924)] focus:border-[var(--primary-color)] focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus:outline-none transition-all text-[var(--text-color,#F5F4F0)] placeholder-[var(--muted-color,#A8A29E)]/60 font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-color,#A8A29E)] mb-2">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    maxLength={15}
                    minLength={14}
                    inputMode="tel"
                    pattern="\([0-9]{2}\) [0-9]{4,5}-[0-9]{4}"
                    placeholder="(51) 99999-9999"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 min-h-[44px] rounded-xl bg-[var(--bg-color,#0E0D0C)] border border-[var(--border-color,#2E2924)] focus:border-[var(--primary-color)] focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus:outline-none transition-all text-[var(--text-color,#F5F4F0)] placeholder-[var(--muted-color,#A8A29E)]/60 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Número de Pessoas */}
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-color,#A8A29E)] mb-2">
                  Número de pessoas *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {['1', '2', '3', '4', '5', '6+'].map((num) => {
                    const isSelected = formData.guests === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, guests: num }))}
                        className={`py-3 min-h-[44px] rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] ${
                          isSelected
                            ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-sm'
                            : 'bg-[var(--bg-color,#0E0D0C)] border-[var(--border-color,#2E2924)] text-[var(--muted-color,#A8A29E)] hover:text-[var(--text-color,#F5F4F0)]'
                        }`}
                      >
                        <span>{num}</span>
                        <span className="hidden sm:inline text-[10px] font-medium">
                          {num === '6+' ? 'Pessoas' : parseInt(num) === 1 ? 'Pessoa' : 'Pessoas'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {formData.guests === '6+' && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-3.5 rounded-xl text-xs flex gap-2.5 items-start mt-3">
                    <div className="text-left">
                      <span className="font-bold block mb-0.5">Reservas para grupos acima de 5 pessoas</span>
                      Registramos sua pré-reserva para 6 lugares e nossa equipe entrará em contato para organizar a acomodação do grupo.
                    </div>
                  </div>
                )}
              </div>

              {/* Seleção do Dia */}
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-color,#A8A29E)] mb-3">
                  Selecione o dia *
                </label>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {getNext7Days().map((d) => {
                    const dateStr = getLocalDateString(d);
                    const isSelected = formData.date === dateStr;
                    const weekdayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                    const dayMonth = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, date: dateStr, time: '' }));
                        }}
                        className={`py-2.5 px-1 min-h-[48px] rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] ${
                          isSelected
                            ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-sm'
                            : 'bg-[var(--bg-color,#0E0D0C)] border-[var(--border-color,#2E2924)] text-[var(--muted-color,#A8A29E)] hover:text-[var(--text-color,#F5F4F0)]'
                        }`}
                      >
                        <span className={`text-[10px] capitalize font-semibold ${isSelected ? 'text-white/90' : 'text-[var(--muted-color,#A8A29E)]'}`}>
                          {weekdayLabel}
                        </span>
                        <span className="font-mono text-xs">{dayMonth}</span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-[var(--muted-color,#A8A29E)] font-medium mb-2 mt-3.5">
                  Ou escolha outra data no calendário:
                </p>
                <input
                  type="date"
                  name="date"
                  required
                  min={todayStr}
                  max={maxDateStr}
                  value={formData.date}
                  onChange={handleInputChange}
                  onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                  className="w-full px-4 py-3 min-h-[44px] rounded-xl bg-[var(--bg-color,#0E0D0C)] border border-[var(--border-color,#2E2924)] focus:border-[var(--primary-color)] focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus:outline-none transition-all text-[var(--text-color,#F5F4F0)] cursor-pointer font-semibold text-sm"
                  style={{ colorScheme: isLightTheme ? 'light' : 'dark' }}
                />
              </div>

              {/* Seleção do Horário */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-[var(--muted-color,#A8A29E)]">
                    Selecione o horário *
                  </label>
                  {loading && formData.date && (
                    <span className="text-xs text-[var(--muted-color,#A8A29E)]">
                      Consultando horários...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[...config.horarios_disponiveis].sort().map((time) => {
                    const { available, remaining } = getSlotAvailability(time);
                    const isSelected = formData.time === time;
                    return (
                      <button
                        type="button"
                        key={time}
                        disabled={!available}
                        onClick={() => selectTime(time)}
                        className={`relative overflow-hidden py-3 px-4 min-h-[52px] rounded-xl border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] ${
                          isSelected
                            ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] font-bold shadow-sm'
                            : !available
                            ? 'bg-[var(--bg-color,#0E0D0C)]/40 border-[var(--border-color,#2E2924)] text-[var(--muted-color,#A8A29E)] cursor-not-allowed opacity-40 line-through'
                            : 'bg-[var(--bg-color,#0E0D0C)] border-[var(--border-color,#2E2924)] text-[var(--text-color,#F5F4F0)] hover:border-[var(--primary-color)]'
                        }`}
                      >
                        <span className="text-sm font-mono font-bold">
                          {time}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : !available
                            ? 'text-red-500'
                            : remaining <= 2
                            ? 'text-amber-500'
                            : 'text-[var(--muted-color,#A8A29E)]'
                        }`}>
                          {remaining > 0 ? `${remaining} vagas` : 'Esgotado'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Observações */}
              {config.campo_observacoes_ativo !== false && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-color,#A8A29E)] mb-2">
                    Observações (opcional)
                  </label>
                  <textarea
                    name="notes"
                    rows="2"
                    maxLength={50}
                    placeholder="Preferência de atendimento, restrições ou observações..."
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg-color,#0E0D0C)] border border-[var(--border-color,#2E2924)] focus:border-[var(--primary-color)] focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus:outline-none transition-all text-[var(--text-color,#F5F4F0)] placeholder-[var(--muted-color,#A8A29E)]/60 resize-none text-sm font-medium"
                  ></textarea>
                </div>
              )}

              {/* Botão de Envio */}
              <button
                type="submit"
                className="w-full py-4 min-h-[48px] bg-[var(--primary-color)] hover:brightness-110 text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer text-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]"
              >
                Confirmar reserva
              </button>
            </form>
          </>
        ) : (
          /* Tela de Sucesso */
          <div className="text-center py-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-500/15 text-emerald-500 rounded-full border border-emerald-500/30 flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-display text-3xl font-bold text-[var(--text-color,#F5F4F0)] tracking-tight">
              Reserva confirmada
            </h3>
            <p className="text-sm text-[var(--muted-color,#A8A29E)] mt-4 max-w-md leading-relaxed">
              Obrigado, <strong className="text-[var(--primary-color)] font-bold">{formData.name}</strong>. Seu horário para <strong>{new Date(formData.date + 'T00:00:00').toLocaleDateString('pt-BR')}</strong> às <strong className="text-[var(--text-color,#F5F4F0)] font-bold">{formData.time}</strong> foi confirmado para <strong className="text-[var(--text-color,#F5F4F0)] font-bold">{formData.guests} {parseInt(formData.guests) === 1 ? 'pessoa' : 'pessoas'}</strong>.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  setFormData({
                    name: '',
                    phone: '',
                    guests: '2',
                    date: '',
                    time: '',
                    notes: ''
                  });
                  setIsSubmitted(false);
                }}
                className="w-full sm:w-auto px-8 py-3.5 min-h-[44px] rounded-xl bg-[var(--primary-color)] text-white text-sm font-bold shadow-sm hover:brightness-110 transition-all cursor-pointer flex items-center justify-center"
              >
                Fazer nova reserva
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingPage;
