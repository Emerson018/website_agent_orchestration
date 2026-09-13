import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAgendaConfig, getAgendamentos, createAgendamento, trackPageAccess } from '../services/api';
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
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('cached_agenda_config');
      return saved ? JSON.parse(saved) : {
        dias_funcionamento: [2, 3, 4, 5, 6, 0],
        horarios_disponiveis: ["11:30", "12:00", "12:30", "13:00", "13:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"],
        vagas_padrao: 5,
        limites_customizados: {},
        campo_observacoes_ativo: true,
        antecedencia_maxima_dias: 14
      };
    } catch (e) {
      return {
        dias_funcionamento: [2, 3, 4, 5, 6, 0],
        horarios_disponiveis: ["11:30", "12:00", "12:30", "13:00", "13:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"],
        vagas_padrao: 5,
        limites_customizados: {},
        campo_observacoes_ativo: true,
        antecedencia_maxima_dias: 14
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
        
        // Registra o acesso à página
        trackPageAccess().catch(err => console.error(err));
      } catch (err) {
        console.error("Erro ao carregar dados da agenda:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setErrorMessage('');

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
      // Valida antecedência máxima
      const maxDate = new Date();
      const limitDays = config.antecedencia_maxima_dias ?? 14;
      maxDate.setDate(maxDate.getDate() + limitDays - 1);
      const maxDateStr = getLocalDateString(maxDate);

      if (value > maxDateStr) {
        setErrorMessage(`Reservas são permitidas com antecedência máxima de ${limitDays} dias.`);
        setFormData(prev => ({ ...prev, date: '', time: '' }));
        return;
      }

      // Valida dia de funcionamento
      const selectedDate = new Date(value + 'T00:00:00');
      const weekday = selectedDate.getDay();
      if (!config.dias_funcionamento.includes(weekday)) {
        setErrorMessage("O restaurante não abre no dia da semana selecionado. Por favor, escolha outro dia.");
        setFormData(prev => ({ ...prev, date: '', time: '' }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value, time: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const selectDate = (dateStr) => {
    setErrorMessage('');
    setFormData(prev => ({ ...prev, date: dateStr, time: '' }));
  };

  const selectTime = (time) => {
    setErrorMessage('');
    setFormData(prev => ({ ...prev, time }));
  };

  const getSlotAvailability = (timeSlot) => {
    if (!formData.date) return { available: true, remaining: config.vagas_padrao, limit: config.vagas_padrao };

    const limit = config.limites_customizados?.[formData.date]?.[timeSlot] ?? config.vagas_padrao;
    const todayStr = getLocalDateString(new Date());

    if (formData.date < todayStr) {
      return { available: false, remaining: 0, limit };
    }

    if (formData.date === todayStr) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
      
      // Bloqueia com 30min de antecedência mínima
      if (slotHour < currentHour || (slotHour === currentHour && slotMinute <= currentMinute + 15)) {
        return { available: false, remaining: 0, limit };
      }
    }

    const bookingsInSlot = bookings.filter(b => b.data === formData.date && b.horario === timeSlot && b.status !== 'Cancelado');
    const occupiedSlots = bookingsInSlot.length;
    const remaining = Math.max(0, limit - occupiedSlots);
    const available = remaining >= 1;

    return { available, remaining, limit };
  };

  const getNextAvailableDays = () => {
    const days = [];
    let current = new Date();
    const limitDays = config.antecedencia_maxima_dias ?? 14;
    
    for (let i = 0; i < limitDays && days.length < 8; i++) {
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
    setErrorMessage('');

    if (!formData.name.trim()) {
      setErrorMessage("Por favor, informe seu nome completo.");
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage("Informe um número de telefone ou WhatsApp válido com DDD.");
      return;
    }

    if (!formData.date) {
      setErrorMessage("Selecione a data da sua reserva.");
      return;
    }

    if (!formData.time) {
      setErrorMessage("Escolha um horário de preferência.");
      return;
    }

    const { available } = getSlotAvailability(formData.time);
    if (!available) {
      setErrorMessage("Desculpe, o horário selecionado acabou de esgotar. Escolha outro horário.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await createAgendamento(formData);
      if (res.success) {
        setIsSubmitted(true);
        
        // Dispara webhook se configurado
        if (aiConfig.n8n_webhook_url) {
          try {
            let digitsForWaha = cleanPhone;
            if (!digitsForWaha.startsWith('55')) {
              digitsForWaha = '55' + digitsForWaha;
            }
            if (digitsForWaha.length === 13) {
              const ddd = parseInt(digitsForWaha.slice(2, 4));
              if (ddd > 28) {
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
            payload.append('establishment_name', config.app_name || aiConfig.app_name || 'Campeiro Fogão');
            payload.append('establishment_address', config.address || aiConfig.address || '');
            payload.append('establishment_phone', config.phone || aiConfig.phone || '');

            fetch(aiConfig.n8n_webhook_url, {
              method: 'POST',
              mode: 'no-cors',
              body: payload
            }).catch(e => console.error("Webhook n8n erro:", e));
          } catch (webhookErr) {
            console.error("Webhook setup error:", webhookErr);
          }
        }
      }
    } catch (err) {
      setErrorMessage("Não foi possível registrar a reserva no momento. Tente novamente em instantes.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const todayStr = getLocalDateString(new Date());
  const maxDateStr = (() => {
    const maxDate = new Date();
    const limitDays = config.antecedencia_maxima_dias ?? 14;
    maxDate.setDate(maxDate.getDate() + limitDays - 1);
    return getLocalDateString(maxDate);
  })();

  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
  };

  const getCalendarLink = () => {
    if (!formData.date || !formData.time) return '#';
    const [year, month, day] = formData.date.split('-');
    const [hour, minute] = formData.time.split(':');
    const startIso = `${year}${month}${day}T${hour}${minute}00`;
    const endH = String(Number(hour) + 2).padStart(2, '0');
    const endIso = `${year}${month}${day}T${endH}${minute}00`;
    const title = encodeURIComponent(`Reserva Campeiro Fogão (${formData.guests} pessoas)`);
    const details = encodeURIComponent(`Mesa reservada para ${formData.name}. Telefone: ${formData.phone}. Local: ${config.address || aiConfig.address || 'Campeiro Fogão'}.`);
    const location = encodeURIComponent(config.address || aiConfig.address || 'Campeiro Fogão');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  };

  return (
    <div className="min-h-screen bg-[#12100E] text-[#FAF7F2] py-8 sm:py-14 px-4 sm:px-6 relative overflow-hidden">
      {/* Warm Ambient Glow Effects (Ember & Fire warmth) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#C85A17]/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 -right-40 w-[450px] h-[450px] bg-[#E5A93C]/5 rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 -left-40 w-[450px] h-[450px] bg-[#8C2C0A]/10 rounded-full blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto">
        {!isSubmitted ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* LEFT COLUMN: Hospitality Card, Brand Identity & Trust */}
            <div className="lg:col-span-5 flex flex-col space-y-6">
              
              {/* Brand Header */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241D18] border border-[#3E3228] text-xs font-semibold tracking-wider uppercase text-[#E5A93C]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C85A17] animate-pulse"></span>
                  Tradição Gaúcha & Fogo de Chão
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#FAF7F2] font-serif-brand leading-tight">
                  Reserve a Sua Mesa no Fogão
                </h1>
                <p className="text-sm sm:text-base text-[#A89F96] leading-relaxed">
                  Experiência autêntica de gastronomia campeira, carnes nobres na brasa e ambiente acolhedor. Garanta seu lugar com confirmação imediata.
                </p>
              </div>

              {/* Experience Highlights Card */}
              <div className="bg-[#1A1613] border border-[#2D241E] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl shadow-black/40">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4A373] pb-2 border-b border-[#2D241E]">
                  Como Funciona a Sua Reserva
                </h3>
                
                <div className="space-y-3.5 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#2A211B] border border-[#3E3228] flex items-center justify-center shrink-0 text-[#E5A93C] font-bold">
                      ✓
                    </div>
                    <div>
                      <p className="font-semibold text-[#FAF7F2]">Sem cobrança antecipada</p>
                      <p className="text-xs text-[#A89F96] mt-0.5">Sua reserva é gratuita. O acerto do rodízio ou pratos à la carte é feito diretamente no restaurante.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#2A211B] border border-[#3E3228] flex items-center justify-center shrink-0 text-[#E5A93C] font-bold">
                      ⏱
                    </div>
                    <div>
                      <p className="font-semibold text-[#FAF7F2]">Tolerância de 15 minutos</p>
                      <p className="text-xs text-[#A89F96] mt-0.5">Sua mesa permanecerá reservada por até 15 minutos após o horário agendado.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#2A211B] border border-[#3E3228] flex items-center justify-center shrink-0 text-[#E5A93C] font-bold">
                      🔥
                    </div>
                    <div>
                      <p className="font-semibold text-[#FAF7F2]">Preparo na brasa viva</p>
                      <p className="text-xs text-[#A89F96] mt-0.5">Costela em fogo de chão, cortes nobres, acompanhamentos coloniais e sobremesas típicas.</p>
                    </div>
                  </div>
                </div>

                {/* Practical Info Pill */}
                <div className="pt-3 border-t border-[#2D241E] flex flex-col gap-2 text-xs text-[#A89F96]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#C85A17]">📍</span>
                    <span>{config.address || aiConfig.address || "Av. Principal, 1000 - Centro"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#C85A17]">📞</span>
                    <span>Dúvidas ou grupos especiais: <strong className="text-[#FAF7F2]">{config.phone || aiConfig.phone}</strong></span>
                  </div>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#241C16] to-[#1A1613] border border-[#342820] flex items-center gap-4">
                <div className="text-2xl">⭐</div>
                <div>
                  <p className="text-xs font-bold text-[#FAF7F2]">Ambiente Climatizado & Salão Rústico</p>
                  <p className="text-[11px] text-[#A89F96]">Espaço kids monitorado e estacionamento com manobrista no local.</p>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: The Interactive Reservation Form */}
            <div className="lg:col-span-7">
              <div className="bg-[#181411] border border-[#2D241D] rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl shadow-black/60 relative">
                
                {/* Form Title */}
                <div className="mb-7 pb-4 border-b border-[#2B221B]">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#FAF7F2] font-serif-brand">
                    Configurar Agendamento
                  </h2>
                  <p className="text-xs sm:text-sm text-[#A89F96] mt-1">
                    Escolha os detalhes da sua visita em poucos passos.
                  </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="mb-6 p-4 rounded-xl bg-[#451A14]/80 border border-[#7A2B1E] text-[#FCA5A5] text-xs sm:text-sm flex items-start gap-3 animate-fade-in">
                    <span className="text-base shrink-0">⚠️</span>
                    <div className="leading-snug">{errorMessage}</div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-7">
                  
                  {/* STEP 1: QUANTIDADE DE PESSOAS */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#D4A373] flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#2A211B] text-[#E5A93C] text-[10px] flex items-center justify-center font-black">1</span>
                        Para quantas pessoas? *
                      </label>
                      <span className="text-xs text-[#A89F96]">
                        {formData.guests === '1' ? 'Mesa individual' : formData.guests === '2' ? 'Mesa para casal' : formData.guests === '6+' ? 'Mesa para grupo' : `Mesa para ${formData.guests}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-2.5">
                      {[
                        { val: '1', label: '1 Pessoa' },
                        { val: '2', label: '2 Pessoas' },
                        { val: '3', label: '3 Pessoas' },
                        { val: '4', label: '4 Pessoas' },
                        { val: '5', label: '5 Pessoas' },
                        { val: '6+', label: '6+ Grupo' }
                      ].map((item) => {
                        const isSelected = formData.guests === item.val;
                        return (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, guests: item.val }))}
                            className={`py-3 px-2 rounded-xl border text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                              isSelected
                                ? 'bg-gradient-to-b from-[#C85A17] to-[#A3430B] border-[#E5A93C] text-[#FAF7F2] shadow-lg shadow-[#C85A17]/25 font-bold scale-[1.02]'
                                : 'bg-[#201A16] border-[#342921] text-[#A89F96] hover:text-[#FAF7F2] hover:border-[#4E3D31] hover:bg-[#251E19]'
                            }`}
                          >
                            <span className="text-base sm:text-lg font-bold font-serif-brand leading-none">
                              {item.val}
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-medium tracking-tight opacity-90">
                              {item.label.split(' ')[1]}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {formData.guests === '6+' && (
                      <div className="p-3.5 rounded-xl bg-[#281D14] border border-[#4D3622] text-[#E5A93C] text-xs flex items-start gap-2.5">
                        <span className="text-base shrink-0">ℹ️</span>
                        <p className="leading-relaxed text-[#D8C7B8]">
                          Para mesas com 6 ou mais pessoas, garantiremos a junção das mesas no salão nobre. Se houver exigência especial de acomodação, mencione nas observações abaixo.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* STEP 2: DATA DA RESERVA */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#D4A373] flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#2A211B] text-[#E5A93C] text-[10px] flex items-center justify-center font-black">2</span>
                        Qual o dia desejado? *
                      </label>
                      {formData.date && (
                        <span className="text-xs font-semibold text-[#E5A93C]">
                          {formatDisplayDate(formData.date)}
                        </span>
                      )}
                    </div>

                    {/* Quick Date Chips */}
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {getNextAvailableDays().map((d) => {
                        const dateStr = getLocalDateString(d);
                        const isSelected = formData.date === dateStr;
                        const weekdayShort = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
                        const dayNum = String(d.getDate()).padStart(2, '0');
                        const monthShort = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();

                        return (
                          <button
                            key={dateStr}
                            type="button"
                            onClick={() => selectDate(dateStr)}
                            className={`py-2.5 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? 'bg-gradient-to-b from-[#C85A17] to-[#9C3E08] border-[#E5A93C] text-[#FAF7F2] shadow-md shadow-[#C85A17]/30 scale-[1.03]'
                                : 'bg-[#201A16] border-[#342921] text-[#A89F96] hover:text-[#FAF7F2] hover:border-[#4E3D31] hover:bg-[#251E19]'
                            }`}
                          >
                            <span className={`text-[9px] font-bold tracking-wider ${isSelected ? 'text-[#FAF7F2]' : 'text-[#8A8076]'}`}>
                              {weekdayShort}
                            </span>
                            <span className="text-sm sm:text-base font-bold font-serif-brand leading-none">
                              {dayNum}
                            </span>
                            <span className={`text-[8px] font-medium tracking-tight ${isSelected ? 'text-[#FAF7F2]/80' : 'text-[#70675E]'}`}>
                              {monthShort}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Ou calendário nativo para data posterior */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-[#8A8076]">Ou escolha outra data:</span>
                      <div className="relative flex-1 max-w-[200px]">
                        <input
                          type="date"
                          name="date"
                          min={todayStr}
                          max={maxDateStr}
                          value={formData.date}
                          onChange={handleInputChange}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#201A16] border border-[#342921] text-xs font-semibold text-[#FAF7F2] focus:border-[#C85A17] focus:outline-none cursor-pointer"
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* STEP 3: HORÁRIOS DISPONÍVEIS */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#D4A373] flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#2A211B] text-[#E5A93C] text-[10px] flex items-center justify-center font-black">3</span>
                        Qual o horário? *
                      </label>
                      {!formData.date ? (
                        <span className="text-xs text-[#8A8076]">Selecione um dia primeiro</span>
                      ) : (
                        <span className="text-xs text-[#A89F96]">Vagas atualizadas em tempo real</span>
                      )}
                    </div>

                    {!formData.date ? (
                      <div className="p-6 rounded-xl bg-[#1A1613] border border-[#2D241E] text-center text-xs text-[#8A8076]">
                        📅 Por favor, selecione uma data no passo anterior para ver os horários disponíveis.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[...config.horarios_disponiveis].sort().map((time) => {
                          const { available, remaining } = getSlotAvailability(time);
                          const isSelected = formData.time === time;

                          return (
                            <button
                              key={time}
                              type="button"
                              disabled={!available}
                              onClick={() => selectTime(time)}
                              className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all duration-200 select-none ${
                                isSelected
                                  ? 'bg-gradient-to-b from-[#C85A17] to-[#A3430B] border-[#E5A93C] text-[#FAF7F2] shadow-lg shadow-[#C85A17]/30 scale-[1.02]'
                                  : !available
                                  ? 'bg-[#161311]/50 border-[#241D17] text-[#524941] cursor-not-allowed opacity-50 line-through'
                                  : 'bg-[#201A16] border-[#342921] text-[#D8C7B8] hover:text-[#FAF7F2] hover:border-[#4E3D31] hover:bg-[#261F1A] cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm sm:text-base font-bold font-serif-brand">
                                  {time}
                                </span>
                              </div>

                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isSelected
                                  ? 'bg-white/20 text-[#FAF7F2]'
                                  : !available
                                  ? 'bg-[#3A1E1A] text-[#9A5046]'
                                  : remaining <= 2
                                  ? 'bg-[#3F2B1A] text-[#E5A93C] border border-[#5E4024]'
                                  : 'bg-[#242E25] text-[#78B486] border border-[#334636]'
                              }`}>
                                {remaining > 0 ? `${remaining} vagas` : 'Esgotado'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* STEP 4: DADOS DE CONTATO E OBSERVAÇÕES */}
                  <div className="pt-2 border-t border-[#2B221B] space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#D4A373] flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#2A211B] text-[#E5A93C] text-[10px] flex items-center justify-center font-black">4</span>
                        Seus Dados de Contato *
                      </label>
                      <span className="text-[11px] text-[#8A8076]">Garantia de atendimento</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#A89F96] uppercase tracking-wide mb-1.5">
                          Nome Completo *
                        </label>
                        <input
                          type="text"
                          name="name"
                          required
                          maxLength={35}
                          placeholder="Ex: Rodrigo Fagundes"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-3.5 py-3 rounded-xl bg-[#1F1915] border border-[#342921] text-[#FAF7F2] placeholder-[#6E6359] text-sm focus:border-[#C85A17] focus:ring-1 focus:ring-[#C85A17] focus:outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#A89F96] uppercase tracking-wide mb-1.5">
                          WhatsApp / Celular *
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          required
                          maxLength={15}
                          minLength={14}
                          placeholder="(51) 99999-9999"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full px-3.5 py-3 rounded-xl bg-[#1F1915] border border-[#342921] text-[#FAF7F2] placeholder-[#6E6359] text-sm font-mono focus:border-[#C85A17] focus:ring-1 focus:ring-[#C85A17] focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {config.campo_observacoes_ativo !== false && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[11px] font-semibold text-[#A89F96] uppercase tracking-wide">
                            Observações Especiais (Opcional)
                          </label>
                          <span className="text-[10px] text-[#70675E]">Aniversário, mesa externa, cadeirão infantil</span>
                        </div>
                        <textarea
                          name="notes"
                          rows="2"
                          maxLength={60}
                          placeholder="Ex: Aniversário de casamento, preferência por mesa próxima à janela..."
                          value={formData.notes}
                          onChange={handleInputChange}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#1F1915] border border-[#342921] text-[#FAF7F2] placeholder-[#6E6359] text-xs sm:text-sm focus:border-[#C85A17] focus:ring-1 focus:ring-[#C85A17] focus:outline-none resize-none transition-all"
                        />
                      </div>
                    )}
                  </div>

                  {/* CONFIRMATION BUTTON */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#C85A17] via-[#D9651E] to-[#B34509] hover:brightness-110 active:scale-[0.99] text-[#FAF7F2] font-bold text-sm sm:text-base tracking-wider uppercase shadow-xl shadow-[#C85A17]/25 border border-[#E5A93C]/40 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Confirmando sua reserva...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirmar Reserva de Mesa</span>
                          <span className="text-base">→</span>
                        </>
                      )}
                    </button>
                    <p className="text-center text-[11px] text-[#8A8076] mt-2.5">
                      🔒 Confirmação instantânea sem custo. Você receberá os detalhes na tela.
                    </p>
                  </div>

                </form>

              </div>
            </div>

          </div>
        ) : (
          /* CONFIRMED RESERVATION VOUCHER (VIP EXPERIENCE) */
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="bg-[#181411] border-2 border-[#D4A373]/40 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/80 relative overflow-hidden">
              
              {/* Decorative Ribbon / Top Accent */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#C85A17] via-[#E5A93C] to-[#C85A17]" />
              
              {/* Seal / Badge */}
              <div className="text-center pt-2 pb-6 border-b border-[#2C231D]">
                <div className="w-16 h-16 rounded-full bg-[#243828] border-2 border-[#549E67] text-[#6CE089] text-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#243828]">
                  ✓
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#E5A93C]">
                  Reserva Confirmada com Sucesso
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold font-serif-brand text-[#FAF7F2] mt-1">
                  Esperamos por Você, {formData.name.split(' ')[0]}!
                </h2>
                <p className="text-xs sm:text-sm text-[#A89F96] mt-1">
                  Sua mesa já está registrada em nosso sistema para a data e horário abaixo.
                </p>
              </div>

              {/* Voucher Ticket Body */}
              <div className="my-6 p-5 rounded-2xl bg-[#201A16] border border-[#342921] space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-3 rounded-xl bg-[#16120F] border border-[#2B221B]">
                    <span className="text-[10px] font-bold text-[#8A8076] uppercase tracking-wider block">Data</span>
                    <span className="text-sm sm:text-base font-bold font-serif-brand text-[#FAF7F2]">
                      {formatDisplayDate(formData.date)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#16120F] border border-[#2B221B]">
                    <span className="text-[10px] font-bold text-[#8A8076] uppercase tracking-wider block">Horário</span>
                    <span className="text-sm sm:text-base font-bold font-serif-brand text-[#E5A93C]">
                      {formData.time}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#16120F] border border-[#2B221B]">
                    <span className="text-[10px] font-bold text-[#8A8076] uppercase tracking-wider block">Lugares</span>
                    <span className="text-sm sm:text-base font-bold font-serif-brand text-[#FAF7F2]">
                      {formData.guests} {formData.guests === '1' ? 'Pessoa' : 'Pessoas'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#16120F] border border-[#2B221B]">
                    <span className="text-[10px] font-bold text-[#8A8076] uppercase tracking-wider block">Status</span>
                    <span className="text-xs font-bold text-[#78B486] uppercase tracking-wider">
                      Confirmada
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#2C231D] space-y-2 text-xs text-[#A89F96]">
                  <div className="flex items-center justify-between">
                    <span>Titular da Reserva:</span>
                    <strong className="text-[#FAF7F2]">{formData.name}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Contato / WhatsApp:</span>
                    <strong className="text-[#FAF7F2]">{formData.phone}</strong>
                  </div>
                  {formData.notes && (
                    <div className="flex items-start justify-between gap-4">
                      <span>Observação:</span>
                      <strong className="text-[#FAF7F2] text-right">{formData.notes}</strong>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Endereço:</span>
                    <span className="text-[#FAF7F2] text-right font-medium">{config.address || aiConfig.address || "Av. Principal, 1000 - Centro"}</span>
                  </div>
                </div>
              </div>

              {/* Helpful Notice */}
              <div className="p-4 rounded-xl bg-[#281D14] border border-[#4D3622] text-[#D8C7B8] text-xs flex items-start gap-3 mb-6">
                <span className="text-lg shrink-0">⏳</span>
                <p className="leading-relaxed">
                  Lembramos que seguramos a sua mesa por <strong>até 15 minutos</strong> após o horário marcado. Caso ocorra qualquer imprevisto ou atraso, avise nossa equipe diretamente pelo WhatsApp.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href={getCalendarLink()}
                    target="_blank"
                    rel="noreferrer"
                    className="py-3 px-4 rounded-xl bg-[#261F1A] hover:bg-[#322822] border border-[#44352B] text-[#FAF7F2] font-semibold text-xs text-center flex items-center justify-center gap-2 transition-all"
                  >
                    <span>📅</span>
                    <span>Salvar no Calendário</span>
                  </a>

                  {config.phone && (
                    <a
                      href={`https://wa.me/55${config.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, confirmei minha reserva para ${formatDisplayDate(formData.date)} às ${formData.time} no nome de ${formData.name}.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-3 px-4 rounded-xl bg-[#1C2C20] hover:bg-[#253D2B] border border-[#315637] text-[#78D48E] font-semibold text-xs text-center flex items-center justify-center gap-2 transition-all"
                    >
                      <span>💬</span>
                      <span>Falar com o Restaurante</span>
                    </a>
                  )}
                </div>

                <button
                  type="button"
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
                  className="w-full py-3 text-center text-xs font-semibold text-[#A89F96] hover:text-[#FAF7F2] transition-colors cursor-pointer"
                >
                  ← Realizar Outro Agendamento
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingPage;
