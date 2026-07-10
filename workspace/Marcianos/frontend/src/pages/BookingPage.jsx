import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAgendaConfig, getAgendamentos, createAgendamento } from '../services/api';
import aiConfig from '../../ai_config.json';

const getLocalDateString = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

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
      return saved ? JSON.parse(saved) : {
        dias_funcionamento: [2, 3, 4, 5, 6, 0],
        horarios_disponiveis: ["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"],
        vagas_padrao: 5,
        limites_customizados: {},
        campo_observacoes_ativo: true
      };
    } catch (e) {
      return {
        dias_funcionamento: [2, 3, 4, 5, 6, 0],
        horarios_disponiveis: ["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"],
        vagas_padrao: 5,
        limites_customizados: {},
        campo_observacoes_ativo: true
      };
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
      const digits = value.replace(/\D/g, '').slice(0, 11);
      let formatted = '';
      if (digits.length <= 10) {
        if (digits.length > 0) formatted += `(${digits.slice(0, 2)}`;
        if (digits.length > 2) formatted += `) ${digits.slice(2, 6)}`;
        if (digits.length > 6) formatted += `-${digits.slice(6, 10)}`;
      } else {
        formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
      }
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else if (name === 'date' && value) {
      // Valida antecedência máxima de dias
      const maxDate = new Date();
      const limitDays = config.antecedencia_maxima_dias ?? 7;
      maxDate.setDate(maxDate.getDate() + limitDays - 1);
      const maxDateStr = getLocalDateString(maxDate);

      if (value > maxDateStr) {
        alert(`Você só pode realizar agendamentos com até ${limitDays} dias de antecedência.`);
        setFormData(prev => ({ ...prev, date: '', time: '' }));
        return;
      }

      // Valida dia de funcionamento
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

  const getSlotAvailability = (timeSlot) => {
    if (!formData.date) return { available: true, remaining: config.vagas_padrao };

    // Verifica capacidade para a data e slot
    const limit = config.limites_customizados?.[formData.date]?.[timeSlot] ?? config.vagas_padrao;

    // Se a data selecionada for no passado
    const todayStr = getLocalDateString(new Date());
    if (formData.date < todayStr) {
      return { available: false, remaining: 0, limit };
    }

    // Se a data selecionada for hoje, verifica se o horário já passou
    if (formData.date === todayStr) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
      
      if (slotHour < currentHour || (slotHour === currentHour && slotMinute <= currentMinute)) {
        return { available: false, remaining: 0, limit };
      }
    }

    // Filtra agendamentos na mesma data e slot
    const bookingsInSlot = bookings.filter(b => b.data === formData.date && b.horario === timeSlot);
    const occupiedSlots = bookingsInSlot.length;

    const remaining = Math.max(0, limit - occupiedSlots);
    const available = remaining >= 1;

    return { available, remaining, limit };
  };

  const getNext7Days = () => {
    const days = [];
    let current = new Date();
    const limitDays = config.antecedencia_maxima_dias ?? 7;
    
    for (let i = 0; i < limitDays; i++) {
      const dayOfWeek = current.getDay();
      if (config.dias_funcionamento.includes(dayOfWeek)) {
        days.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.date || !formData.time) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const { available } = getSlotAvailability(formData.time);
    if (!available) {
      alert("Desculpe, o horário selecionado já atingiu o limite de agendamentos.");
      return;
    }

    try {
      const res = await createAgendamento(formData);
      if (res.success) {
        setIsSubmitted(true);
        
        // Dispara notificação via Webhook do n8n se configurado
        if (aiConfig.n8n_webhook_url) {
          try {
            // Limpa o telefone para o formato WAHA (55 + DDD + Número + @c.us)
            let digitsForWaha = formData.phone.replace(/\D/g, '');
            if (!digitsForWaha.startsWith('55')) {
              digitsForWaha = '55' + digitsForWaha;
            }
            if (digitsForWaha.length === 13) {
              const ddd = parseInt(digitsForWaha.slice(2, 4));
              if (ddd > 28) {
                // Remove o dígito '9' extra logo após o DDD (index 4)
                digitsForWaha = digitsForWaha.slice(0, 4) + digitsForWaha.slice(5);
              }
            }
            const chatId = `${digitsForWaha}@c.us`;

            const payload = new URLSearchParams();
            payload.append('name', formData.name);
            payload.append('phone', formData.phone);
            payload.append('chatId', chatId);
            payload.append('date', formData.date);
            payload.append('time', formData.time);
            payload.append('guests', formData.guests);
            payload.append('notes', formData.notes || '');
            payload.append('establishment_name', aiConfig.app_name || 'Marcianos');
            payload.append('establishment_address', aiConfig.address || '');
            payload.append('establishment_phone', aiConfig.phone || '');

            fetch(aiConfig.n8n_webhook_url, {
              method: 'POST',
              mode: 'no-cors',
              body: payload
            }).catch(e => console.error("Erro assíncrono ao disparar webhook n8n:", e));
            
            console.log("Notificação de reserva enviada ao webhook do n8n.");
          } catch (webhookErr) {
            console.error("Erro ao preparar chamada de webhook n8n:", webhookErr);
          }
        }
      }
    } catch (err) {
      alert("Ocorreu um erro ao salvar o agendamento.");
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

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center py-12 px-4 font-sans bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full filter blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none -z-10"></div>

      <div className="w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl relative">
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-primary/10 rounded-full filter blur-2xl pointer-events-none"></div>
        
        {!isSubmitted ? (
          <>
            <div className="text-center mb-8">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                Agendamento Online
              </span>
              <h2 className="text-3xl font-black mt-4 tracking-tight">Garanta seu Horário</h2>
              <p className="text-xs text-slate-400 mt-2">Preencha seus dados para reservar a sua mesa de forma rápida e segura</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome e Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nome Completo *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <input 
                      type="text" 
                      name="name"
                      required
                      maxLength={30}
                      placeholder="Seu nome completo"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition-all text-slate-100 placeholder-slate-600 font-medium text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Telefone de Contato *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </span>
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
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition-all text-slate-100 placeholder-slate-600 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Número de Pessoas com Seletor Customizado */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Número de Pessoas *</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {['1', '2', '3', '4', '5', '6+'].map((num) => {
                    const isSelected = formData.guests === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, guests: num }))}
                        className={`py-3 rounded-xl border text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer active:scale-95 flex items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-gradient-to-br from-indigo-600 to-primary text-white border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.25)] font-black'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-750'
                        }`}
                      >
                        <span>{num}</span>
                        <span className="hidden sm:inline text-[10px] font-medium">{num === '6+' ? 'Pessoas' : parseInt(num) === 1 ? 'Pessoa' : 'Pessoas'}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Mensagem informativa para mais de 5 pessoas */}
                {formData.guests === '6+' && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3.5 rounded-xl text-xs flex gap-2.5 items-start animate-fade-in mt-3">
                    <svg className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-left">
                      <span className="font-extrabold block mb-0.5">Aviso sobre reservas de grandes grupos</span>
                      Para mesas acima de 5 pessoas, prosseguiremos com a sua pré-reserva de 6 lugares e nosso time entrará em contato para alinhar os detalhes e a disposição das mesas.
                    </div>
                  </div>
                )}
              </div>

              {/* Seleção do Dia */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Selecione o Dia *</label>
                
                {/* Atalhos Rápidos de Datas */}
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
                        className={`py-2.5 px-1 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all duration-300 cursor-pointer active:scale-95 ${
                          isSelected
                            ? 'bg-gradient-to-br from-indigo-600 to-primary text-white border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.25)] scale-102 font-black'
                            : 'bg-gradient-to-b from-slate-900/80 to-slate-950/90 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-indigo-500/50'
                        }`}
                      >
                        <span className={`text-[8px] uppercase tracking-wider font-extrabold ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                          {weekdayLabel}
                        </span>
                        <span className="font-mono text-[10px] sm:text-[11px]">{dayMonth}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Escolher outra data */}
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-2 mt-3.5">Ou escolha uma data específica:</p>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input 
                    type="date" 
                    name="date"
                    required
                    min={todayStr}
                    max={maxDateStr}
                    value={formData.date}
                    onChange={handleInputChange}
                    onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition-all text-slate-100 cursor-pointer font-bold text-xs sm:text-sm"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {/* Seleção do Horário */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Selecione o Horário *</label>
                  {loading && formData.date && (
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 animate-pulse">
                      <svg className="w-3 h-3 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Buscando vagas...
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
                        className={`relative overflow-hidden py-3 px-4 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-1 cursor-pointer select-none active:scale-95 ${
                          isSelected 
                            ? 'bg-gradient-to-br from-indigo-600 to-primary text-white border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] scale-102 font-extrabold' 
                            : !available
                            ? 'bg-slate-950/20 border-slate-900/60 text-slate-650 cursor-not-allowed opacity-40 line-through'
                            : 'bg-gradient-to-b from-slate-900/80 to-slate-950/90 border-slate-800/80 text-slate-200 shadow-sm hover:border-indigo-500/50 hover:from-slate-850 hover:to-slate-900'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-4 h-4 bg-indigo-555 rounded-full flex items-center justify-center text-[8px] font-black text-white shadow-sm">
                            ✓
                          </div>
                        )}

                        <span className="text-sm font-mono tracking-wide font-black flex items-center gap-1">
                          <svg className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {time}
                        </span>
                        
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold tracking-wide uppercase mt-0.5 ${
                          isSelected 
                            ? 'bg-white/20 text-white' 
                            : !available
                            ? 'bg-red-500/10 text-red-550'
                            : remaining <= 2
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
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
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Observações Especiais</label>
                    <span className="text-[10px] text-slate-500 font-mono">{formData.notes.length}/50</span>
                  </div>
                  <textarea 
                    name="notes"
                    rows="2"
                    maxLength={50}
                    placeholder="Pedidos especiais (ex: mesa perto da janela, restrições alimentares...)"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-955 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition-all text-slate-100 placeholder-slate-650 resize-none text-sm font-medium"
                  ></textarea>
                </div>
              )}

              {/* Botão de Envio */}
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-indigo-650 to-primary hover:brightness-110 active:scale-99 text-white font-black rounded-xl shadow-xl shadow-indigo-600/15 hover:shadow-indigo-600/25 transition-all duration-300 cursor-pointer text-center uppercase tracking-widest text-xs sm:text-sm border-0"
              >
                Confirmar Reserva e Agendar
              </button>
            </form>
          </>
        ) : (
          /* Tela de Sucesso */
          <div className="text-center py-10 flex flex-col items-center animate-fade-in">
            <div className="w-16 h-16 bg-emerald-500/15 text-emerald-400 rounded-full border border-emerald-550/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-bounce">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-3xl font-black text-white tracking-tight">Agendamento Confirmado!</h3>
            <p className="text-sm text-slate-400 mt-4 max-w-md leading-relaxed">
              Obrigado, <strong className="text-primary font-extrabold">{formData.name}</strong>! Seu horário para o dia <strong>{new Date(formData.date + 'T00:00:00').toLocaleDateString('pt-BR')}</strong> às <strong className="text-slate-100 font-extrabold">{formData.time}</strong> foi agendado com sucesso para uma mesa de <strong className="text-slate-100 font-extrabold">{formData.guests} {parseInt(formData.guests) === 1 ? 'pessoa' : 'pessoas'}</strong>.
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
                className="w-full sm:w-auto px-10 py-3.5 rounded-xl bg-gradient-to-r from-indigo-650 to-primary text-white text-xs font-black shadow-md hover:brightness-110 transition-all cursor-pointer flex items-center justify-center uppercase tracking-wider border-0"
              >
                Realizar Novo Agendamento
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingPage;
