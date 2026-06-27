'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Settings, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Users, 
  Clock, 
  User, 
  Phone, 
  Info,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';
import { getAgendamentos, getAgendaConfig, saveAgendaConfig, deleteAgendamento, isUsingDatabase } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface DashboardClientProps {
  user: any;
  config: {
    app_name: string;
    primary_color: string;
    secondary_color: string;
  };
}

export default function DashboardClient({ user, config }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'agenda' | 'config'>('agenda');
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [toasts, setToasts] = useState<any[]>([]);
  
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playNote = (freq: number, startTime: number, duration: number) => {
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

  const addToast = (booking: any) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, booking }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const [agendaConfig, setAgendaConfig] = useState({
    dias_funcionamento: [2, 3, 4, 5, 6, 0],
    horarios_disponiveis: ["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"],
    vagas_padrao: 5,
    limites_customizados: {} as Record<string, Record<string, number>>
  });
  const [loading, setLoading] = useState(true);
  
  // Weekly grid navigation state
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjusts to Monday as start
    return new Date(d.setDate(diff));
  });

  // Settings tab form inputs
  const [vagasPadraoInput, setVagasPadraoInput] = useState<number>(5);
  const [diasFuncionamentoSelected, setDiasFuncionamentoSelected] = useState<number[]>([2, 3, 4, 5, 6, 0]);
  const [exData, setExData] = useState('');
  const [exHorario, setExHorario] = useState('19:00');
  const [exVagas, setExVagas] = useState<number>(5);

  const [usingDb, setUsingDb] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bks, cfg] = await Promise.all([getAgendamentos(), getAgendaConfig()]);
      setBookings(bks);
      setAgendaConfig(cfg);
      setVagasPadraoInput(cfg.vagas_padrao);
      setDiasFuncionamentoSelected(cfg.dias_funcionamento);
      setUsingDb(isUsingDatabase());
    } catch (err) {
      console.error("Erro ao carregar dados do admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    let channel: any;
    if (usingDb) {
      channel = supabase
        .channel('admin-bookings-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'agendamentos'
          },
          async (payload: any) => {
            console.log("Novo agendamento recebido em tempo real!", payload);
            
            const updatedBookings = await getAgendamentos();
            setBookings(updatedBookings);
            
            playChime();
            
            const freshBooking = updatedBookings.find(b => b.id === payload.new.id);
            if (freshBooking) {
              addToast(freshBooking);
            } else {
              addToast({
                cliente_nome: payload.new.cliente_nome || 'Novo Cliente',
                horario: payload.new.horario || '',
                data: payload.new.data || ''
              });
            }
          }
        )
        .subscribe();
    }

    const handleStorageChange = async (e: StorageEvent) => {
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
        } catch (err) {
          console.error(err);
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
      setUsingDb(isUsingDatabase());
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente cancelar este agendamento?")) {
      const res = await deleteAgendamento(id);
      if (res.success) {
        handleRefresh();
      }
    }
  };

  const handleSaveConfigs = async () => {
    const updated = {
      ...agendaConfig,
      vagas_padrao: Number(vagasPadraoInput) || 5,
      dias_funcionamento: diasFuncionamentoSelected
    };

    const res = await saveAgendaConfig(updated);
    if (res.success) {
      setAgendaConfig(updated);
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
      ...(agendaConfig.limites_customizados || {})
    };

    if (!updatedOverrides[exData]) {
      updatedOverrides[exData] = {};
    }
    updatedOverrides[exData][exHorario] = Number(exVagas);

    const updated = {
      ...agendaConfig,
      limites_customizados: updatedOverrides
    };

    const res = await saveAgendaConfig(updated);
    if (res.success) {
      setAgendaConfig(updated);
      alert(`Exceção adicionada para ${exData} às ${exHorario}: ${exVagas} vagas.`);
    } else {
      alert("Erro ao salvar exceção.");
    }
  };

  const handleRemoveException = async (date: string, time: string) => {
    const updatedOverrides = { ...(agendaConfig.limites_customizados || {}) };
    if (updatedOverrides[date]) {
      delete updatedOverrides[date][time];
      if (Object.keys(updatedOverrides[date]).length === 0) {
        delete updatedOverrides[date];
      }
    }

    const updated = {
      ...agendaConfig,
      limites_customizados: updatedOverrides
    };

    const res = await saveAgendaConfig(updated);
    if (res.success) {
      setAgendaConfig(updated);
    }
  };

  // Helper date calculations for weekly view
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

  const changeWeek = (weeksDiff: number) => {
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
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const startStr = weekDates[0].toLocaleDateString('pt-BR', options);
    const endStr = weekDates[6].toLocaleDateString('pt-BR', options);
    const year = weekDates[0].getFullYear();
    return `${startStr} a ${endStr} (${year})`;
  };

  // KPIs
  const totalAgendamentos = bookings.length;
  const totalConfirmados = bookings.filter(b => b.status === 'Confirmado' || b.status === 'confirmado').length;
  const totalPessoas = bookings.reduce((sum, b) => sum + (Number(b.pessoas) || 1), 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header 
        className="px-6 py-4 flex items-center justify-between shadow-sm border-b text-white"
        style={{ backgroundColor: config.primary_color }}
      >
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center font-bold">
            A
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">Painel Admin</h1>
            <p className="text-[10px] text-white/80">{config.app_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium opacity-90 hidden sm:inline">
            {user.email}
          </span>
          <LogoutButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Top Titles */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Painel de Controle e Horários
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Gerencie a agenda semanal, vagas, limites e dias de funcionamento.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border ${
              usingDb 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-yellow-50 text-yellow-700 border-yellow-200'
            }`}>
              {usingDb ? 'Supabase Conectado' : 'Simulação Local Ativa'}
            </span>
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-250 rounded-xl text-xs font-bold text-gray-700 transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw className="size-3" />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card Total */}
          <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Reservas</span>
            <span className="text-3xl font-extrabold text-gray-900 mt-2">{totalAgendamentos}</span>
          </div>

          {/* Card Confirmados */}
          <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-500">Status Confirmados</span>
            <span className="text-3xl font-extrabold text-green-600 mt-2">{totalConfirmados}</span>
          </div>

          {/* Card Total Clientes */}
          <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Total Clientes (Pessoas)</span>
            <span className="text-3xl font-extrabold text-indigo-600 mt-2">{totalPessoas}</span>
          </div>
        </div>

        {/* Database Warning */}
        {!usingDb && (
          <div className="rounded-3xl border border-yellow-250 bg-yellow-50 p-4 flex gap-3 text-yellow-800">
            <AlertTriangle className="size-5 text-yellow-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">Aviso de Banco de Dados:</p>
              <p className="leading-relaxed">
                As tabelas `agendamentos` e `configuracao_agenda` não foram encontradas no Supabase. O painel está salvando dados localmente no seu navegador para demonstração. Copie o script SQL em `supabase_schema/001_initial_schema.sql` e execute-o no SQL Editor do Supabase para conectar permanentemente.
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('agenda')}
            className={`px-6 py-3 text-xs uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'agenda' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
            style={{ 
              borderBottomColor: activeTab === 'agenda' ? config.primary_color : undefined,
              color: activeTab === 'agenda' ? config.primary_color : undefined 
            }}
          >
            Agenda Semanal
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-6 py-3 text-xs uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'config' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
            style={{ 
              borderBottomColor: activeTab === 'config' ? config.primary_color : undefined,
              color: activeTab === 'config' ? config.primary_color : undefined 
            }}
          >
            Configurações
          </button>
        </div>

        {/* TAB 1: Weekly Grid */}
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            {/* Week navigation control */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white border border-gray-150 p-4 rounded-3xl shadow-sm">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => changeWeek(-1)}
                  className="p-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button 
                  onClick={setTodayWeek}
                  className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 text-[10px] uppercase tracking-wider font-bold text-gray-700 cursor-pointer"
                >
                  Hoje
                </button>
                <button 
                  onClick={() => changeWeek(1)}
                  className="p-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 cursor-pointer"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
              <span className="text-sm font-extrabold text-gray-700 tracking-wide">{formatWeekRange()}</span>
            </div>

            {/* Google Calendar-Style Weekly Table Grid */}
            <div className="overflow-x-auto bg-white border border-gray-150 rounded-3xl shadow-sm">
              <table className="w-full min-w-[1200px] border-collapse table-fixed text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-150 text-gray-750">
                    <th className="w-24 p-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-center bg-gray-50/80">Horário</th>
                    {weekDates.map((date, idx) => {
                      const isToday = new Date().toDateString() === date.toDateString();
                      return (
                        <th key={idx} className={`p-4 border-l border-gray-150 ${isToday ? 'bg-indigo-50/20' : 'bg-gray-50/30'}`}>
                          <div className="flex flex-col">
                            <span className={`text-[10px] uppercase font-bold tracking-widest ${isToday ? 'text-indigo-650 font-black' : 'text-gray-400'}`}>
                              {weekDaysLabels[idx]}
                            </span>
                            <span className={`text-lg font-black mt-0.5 ${isToday ? 'text-indigo-600' : 'text-gray-800'}`}>
                              {date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' })}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {agendaConfig.horarios_disponiveis.map((time) => (
                    <tr key={time} className="hover:bg-gray-50/20 group/row">
                      <td className="p-4 text-xs font-extrabold text-gray-550 text-center bg-gray-50/30 border-r border-gray-150">
                        {time}
                      </td>
                      {weekDates.map((date, dayIdx) => {
                        const dateStr = date.toISOString().split('T')[0];
                        const bookingsInSlot = bookings.filter(b => b.data === dateStr && b.horario === time);
                        const occupiedSlots = bookingsInSlot.length;
                        const limit = agendaConfig.limites_customizados?.[dateStr]?.[time] ?? agendaConfig.vagas_padrao;
                        const hasException = agendaConfig.limites_customizados?.[dateStr]?.[time] !== undefined;

                        const isWorkingDay = agendaConfig.dias_funcionamento.includes(date.getDay());

                        return (
                          <td 
                            key={dayIdx} 
                            className={`p-3 border-l border-gray-100 align-top relative min-h-[120px] transition-colors ${
                              !isWorkingDay 
                                ? 'bg-gray-100/50 opacity-30 select-none' 
                                : 'bg-white hover:bg-gray-50/10'
                            }`}
                          >
                            {isWorkingDay ? (
                              <div className="space-y-2">
                                {/* Slot Capacity indicator */}
                                <div className="flex justify-between items-center">
                                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold tracking-wide shadow-2xs ${
                                    occupiedSlots >= limit 
                                      ? 'bg-red-100 text-red-700 border border-red-200' 
                                      : hasException 
                                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {occupiedSlots}/{limit} vagas {hasException && '⚡'}
                                  </span>
                                </div>

                                {/* Bookings Cards */}
                                <div className="space-y-1.5">
                                  {bookingsInSlot.map((b) => {
                                    const name = b.cliente_nome || b.name || (b.clientes && (b.clientes.nome || b.clientes.cliente_nome)) || 'Sem nome';
                                    const phone = b.cliente_telefone || b.phone || (b.clientes && b.clientes.telefone) || 'Sem telefone';
                                    
                                    return (
                                      <div 
                                        key={b.id} 
                                        onClick={() => setSelectedBooking(b)}
                                        className="group/card relative p-2.5 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl flex flex-col justify-between shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer select-none text-[11px] leading-tight"
                                        style={{ borderLeft: `3.5px solid ${config.primary_color}` }}
                                      >
                                        <div>
                                          <div className="flex items-center justify-between gap-1">
                                            <p className="font-extrabold text-gray-800 truncate pr-1 text-xs">
                                              {name}
                                            </p>
                                            <span 
                                              className="text-[9px] font-black text-white px-1.5 py-0.2 rounded-sm shrink-0"
                                              style={{ backgroundColor: config.primary_color }}
                                            >
                                              {b.pessoas}p
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-gray-500 truncate mt-1">
                                            {phone}
                                          </p>
                                        </div>
                                        
                                        <div className="flex justify-end items-center mt-2 pt-1.5 border-t border-gray-100 opacity-60 group-hover/card:opacity-100 transition-opacity">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDelete(b.id);
                                            }}
                                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                                            title="Cancelar reserva"
                                          >
                                            <Trash2 className="size-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center min-h-[70px] text-[9px] text-gray-400 font-bold uppercase tracking-widest select-none">
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

        {/* TAB 2: Configurations */}
        {activeTab === 'config' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Base Settings */}
            <div className="bg-white border border-gray-150 p-6 rounded-3xl shadow-sm space-y-6">
              <h3 className="text-lg font-extrabold text-gray-800 border-b border-gray-100 pb-2">
                Regras de Funcionamento
              </h3>
              
              {/* Default slots */}
              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
                  Capacidade Padrão por Horário (lugares)
                </label>
                <input 
                  type="number"
                  min="1"
                  max="50"
                  value={vagasPadraoInput}
                  onChange={(e) => setVagasPadraoInput(Number(e.target.value))}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-250 focus:border-indigo-600 focus:outline-none text-gray-800"
                />
              </div>

              {/* Working days checkboxes */}
              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-2">
                  Dias em que o Estabelecimento Abre
                </label>
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
                      <label key={day.value} className="flex items-center gap-2 px-3 py-2 border border-gray-200 hover:border-indigo-50 bg-gray-50/50 rounded-xl cursor-pointer select-none">
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
                          className="accent-indigo-600 size-4"
                        />
                        <span className="text-xs font-semibold text-gray-700">{day.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleSaveConfigs}
                className="w-full py-2.5 text-xs uppercase tracking-wider font-extrabold text-white rounded-xl shadow-xs transition-all hover:brightness-110 cursor-pointer"
                style={{ backgroundColor: config.primary_color }}
              >
                Salvar Regras Principais
              </button>
            </div>

            {/* Overrides & Slot limits exception */}
            <div className="bg-white border border-gray-150 p-6 rounded-3xl shadow-sm space-y-6">
              <h3 className="text-lg font-extrabold text-gray-800 border-b border-gray-100 pb-2">
                Exceções e Ajustes de Vagas
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Use este painel para alterar a quantidade de vagas disponíveis para um dia e horário específico. Defina <strong>0</strong> vagas para fechar totalmente o horário.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-gray-500">Selecionar Dia</label>
                  <input 
                    type="date"
                    value={exData}
                    onChange={(e) => setExData(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-250 text-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-gray-500">Selecionar Horário</label>
                  <select
                    value={exHorario}
                    onChange={(e) => setExHorario(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-250 bg-white text-gray-800"
                  >
                    {agendaConfig.horarios_disponiveis.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-gray-500">Vagas Disponíveis</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={exVagas}
                    onChange={(e) => setExVagas(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-250 text-gray-800"
                  />
                </div>
              </div>

              <button
                onClick={handleAddException}
                className="w-full py-2.5 text-xs uppercase tracking-wider font-extrabold text-gray-700 bg-gray-50 border border-gray-250 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
              >
                Aplicar Ajuste de Vaga
              </button>

              {/* Overrides list */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Limites Customizados Ativos</h4>
                {Object.keys(agendaConfig.limites_customizados || {}).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nenhuma exceção cadastrada. Todos os horários seguem a capacidade padrão.</p>
                ) : (
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {Object.entries(agendaConfig.limites_customizados).map(([date, timesObj]) => (
                      Object.entries(timesObj).map(([time, limit]) => (
                        <div 
                          key={`${date}-${time}`} 
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-150 text-xs"
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-gray-700">
                              {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')} às {time}
                            </span>
                            <span className="text-[10px] text-gray-500 block">
                              Limite alterado para: <strong>{limit} vagas</strong>
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveException(date, time)}
                            className="p-1 rounded hover:bg-red-50 text-red-500 transition-colors cursor-pointer"
                            title="Remover limite customizado"
                          >
                            <Trash2 className="size-4" />
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
      </main>
      {/* Modal de Detalhes da Reserva (Google Calendar Style) */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-gray-800">
          <div className="bg-white border border-gray-150 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-5">
            <button 
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-655 text-xl font-bold transition-colors cursor-pointer"
            >
              &times;
            </button>
            <div>
              <h3 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-2">Detalhes do Agendamento</h3>
            </div>
            
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <span className="text-[10px] uppercase text-gray-400 block font-bold tracking-wider mb-1">Cliente</span>
                <span className="text-base font-extrabold text-gray-900">
                  {selectedBooking.cliente_nome || selectedBooking.name || (selectedBooking.clientes && (selectedBooking.clientes.nome || selectedBooking.clientes.cliente_nome)) || 'Sem nome'}
                </span>
              </div>
              
              <div>
                <span className="text-[10px] uppercase text-gray-400 block font-bold tracking-wider mb-1">Telefone</span>
                <span className="text-gray-800 font-semibold">
                  {selectedBooking.cliente_telefone || selectedBooking.phone || (selectedBooking.clientes && selectedBooking.clientes.telefone) || 'Sem telefone'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block font-bold tracking-wider mb-1">Data</span>
                  <span className="text-gray-800 font-semibold">
                    {new Date(selectedBooking.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block font-bold tracking-wider mb-1">Horário</span>
                  <span className="text-gray-800 font-semibold">{selectedBooking.horario}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block font-bold tracking-wider mb-1">Pessoas</span>
                  <span className="text-gray-800 font-bold">{selectedBooking.pessoas} pessoas</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block font-bold tracking-wider mb-1">Status</span>
                  <span 
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white inline-block"
                    style={{ backgroundColor: config.primary_color }}
                  >
                    {selectedBooking.status || 'Confirmado'}
                  </span>
                </div>
              </div>

              {selectedBooking.observacoes && (
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block font-bold tracking-wider mb-1">Observações</span>
                  <p className="text-gray-600 bg-gray-50 p-3.5 rounded-2xl border border-gray-150 italic text-xs leading-relaxed break-words break-all whitespace-pre-wrap">
                    "{selectedBooking.observacoes}"
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-3">
              <button
                onClick={() => {
                  if (selectedBooking) {
                    handleDelete(selectedBooking.id);
                  }
                  setSelectedBooking(null);
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer text-center"
              >
                Cancelar Reserva
              </button>
              <button
                onClick={() => setSelectedBooking(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
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
            className="bg-white border border-gray-150 rounded-2xl p-4 shadow-2xl flex gap-3.5 items-start animate-slide-in text-left text-gray-800"
            style={{ borderLeft: `4px solid ${config.primary_color}` }}
          >
            <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: `${config.primary_color}10`, color: config.primary_color }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: config.primary_color }}>
                Nova Reserva Recebida!
              </h4>
              <p className="text-sm font-extrabold text-gray-900 truncate mt-0.5">
                {t.booking.cliente_nome || t.booking.name || 'Cliente'}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                Dia: <strong className="text-gray-700">{t.booking.data ? new Date(t.booking.data + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</strong> às <strong className="text-gray-700">{t.booking.horario}</strong>
              </p>
            </div>
            <button 
              onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
              className="text-gray-400 hover:text-gray-600 text-sm font-bold shrink-0 cursor-pointer"
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
