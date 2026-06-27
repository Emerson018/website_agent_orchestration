import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAgendaConfig, getAgendamentos, createAgendamento } from '../services/api';

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
  const [config, setConfig] = useState({
    dias_funcionamento: [2, 3, 4, 5, 6, 0],
    horarios_disponiveis: ["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"],
    vagas_padrao: 5,
    limites_customizados: {}
  });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [cfg, bks] = await Promise.all([getAgendaConfig(), getAgendamentos()]);
        setConfig(cfg);
        setBookings(bks);
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
      if (digits.length > 0) {
        formatted += `(${digits.slice(0, 2)}`;
      }
      if (digits.length > 2) {
        formatted += `) ${digits.slice(2, 7)}`;
      }
      if (digits.length > 7) {
        formatted += `-${digits.slice(7, 11)}`;
      }
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else if (name === 'date' && value) {
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

    // Filtra agendamentos na mesma data e slot
    const bookingsInSlot = bookings.filter(b => b.data === formData.date && b.horario === timeSlot);
    const occupiedSlots = bookingsInSlot.length;

    const remaining = Math.max(0, limit - occupiedSlots);
    const available = remaining >= 1;

    return { available, remaining, limit };
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
      }
    } catch (err) {
      alert("Ocorreu um erro ao salvar o agendamento.");
      console.error(err);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-slate-950 text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-semibold opacity-75">Carregando horários...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-10 px-4 font-sans bg-slate-950 text-slate-100">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative">
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-primary/10 rounded-full filter blur-2xl pointer-events-none"></div>
        
        {!isSubmitted ? (
          <>
            <div className="text-center mb-8">
              <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                Agendamento 🛸
              </span>
              <h2 className="text-3xl font-black mt-4">Garanta seu Horário</h2>
              <p className="text-sm opacity-75 mt-2">Preencha seus dados para reservar a sua mesa e ter uma experiência incrível.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nome Completo *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Telefone de Contato *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </span>
                    <input 
                      type="tel" 
                      name="phone"
                      required
                      maxLength={15}
                      minLength={15}
                      inputMode="tel"
                      pattern="\([0-9]{2}\) [0-9]{5}-[0-9]{4}"
                      placeholder="(51) 99999-9999"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Número de Pessoas *</label>
                  <select 
                    name="guests"
                    value={formData.guests}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-slate-100 cursor-pointer"
                  >
                    <option value="1">1 Pessoa</option>
                    <option value="2">2 Pessoas</option>
                    <option value="3">3 Pessoas</option>
                    <option value="4">4 Pessoas</option>
                    <option value="5">5 Pessoas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Selecione o Dia *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <input 
                      type="date" 
                      name="date"
                      required
                      min={todayStr}
                      value={formData.date}
                      onChange={handleInputChange}
                      onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-slate-100 cursor-pointer"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Selecione o Horário *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {config.horarios_disponiveis.map((time) => {
                    const { available, remaining } = getSlotAvailability(time);
                    const isSelected = formData.time === time;
                    return (
                      <button
                        type="button"
                        key={time}
                        disabled={!available}
                        onClick={() => selectTime(time)}
                        className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected 
                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' 
                            : !available
                            ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                            : 'bg-slate-950 border-slate-800 text-slate-350 hover:border-primary/50'
                        }`}
                      >
                        <span>{time}</span>
                        <span className={`text-[9px] font-medium mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                          {remaining > 0 ? `${remaining} vagas` : 'Esgotado'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Observações Especiais (Mesa de Preferência, Alergias)</label>
                  <span className="text-[10px] text-slate-500 font-mono">{formData.notes.length}/100</span>
                </div>
                <textarea 
                  name="notes"
                  rows="3"
                  maxLength={100}
                  placeholder="Algum pedido especial para nós? (Máx. 100 caracteres)"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-slate-100 resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:brightness-110 transition-all cursor-pointer text-center"
              >
                Realizar reserva
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full border border-green-500/20 flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-3xl font-black text-slate-100">Agendamento Confirmado!</h3>
            <p className="text-sm opacity-85 mt-4 max-w-md">
              Obrigado, <strong className="text-primary">{formData.name}</strong>! Seu horário para o dia <strong>{formData.date}</strong> às <strong>{formData.time}</strong> foi agendado com sucesso para uma mesa de <strong>{formData.guests} {parseInt(formData.guests) === 1 ? 'pessoa' : 'pessoas'}</strong>.
            </p>
            <div className="mt-8 flex gap-4">
              <button 
                onClick={() => setIsSubmitted(false)}
                className="px-6 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold hover:border-primary/50 transition-all cursor-pointer"
              >
                Novo Agendamento
              </button>
              <Link 
                to="/"
                className="px-6 py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:brightness-105 transition-all cursor-pointer flex items-center"
              >
                Voltar ao Menu Principal
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingPage;
