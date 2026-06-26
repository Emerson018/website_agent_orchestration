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
  }, []);

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
              <table className="w-full min-w-[900px] border-collapse table-fixed text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-150">
                    <th className="w-24 p-3 text-xs font-bold uppercase tracking-wider text-gray-400 text-center">Horário</th>
                    {weekDates.map((date, idx) => {
                      const isToday = new Date().toDateString() === date.toDateString();
                      return (
                        <th key={idx} className={`p-3 border-l border-gray-150 ${isToday ? 'bg-indigo-50/30' : ''}`}>
                          <div className="flex flex-col">
                            <span className={`text-[9px] uppercase font-bold tracking-wider ${isToday ? 'text-indigo-600 font-extrabold' : 'text-gray-400'}`}>
                              {weekDaysLabels[idx]}
                            </span>
                            <span className={`text-sm font-extrabold ${isToday ? 'text-indigo-600 font-black' : 'text-gray-800'}`}>
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
                    <tr key={time} className="hover:bg-gray-50/30">
                      <td className="p-3 text-xs font-bold text-gray-500 text-center bg-gray-50/50 border-r border-gray-150">
                        {time}
                      </td>
                      {weekDates.map((date, dayIdx) => {
                        const dateStr = date.toISOString().split('T')[0];
                        const bookingsInSlot = bookings.filter(b => b.data === dateStr && b.horario === time);
                        const sumPessoas = bookingsInSlot.reduce((sum, b) => sum + (Number(b.pessoas) || 1), 0);
                        const limit = agendaConfig.limites_customizados?.[dateStr]?.[time] ?? agendaConfig.vagas_padrao;
                        const hasException = agendaConfig.limites_customizados?.[dateStr]?.[time] !== undefined;

                        const isWorkingDay = agendaConfig.dias_funcionamento.includes(date.getDay());

                        return (
                          <td 
                            key={dayIdx} 
                            className={`p-2 border-l border-gray-100 align-top relative min-h-[110px] ${
                              !isWorkingDay ? 'bg-gray-100/50 opacity-40' : ''
                            }`}
                          >
                            {isWorkingDay ? (
                              <div className="space-y-1.5">
                                {/* Occupancy Bar */}
                                <div className="flex justify-between items-center mb-1">
                                  <span className={`text-[8px] font-mono px-1 py-0.5 rounded font-extrabold ${
                                    sumPessoas >= limit 
                                      ? 'bg-red-100 text-red-700' 
                                      : hasException 
                                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {sumPessoas}/{limit} vagas {hasException && '⚡'}
                                  </span>
                                </div>

                                {/* Bookings Cards */}
                                {bookingsInSlot.map((b) => (
                                  <div 
                                    key={b.id} 
                                    className="p-2 bg-white border border-gray-200 hover:border-gray-300 rounded-xl flex flex-col justify-between shadow-xs transition-all gap-1.5 text-[10px] leading-tight"
                                  >
                                    <div>
                                      <p className="font-extrabold text-gray-800 truncate pr-3">{b.cliente_nome}</p>
                                      <p className="text-[9px] text-gray-550 truncate mt-0.5">{b.cliente_telefone}</p>
                                      {b.observacoes && (
                                        <p className="text-[8px] text-gray-400 italic mt-1 truncate" title={b.observacoes}>
                                          "{b.observacoes}"
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-gray-100 mt-1">
                                      <span className="text-[8px] font-bold text-indigo-600 font-mono">{b.pessoas}p</span>
                                      <button
                                        onClick={() => handleDelete(b.id)}
                                        className="p-0.5 rounded hover:bg-red-50 text-red-500 transition-colors cursor-pointer"
                                        title="Cancelar reserva"
                                      >
                                        <Trash2 className="size-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center min-h-[60px] text-[9px] text-gray-400 font-bold uppercase tracking-wider">
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
    </div>
  );
}
