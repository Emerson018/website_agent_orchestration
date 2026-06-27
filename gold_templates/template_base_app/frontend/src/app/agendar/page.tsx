'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { Calendar, User, Phone, CheckCircle2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getAgendaConfig, getAgendamentos, createAgendamento } from '@/lib/api';

export default function BookingPage() {
  const [appName, setAppName] = useState('Agendador PWA');
  const [primaryColor, setPrimaryColor] = useState('#4F46E5');
  const [secondaryColor, setSecondaryColor] = useState('#10B981');
  const [logoUrl, setLogoUrl] = useState('/logo.png');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [workingHours, setWorkingHours] = useState('');

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
    limites_customizados: {} as Record<string, Record<string, number>>
  });
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/ai_config.json');
        const configData = await res.json();
        if (configData?.app_name) setAppName(configData.app_name);
        if (configData?.primary_color) setPrimaryColor(configData.primary_color);
        if (configData?.secondary_color) setSecondaryColor(configData.secondary_color);
        if (configData?.logo_url) setLogoUrl(configData.logo_url);
        if (configData?.address) setAddress(configData.address);
        if (configData?.phone) setPhone(configData.phone);
        if (configData?.working_hours) setWorkingHours(configData.working_hours);

        const [cfg, bks] = await Promise.all([getAgendaConfig(), getAgendamentos()]);
        setConfig(cfg);
        setBookings(bks);
      } catch (err) {
        // Fallbacks are already set
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const selectTime = (time: string) => {
    setFormData(prev => ({ ...prev, time }));
  };

  const getSlotAvailability = (timeSlot: string) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
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
  const theme = appName.toLowerCase().includes('marcianos') ? 'dark' : 'light';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 font-sans">
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
    <div className="min-h-screen flex flex-col">
      <Header appName={appName} primaryColor={primaryColor} logoUrl={logoUrl} theme={theme} />

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 my-6">
        <div className="max-w-2xl w-full bg-white dark:bg-slate-900 shadow-xl rounded-3xl p-6 sm:p-10 border border-gray-100 dark:border-slate-850 relative overflow-hidden text-gray-900 dark:text-slate-100">
          
          {!isSubmitted ? (
            <>
              <div className="text-center mb-8">
                <span 
                  className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border"
                  style={{ 
                    color: primaryColor,
                    backgroundColor: `${primaryColor}10`,
                    borderColor: `${primaryColor}20`
                  }}
                >
                  Agendamento 🛸
                </span>
                <h2 className="text-3xl font-black mt-4 tracking-tight">Garanta seu Horário</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">Preencha seus dados para reservar a sua mesa e ter uma experiência incrível.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">Nome Completo *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                        <User className="size-4" />
                      </span>
                      <input 
                        type="text" 
                        name="name"
                        required
                        maxLength={30}
                        placeholder="Seu nome completo"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-250 dark:border-slate-800 rounded-2xl text-sm bg-gray-50 dark:bg-slate-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 dark:text-slate-100"
                        style={{ '--tw-ring-color': `${primaryColor}30`, focusBorderColor: primaryColor } as any}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">Telefone de Contato *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                        <Phone className="size-4" />
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
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-250 dark:border-slate-800 rounded-2xl text-sm bg-gray-50 dark:bg-slate-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 dark:text-slate-100"
                        style={{ '--tw-ring-color': `${primaryColor}30`, focusBorderColor: primaryColor } as any}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">Número de Pessoas *</label>
                    <select 
                      name="guests"
                      value={formData.guests}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-250 dark:border-slate-800 rounded-2xl text-sm bg-gray-50 dark:bg-slate-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 dark:text-slate-100 cursor-pointer"
                      style={{ '--tw-ring-color': `${primaryColor}30`, focusBorderColor: primaryColor } as any}
                    >
                      <option value="1">1 Pessoa</option>
                      <option value="2">2 Pessoas</option>
                      <option value="3">3 Pessoas</option>
                      <option value="4">4 Pessoas</option>
                      <option value="5">5 Pessoas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">Selecione o Dia *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                        <Calendar className="size-4" />
                      </span>
                      <input 
                        type="date" 
                        name="date"
                        required
                        min={todayStr}
                        value={formData.date}
                        onChange={handleInputChange}
                        onClick={(e) => { try { (e.target as any).showPicker(); } catch (err) {} }}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-250 dark:border-slate-800 rounded-2xl text-sm bg-gray-50 dark:bg-slate-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 dark:text-slate-100 cursor-pointer"
                        style={{ '--tw-ring-color': `${primaryColor}30`, focusBorderColor: primaryColor, colorScheme: theme === 'dark' ? 'dark' : 'normal' } as any}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">Selecione o Horário *</label>
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
                          className="py-2.5 px-3 text-xs sm:text-sm font-bold rounded-2xl border transition-all cursor-pointer text-center flex flex-col items-center justify-center"
                          style={{
                            backgroundColor: isSelected ? primaryColor : 'transparent',
                            borderColor: isSelected ? primaryColor : '#e5e7eb',
                            color: isSelected ? '#ffffff' : !available ? '#9ca3af' : 'inherit',
                            opacity: !available ? 0.4 : 1
                          }}
                        >
                          <span>{time}</span>
                          <span className="text-[9px] font-medium opacity-80 mt-0.5">
                            {remaining > 0 ? `${remaining} vagas` : 'Esgotado'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Observações Especiais</label>
                    <span className="text-[10px] text-gray-450 font-mono">{formData.notes.length}/100</span>
                  </div>
                  <textarea 
                    name="notes"
                    rows={3}
                    maxLength={100}
                    placeholder="Algum pedido especial para nós? (Máx. 100 caracteres)"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-250 dark:border-slate-800 rounded-2xl text-sm bg-gray-50 dark:bg-slate-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 dark:text-slate-100 resize-none"
                    style={{ '--tw-ring-color': `${primaryColor}30`, focusBorderColor: primaryColor } as any}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 text-white font-bold rounded-2xl shadow-md transition-all hover:opacity-90 active:scale-[0.98] text-center cursor-pointer"
                  style={{ 
                    backgroundColor: primaryColor,
                    boxShadow: `0 4px 10px -3px ${primaryColor}40`
                  }}
                >
                  Realizar reserva
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-10 flex flex-col items-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mb-6 border"
                style={{ 
                  color: primaryColor,
                  backgroundColor: `${primaryColor}10`,
                  borderColor: `${primaryColor}20`
                }}
              >
                <CheckCircle2 className="size-8" />
              </div>
              <h3 className="text-3xl font-black tracking-tight">Reserva Realizada!</h3>
              <p className="text-sm opacity-80 mt-4 max-w-md leading-relaxed">
                Obrigado, <strong style={{ color: primaryColor }}>{formData.name}</strong>! Seu horário para o dia <strong>{formData.date}</strong> às <strong>{formData.time}</strong> foi agendado com sucesso para uma mesa de <strong>{formData.guests} {parseInt(formData.guests) === 1 ? 'pessoa' : 'pessoas'}</strong>.
              </p>
              <div className="mt-8 flex gap-4 w-full justify-center">
                <button 
                  onClick={() => setIsSubmitted(false)}
                  className="px-6 py-2.5 rounded-2xl border border-gray-255 dark:border-slate-800 text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-850 transition-all cursor-pointer text-gray-600 dark:text-slate-300"
                >
                  Nova Reserva
                </button>
                <Link 
                  href="/"
                  className="px-6 py-2.5 text-white text-xs font-bold rounded-2xl shadow-sm hover:opacity-90 transition-all cursor-pointer flex items-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  Voltar ao Início
                </Link>
              </div>
            </div>
          )}
          
        </div>
      </main>

      <Footer 
        appName={appName}
        address={address}
        phone={phone}
        workingHours={workingHours}
        primaryColor={primaryColor}
        theme={theme}
      />
    </div>
  );
}
