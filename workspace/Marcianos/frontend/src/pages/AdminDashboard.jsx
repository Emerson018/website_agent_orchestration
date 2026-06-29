import React, { useEffect, useState } from 'react';
import { getAgendamentos, getAgendaConfig, saveAgendaConfig, deleteAgendamento, isUsingDatabase } from '../services/api';
import { supabase } from '../lib/supabase';

const getLocalDateString = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('agenda'); // 'agenda' | 'config'
  const [bookings, setBookings] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [config, setConfig] = useState({
    dias_funcionamento: [2, 3, 4, 5, 6, 0],
    horarios_disponiveis: ["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"],
    vagas_padrao: 5,
    limites_customizados: {}
  });
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajusta para Segunda-feira como início
    return new Date(d.setDate(diff));
  });

  // States de configuração
  const [vagasPadraoInput, setVagasPadraoInput] = useState(5);
  const [diasFuncionamentoSelected, setDiasFuncionamentoSelected] = useState([2, 3, 4, 5, 6, 0]);
  const [exData, setExData] = useState('');
  const [exHorario, setExHorario] = useState('19:00');
  const [exVagas, setExVagas] = useState(5);

  const [usingDb, setUsingDb] = useState(false);

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playNote = (freq, startTime, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playNote(587.33, audioCtx.currentTime, 0.4); // D5
      playNote(880.00, audioCtx.currentTime + 0.15, 0.6); // A5
    } catch (err) {
      console.warn("Audio context failed to play chime:", err);
    }
  };

  const addToast = (booking) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, booking }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [bks, cfg] = await Promise.all([getAgendamentos(), getAgendaConfig()]);
        setBookings(bks);
        setConfig(cfg);
        setVagasPadraoInput(cfg.vagas_padrao);
        setDiasFuncionamentoSelected(cfg.dias_funcionamento);
        // Atualiza o estado da conexão para sincronizar o realtime
        setUsingDb(isUsingDatabase());
      } catch (err) {
        console.error("Erro ao carregar dados do admin:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    let channel;
    if (usingDb) {
      channel = supabase
        .channel('admin-bookings-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'agendamentos_base'
          },
          async (payload) => {
            console.log("Alteração recebida em tempo real no Supabase!", payload);
            
            // Recarrega a lista completa
            const updatedBookings = await getAgendamentos();
            setBookings(updatedBookings);
            
            // Toca sinal apenas em novas inserções
            if (payload.eventType === 'INSERT') {
              playChime();
              
              const freshBooking = updatedBookings.find(b => b.id === payload.new.id);
              if (freshBooking) {
                addToast(freshBooking);
              } else {
                addToast({
                  cliente_nome: 'Novo Cliente',
                  horario: payload.new.inicio ? new Date(payload.new.inicio).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : '',
                  data: payload.new.inicio ? new Date(payload.new.inicio).toISOString().split('T')[0] : ''
                });
              }
            }
          }
        )
        .subscribe();
    }

    const handleStorageChange = async (e) => {
      if (e.key === 'mock_agendamentos') {
        const updatedBookings = await getAgendamentos();
        setBookings(updatedBookings);
        
        playChime();
        
        try {
          const localList = JSON.parse(e.newValue || '[]');
          if (localList.length > 0) {
            const last = localList[localList.length - 1];
            addToast(last);
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [usingDb]);

  const handleRefresh = async () => {
    try {
      const bks = await getAgendamentos();
      setBookings(bks);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Deseja realmente cancelar este agendamento?")) {
      const res = await deleteAgendamento(id);
      if (res.success) {
        handleRefresh();
      }
    }
  };

  const handleSaveConfigs = async () => {
    const updated = {
      ...config,
      vagas_padrao: parseInt(vagasPadraoInput) || 5,
      dias_funcionamento: diasFuncionamentoSelected
    };

    const res = await saveAgendaConfig(updated);
    if (res.success) {
      setConfig(updated);
      alert("Configurações salvas com sucesso!");
    } else {
      alert("Erro ao salvar configurações.");
    }
  };

  const handleAddException = async () => {
    if (!exData || !exHorario) {
      alert("Por favor, selecione a data e o horário para a exceção.");
      return;
    }

    const updatedOverrides = {
      ...(config.limites_customizados || {})
    };

    if (!updatedOverrides[exData]) {
      updatedOverrides[exData] = {};
    }
    updatedOverrides[exData][exHorario] = parseInt(exVagas);

    const updated = {
      ...config,
      limites_customizados: updatedOverrides
    };

    const res = await saveAgendaConfig(updated);
    if (res.success) {
      setConfig(updated);
      alert(`Exceção adicionada para ${exData} às ${exHorario}: ${exVagas} vagas.`);
    } else {
      alert("Erro ao salvar exceção.");
    }
  };

  const handleRemoveException = async (date, time) => {
    const updatedOverrides = { ...(config.limites_customizados || {}) };
    if (updatedOverrides[date]) {
      delete updatedOverrides[date][time];
      if (Object.keys(updatedOverrides[date]).length === 0) {
        delete updatedOverrides[date];
      }
    }

    const updated = {
      ...config,
      limites_customizados: updatedOverrides
    };

    const res = await saveAgendaConfig(updated);
    if (res.success) {
      setConfig(updated);
    }
  };

  // Funções de manipulação de data para a Agenda Semanal
  const getWeekDates = () => {
    const dates = [];
    const temp = new Date(currentWeekStart);
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const weekDaysLabels = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

  const changeWeek = (weeksDiff) => {
    const nextWeekStart = new Date(currentWeekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + (weeksDiff * 7));
    setCurrentWeekStart(nextWeekStart);
  };

  const setTodayWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(d.setDate(diff)));
  };

  const formatWeekRange = () => {
    const options = { day: 'numeric', month: 'short' };
    const startStr = weekDates[0].toLocaleDateString('pt-BR', options);
    const endStr = weekDates[6].toLocaleDateString('pt-BR', options);
    const year = weekDates[0].getFullYear();
    return `${startStr} a ${endStr} (${year})`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-100 font-sans">
        <p className="text-sm font-semibold animate-pulse text-primary">Carregando painel administrativo...</p>
      </div>
    );
  }

  // KPIs
  const totalAgendamentos = bookings.length;
  const totalConfirmados = bookings.filter(b => b.status === 'Confirmado').length;
  const totalPessoas = bookings.reduce((sum, b) => sum + (parseInt(b.pessoas) || 1), 0);

  return (
    <div className="space-y-6 font-sans text-slate-100 bg-slate-950 min-h-screen px-4 sm:px-6 py-6">
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">Painel do Administrador</h2>
          <p className="text-xs text-slate-400 mt-1">Gerencie a agenda semanal, vagas, limites e dias de funcionamento.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border ${
            usingDb 
              ? 'bg-green-500/10 text-green-400 border-green-500/20' 
              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
          }`}>
            {usingDb ? 'Supabase Conectado' : 'Simulação Local ativa'}
          </span>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Reservas</span>
          <span className="mt-2 text-3xl font-extrabold text-white">{totalAgendamentos}</span>
        </div>
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Status Confirmados</span>
          <span className="mt-2 text-3xl font-extrabold text-green-400">{totalConfirmados}</span>
        </div>
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Total Clientes (Pessoas)</span>
          <span className="mt-2 text-3xl font-extrabold text-white">{totalPessoas}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-900">
        <button
          onClick={() => setActiveTab('agenda')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'agenda' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Agenda Semanal
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'config' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Configurações
        </button>
      </div>

      {/* Database Warning */}
      {!usingDb && (
        <div className="bg-yellow-500/10 border border-yellow-550/20 text-yellow-300 px-4 py-3.5 rounded-2xl text-xs flex gap-3 items-center">
          <svg className="w-5 h-5 shrink-0 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <strong>Aviso de Banco de Dados:</strong> As tabelas `agendamentos` e `configuracao_agenda` não foram encontradas no Supabase. O painel está salvando dados localmente no seu navegador para demonstração. Copie o script SQL em `supabase_schema/001_initial_schema.sql` e execute-o no SQL Editor do Supabase para conectar permanentemente.
          </div>
        </div>
      )}

      {/* Aba 1: Agenda Semanal (Google Calendar Style) */}
      {activeTab === 'agenda' && (
        <div className="space-y-4">
          {/* Navigation bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-900 border border-slate-850 p-4 rounded-2xl">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => changeWeek(-1)}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-350 cursor-pointer"
              >
                &larr;
              </button>
              <button 
                onClick={setTodayWeek}
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-850 text-xs font-bold cursor-pointer"
              >
                Hoje
              </button>
              <button 
                onClick={() => changeWeek(1)}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-350 cursor-pointer"
              >
                &rarr;
              </button>
            </div>
            <span className="text-sm font-bold text-white tracking-wide">{formatWeekRange()}</span>
          </div>

          {/* Grid Semanal */}
          <div className="overflow-x-auto border border-slate-900 rounded-3xl shadow-2xl">
            <table className="w-full min-w-[1200px] border-collapse table-fixed text-left">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-850 text-slate-300">
                  <th className="w-24 p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center bg-slate-900/80">Horário</th>
                  {weekDates.map((date, idx) => {
                    const isToday = new Date().toDateString() === date.toDateString();
                    return (
                      <th key={idx} className={`p-4 border-l border-slate-850 ${isToday ? 'bg-primary/5' : 'bg-slate-900/40'}`}>
                        <div className="flex flex-col">
                          <span className={`text-[10px] uppercase font-bold tracking-widest ${isToday ? 'text-primary font-black' : 'text-slate-400'}`}>
                            {weekDaysLabels[idx]}
                          </span>
                          <span className={`text-lg font-black mt-0.5 ${isToday ? 'text-primary' : 'text-white'}`}>
                            {date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' })}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 bg-slate-900/10">
                {config.horarios_disponiveis.map((time) => (
                  <tr key={time} className="hover:bg-slate-950/20 group/row">
                    <td className="p-4 text-sm font-extrabold text-slate-400 text-center bg-slate-900/30 border-r border-slate-850">
                      {time}
                    </td>
                    {weekDates.map((date, dayIdx) => {
                      const dateStr = getLocalDateString(date);
                      const bookingsInSlot = bookings.filter(b => b.data === dateStr && b.horario === time);
                      const occupiedSlots = bookingsInSlot.length;
                      const limit = config.limites_customizados?.[dateStr]?.[time] ?? config.vagas_padrao;
                      const hasException = config.limites_customizados?.[dateStr]?.[time] !== undefined;

                      const isWorkingDay = config.dias_funcionamento.includes(date.getDay());

                      return (
                        <td 
                          key={dayIdx} 
                          className={`p-3 border-l border-slate-850 align-top relative min-h-[120px] transition-colors ${
                            !isWorkingDay 
                              ? 'bg-slate-950/70 pattern-dots opacity-30 select-none' 
                              : 'bg-slate-900/5 group-hover/row:bg-slate-900/20'
                          }`}
                        >
                          {isWorkingDay ? (
                            <div className="space-y-2">
                              {/* Slot Capacity indicator */}
                              <div className="flex justify-between items-center">
                                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold tracking-wide shadow-xs ${
                                  occupiedSlots >= limit 
                                    ? 'bg-red-500/15 text-red-400 border border-red-500/20' 
                                    : hasException 
                                    ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                                    : 'bg-slate-800/80 text-slate-400'
                                }`}>
                                  {occupiedSlots}/{limit} vagas {hasException && '⚡'}
                                </span>
                              </div>

                              {/* Cartões dos Agendamentos */}
                              <div className="space-y-1.5">
                                {bookingsInSlot.map((b) => {
                                  const name = b.cliente_nome || b.name || (b.clientes && (b.clientes.nome || b.clientes.cliente_nome)) || 'Sem nome';
                                  const phone = b.cliente_telefone || b.phone || (b.clientes && b.clientes.telefone) || 'Sem telefone';
                                  
                                  return (
                                    <div 
                                      key={b.id} 
                                      onClick={() => setSelectedBooking(b)}
                                      className="group/card relative p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col justify-between shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer select-none text-[11px] leading-tight"
                                      style={{ borderLeft: '3.5px solid var(--primary-color, #6366f1)' }}
                                    >
                                      <div>
                                        <div className="flex items-center justify-between gap-1">
                                          <p className="font-extrabold text-slate-100 truncate pr-1 text-xs">
                                            {name}
                                          </p>
                                          <span className="text-[9px] font-black text-primary bg-primary/10 px-1 rounded-sm shrink-0">
                                            {b.pessoas}p
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 truncate mt-1">
                                          {phone}
                                        </p>
                                      </div>
                                      
                                      <div className="flex justify-end items-center mt-2 pt-1.5 border-t border-slate-850/80 opacity-60 group-hover/card:opacity-100 transition-opacity">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(b.id);
                                          }}
                                          className="p-1 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                                          title="Cancelar reserva"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center min-h-[70px] text-[9px] text-slate-650 font-extrabold uppercase tracking-widest select-none">
                              Fechado
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aba 2: Configurações */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Configurações de Funcionamento */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-lg space-y-6">
            <h3 className="text-xl font-bold border-b border-slate-850 pb-2">Regras de Funcionamento</h3>
            
            {/* Vagas padrão */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Capacidade Padrão por Horário (lugares)</label>
              <input 
                type="number"
                min="1"
                max="50"
                value={vagasPadraoInput}
                onChange={(e) => setVagasPadraoInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-primary focus:outline-none text-slate-100"
              />
            </div>

            {/* Dias de funcionamento */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Dias em que o Estabelecimento Abre</label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { value: 1, label: "Segunda-feira" },
                  { value: 2, label: "Terça-feira" },
                  { value: 3, label: "Quarta-feira" },
                  { value: 4, label: "Quinta-feira" },
                  { value: 5, label: "Sexta-feira" },
                  { value: 6, label: "Sábado" },
                  { value: 0, label: "Domingo" }
                ].map(day => {
                  const isChecked = diasFuncionamentoSelected.includes(day.value);
                  return (
                    <label key={day.value} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-800 hover:border-primary/20 bg-slate-950/50 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setDiasFuncionamentoSelected(prev => prev.filter(v => v !== day.value));
                          } else {
                            setDiasFuncionamentoSelected(prev => [...prev, day.value]);
                          }
                        }}
                        className="accent-primary size-4"
                      />
                      <span className="text-xs font-semibold">{day.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSaveConfigs}
              className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow hover:brightness-110 transition-all cursor-pointer"
            >
              Salvar Regras Principais
            </button>
          </div>

          {/* Exceções e Bloqueio de Vagas */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-lg space-y-6">
            <h3 className="text-xl font-bold border-b border-slate-850 pb-2">Exceções e Ajustes de Vagas</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Use este painel para alterar a quantidade de vagas disponíveis para um dia e horário específico. Defina <strong>0</strong> vagas para fechar totalmente o horário.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Selecionar Dia</label>
                <input 
                  type="date"
                  value={exData}
                  onChange={(e) => setExData(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Selecionar Horário</label>
                <select
                  value={exHorario}
                  onChange={(e) => setExHorario(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                >
                  {config.horarios_disponiveis.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Vagas Disponíveis</label>
                <input 
                  type="number"
                  min="0"
                  max="100"
                  value={exVagas}
                  onChange={(e) => setExVagas(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>
            </div>

            <button
              onClick={handleAddException}
              className="w-full py-3 bg-slate-950 border border-slate-800 hover:border-primary/50 text-white font-bold rounded-xl transition-all cursor-pointer"
            >
              Aplicar Ajuste de Vaga
            </button>

            {/* Lista de exceções salvas */}
            <div className="space-y-3 pt-4 border-t border-slate-850">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Limites Customizados Ativos</h4>
              {Object.keys(config.limites_customizados || {}).length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">Nenhuma exceção cadastrada. Todos os horários seguem a capacidade padrão.</p>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {Object.entries(config.limites_customizados).map(([date, timesObj]) => (
                    Object.entries(timesObj).map(([time, limit]) => (
                      <div 
                        key={`${date}-${time}`} 
                        className="flex justify-between items-center p-2.5 bg-slate-950 rounded-xl border border-slate-855 text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-200">
                            {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')} às {time}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Limite alterado para: <strong>{limit} vagas</strong>
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveException(date, time)}
                          className="p-1 rounded hover:bg-red-500/10 text-red-400 transition-colors cursor-pointer"
                          title="Remover limite customizado"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal de Detalhes da Reserva (Google Calendar Style) */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-5 text-slate-100">
            <button 
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 text-slate-450 hover:text-white text-xl font-bold transition-colors"
            >
              &times;
            </button>
            <div>
              <h3 className="text-lg font-black text-white border-b border-slate-800 pb-2">Detalhes do Agendamento</h3>
            </div>
            
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block font-bold tracking-wider mb-1">Cliente</span>
                <span className="text-base font-extrabold text-primary">
                  {selectedBooking.cliente_nome || selectedBooking.name || (selectedBooking.clientes && (selectedBooking.clientes.nome || selectedBooking.clientes.cliente_nome)) || 'Sem nome'}
                </span>
              </div>
              
              <div>
                <span className="text-[10px] uppercase text-slate-400 block font-bold tracking-wider mb-1">Telefone</span>
                <span className="text-slate-200 font-semibold">
                  {selectedBooking.cliente_telefone || selectedBooking.phone || (selectedBooking.clientes && selectedBooking.clientes.telefone) || 'Sem telefone'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-bold tracking-wider mb-1">Data</span>
                  <span className="text-slate-200 font-semibold">
                    {new Date(selectedBooking.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-bold tracking-wider mb-1">Horário</span>
                  <span className="text-slate-200 font-semibold">{selectedBooking.horario}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-bold tracking-wider mb-1">Pessoas</span>
                  <span className="text-slate-200 font-bold">{selectedBooking.pessoas} pessoas</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-bold tracking-wider mb-1">Status</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 inline-block">
                    {selectedBooking.status || 'Confirmado'}
                  </span>
                </div>
              </div>

              {selectedBooking.observacoes && (
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-bold tracking-wider mb-1">Observações</span>
                  <p className="text-slate-350 bg-slate-950/50 p-3.5 rounded-2xl border border-slate-850 italic text-xs leading-relaxed break-words break-all whitespace-pre-wrap">
                    "{selectedBooking.observacoes}"
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-3">
              <button
                onClick={() => {
                  handleDelete(selectedBooking.id);
                  setSelectedBooking(null);
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer text-center"
              >
                Cancelar Reserva
              </button>
              <button
                onClick={() => setSelectedBooking(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Container de Notificações Toast em Tempo Real */}
      <div className="fixed bottom-6 right-6 z-[100] space-y-3 max-w-sm w-full">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex gap-3.5 items-start animate-slide-in text-left text-slate-100"
            style={{ borderLeft: '4px solid var(--primary-color, #6366f1)' }}
          >
            <div className="bg-primary/10 p-2 rounded-xl text-primary shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-primary">Nova Reserva Recebida!</h4>
              <p className="text-sm font-extrabold text-white truncate mt-0.5">
                {t.booking.cliente_nome || t.booking.name || 'Cliente'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Dia: <strong className="text-slate-200">{t.booking.data ? new Date(t.booking.data + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</strong> às <strong className="text-slate-200">{t.booking.horario}</strong>
              </p>
            </div>
            <button 
              onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
              className="text-slate-500 hover:text-slate-300 text-sm font-bold shrink-0 cursor-pointer"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}

export default AdminDashboard;
