import React, { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { getAgendamentos, getAgendaConfig, saveAgendaConfig, deleteAgendamento, isUsingDatabase } from '../services/api';
import { supabase } from '../lib/supabase';

const getLocalDateString = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('agenda'); // 'agenda' | 'config'
  const [currentPage, setCurrentPage] = useState(1);
  const [agendaViewMode, setAgendaViewMode] = useState('grid'); // 'grid' | 'table'
  const [bookings, setBookings] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null); // null | { type: 'loading' | 'success' | 'error', message: string }
  const [showConfirmLeaveModal, setShowConfirmLeaveModal] = useState(false);
  const [pendingTabChange, setPendingTabChange] = useState(null);

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [expandedSlots, setExpandedSlots] = useState({}); // Controle de expansão de slots da agenda

  const [activityLogs, setActivityLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_activity_logs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Ref e estados para arrastar o grid da agenda (pan scroll)
  const gridRef = React.useRef(null);
  const bulkSaveTimeoutRef = React.useRef(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const [config, setConfig] = useState({
    dias_funcionamento: [2, 3, 4, 5, 6, 0],
    horarios_disponiveis: ["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"],
    vagas_padrao: 5,
    limites_customizados: {},
    campo_observacoes_ativo: true,
    antecedencia_maxima_dias: 7
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
  const [limitesCustomizadosSelected, setLimitesCustomizadosSelected] = useState({});
  const [diasFuncionamentoSelected, setDiasFuncionamentoSelected] = useState([2, 3, 4, 5, 6, 0]);
  const [exData, setExData] = useState(() => getLocalDateString(new Date()));
  const [campoObservacoesAtivoInput, setCampoObservacoesAtivoInput] = useState(true);
  const [horariosDisponiveisSelected, setHorariosDisponiveisSelected] = useState([]);
  const [antecedenciaMaximaDiasInput, setAntecedenciaMaximaDiasInput] = useState(7);
  const [newTimeInput, setNewTimeInput] = useState('');
  const [bulkLimitInput, setBulkLimitInput] = useState(5); // Capacidade de ajuste em massa do dia
  const [bulkStart, setBulkStart] = useState('18:00');
  const [bulkEnd, setBulkEnd] = useState('22:00');
  const [bulkInterval, setBulkInterval] = useState('30');

  const [usingDb, setUsingDb] = useState(false);

  // Sincroniza o bulkLimitInput com o limite do dia selecionado
  useEffect(() => {
    if (config && exData) {
      const firstTime = config.horarios_disponiveis?.length ? [...config.horarios_disponiveis].sort()[0] : null;
      const customLimit = firstTime ? config.limites_customizados?.[exData]?.[firstTime] : undefined;
      setBulkLimitInput(customLimit !== undefined ? customLimit : config.vagas_padrao);
    }
  }, [exData, config]);

  // Verificação de alterações não salvas
  const checkUnsavedChanges = () => {
    if (campoObservacoesAtivoInput !== (config.campo_observacoes_ativo ?? true)) return true;
    if (antecedenciaMaximaDiasInput !== (config.antecedencia_maxima_dias ?? 7)) return true;
    if (JSON.stringify(limitesCustomizadosSelected) !== JSON.stringify(config.limites_customizados || {})) return true;
    
    // Compara dias de funcionamento
    if (diasFuncionamentoSelected.length !== config.dias_funcionamento.length) return true;
    const sortedSelectedDays = [...diasFuncionamentoSelected].sort();
    const sortedConfigDays = [...config.dias_funcionamento].sort();
    for (let i = 0; i < sortedSelectedDays.length; i++) {
      if (sortedSelectedDays[i] !== sortedConfigDays[i]) return true;
    }

    // Compara horários disponíveis
    if (horariosDisponiveisSelected.length !== (config.horarios_disponiveis || []).length) return true;
    const sortedSelectedHours = [...horariosDisponiveisSelected].sort();
    const sortedConfigHours = [...(config.horarios_disponiveis || [])].sort();
    for (let i = 0; i < sortedSelectedHours.length; i++) {
      if (sortedSelectedHours[i] !== sortedConfigHours[i]) return true;
    }

    return false;
  };
  const hasUnsavedChanges = checkUnsavedChanges();

  // Intercepta recarregamento ou fechamento da aba no navegador
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Intercepta navegação por rotas do React Router
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges &&
      currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowConfirmLeaveModal(true);
    }
  }, [blocker.state]);

  const handleTabChange = (newTab) => {
    if (activeTab === 'config' && newTab !== 'config' && hasUnsavedChanges) {
      setPendingTabChange(newTab);
      setShowConfirmLeaveModal(true);
    } else {
      setActiveTab(newTab);
      setPendingTabChange(null);
      setCurrentPage(1);
    }
  };

  const handleConfirmLeave = () => {
    setShowConfirmLeaveModal(false);
    
    // Descarta alterações redefinindo os inputs locais para a configuração ativa salva
    setDiasFuncionamentoSelected(config.dias_funcionamento);
    setCampoObservacoesAtivoInput(config.campo_observacoes_ativo ?? true);
    setHorariosDisponiveisSelected(config.horarios_disponiveis || []);
    setLimitesCustomizadosSelected(config.limites_customizados || {});
    setAntecedenciaMaximaDiasInput(config.antecedencia_maxima_dias ?? 7);
    
    if (blocker.state === 'blocked') {
      blocker.proceed();
    } else if (pendingTabChange) {
      setActiveTab(pendingTabChange);
      setPendingTabChange(null);
      setCurrentPage(1);
    }
  };

  const handleCancelLeave = () => {
    setShowConfirmLeaveModal(false);
    if (blocker.state === 'blocked') {
      blocker.reset();
    } else {
      setPendingTabChange(null);
    }
  };

  // Funções de manipulação do mouse para arrasto (pan scroll) e rolagem horizontal
  const handleMouseDown = (e) => {
    const isInteractive = e.target.closest('button, input, select, a') || e.target.closest('.group\\/card') || e.target.closest('[class*="group/card"]');
    if (isInteractive) return;

    setIsMouseDown(true);
    setStartX(e.pageX - gridRef.current.offsetLeft);
    setScrollLeft(gridRef.current.scrollLeft);
    setStartY(e.pageY - gridRef.current.offsetTop);
    setScrollTop(gridRef.current.scrollTop);
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown) return;
    e.preventDefault();
    const x = e.pageX - gridRef.current.offsetLeft;
    const walkX = (x - startX) * 1.5;
    gridRef.current.scrollLeft = scrollLeft - walkX;

    const y = e.pageY - gridRef.current.offsetTop;
    const walkY = (y - startY) * 1.5;
    gridRef.current.scrollTop = scrollTop - walkY;
  };

  const handleWheel = (e) => {
    if (gridRef.current && e.deltaY !== 0) {
      gridRef.current.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };

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

  const addNotification = (booking) => {
    const newNotif = {
      id: String(Date.now() + Math.random()),
      booking: {
        cliente_nome: booking.cliente_nome || booking.clienteNome || 'Cliente',
        data: booking.data,
        horario: booking.horario,
        pessoas: booking.pessoas || 1
      },
      read: false,
      timestamp: new Date().toISOString()
    };
    
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      localStorage.setItem('admin_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const addActivityLog = (actionType, details) => {
    const newLog = {
      id: String(Date.now() + Math.random()),
      actionType,
      details,
      timestamp: new Date().toISOString()
    };
    setActivityLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('admin_activity_logs', JSON.stringify(updated));
      return updated;
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem('admin_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('admin_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('admin_notifications');
  };

  // Fecha o menu de notificações quando clica fora
  useEffect(() => {
    if (!showNotifications) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.notifications-container')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showNotifications]);

  useEffect(() => {
    async function loadData() {
      try {
        const [bks, cfg] = await Promise.all([getAgendamentos(), getAgendaConfig()]);
        
        // Finaliza automaticamente agendamentos anteriores ao dia de hoje
        const todayStr = getLocalDateString(new Date());
        const pastBookings = bks.filter(b => b.data < todayStr && b.status !== 'Finalizado' && b.status !== 'Cancelado');
        if (pastBookings.length > 0) {
          const idsToFinalize = pastBookings.map(b => b.id);
          try {
            await supabase
              .from('agendamentos_base')
              .update({ status: 'Finalizado' })
              .in('id', idsToFinalize);
            
            bks.forEach(b => {
              if (idsToFinalize.includes(b.id)) {
                b.status = 'Finalizado';
              }
            });
          } catch (updateErr) {
            console.error("Erro ao finalizar agendamentos passados no Supabase:", updateErr);
          }
        }

        setBookings(bks);
        setConfig(cfg);
        setVagasPadraoInput(cfg.vagas_padrao);
        setDiasFuncionamentoSelected(cfg.dias_funcionamento);
        setCampoObservacoesAtivoInput(cfg.campo_observacoes_ativo ?? true);
        setHorariosDisponiveisSelected(cfg.horarios_disponiveis || []);
        setLimitesCustomizadosSelected(cfg.limites_customizados || {});
        setAntecedenciaMaximaDiasInput(cfg.antecedencia_maxima_dias ?? 7);
        // Atualiza o estado da conexão para sincronizar o realtime
        setUsingDb(isUsingDatabase());

        // Se o histórico de ações no dispositivo atual não foi inicializado, popula com as reservas existentes
        const isInitialized = localStorage.getItem('admin_activity_logs_initialized');
        if (!isInitialized) {
          const initialLogs = bks.map(b => {
            const dateStr = b.data ? new Date(b.data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
            return {
              id: `init-${b.id}`,
              actionType: 'create',
              details: `Nova reserva criada para ${b.cliente_nome || b.clienteNome || 'Cliente'} (Data: ${dateStr} às ${b.horario}, ${b.pessoas}p)`,
              timestamp: b.created_at || new Date().toISOString()
            };
          });
          initialLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          setActivityLogs(initialLogs);
          localStorage.setItem('admin_activity_logs', JSON.stringify(initialLogs));
          localStorage.setItem('admin_activity_logs_initialized', 'true');
        }
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
            try {
              // Registra o cancelamento no log de atividades se o status mudou para Cancelado via webhook
              if (payload.eventType === 'UPDATE' && payload.new.status === 'Cancelado' && payload.old.status !== 'Cancelado') {
                setBookings(prevBookings => {
                  const oldBooking = prevBookings.find(b => b.id === payload.new.id);
                  if (oldBooking) {
                    const clientName = oldBooking.cliente_nome || 'Cliente';
                    const dateStr = oldBooking.data ? new Date(oldBooking.data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
                    const horario = oldBooking.horario || '';
                    addActivityLog('cancel', `Reserva de ${clientName} (Data: ${dateStr} às ${horario}) foi cancelada via WhatsApp pelo cliente`);
                  }
                  return prevBookings;
                });
              }

              // Recarrega a lista completa
              const updatedBookings = await getAgendamentos();
              setBookings(updatedBookings);
              
              // Toca sinal apenas em novas inserções
              if (payload.eventType === 'INSERT') {
                playChime();
                
                const freshBooking = updatedBookings.find(b => b.id === payload.new.id);
                if (freshBooking) {
                  addToast(freshBooking);
                  addNotification(freshBooking);
                  const bookingDateStr = freshBooking.data ? new Date(freshBooking.data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
                  addActivityLog('create', `Nova reserva criada para ${freshBooking.cliente_nome} (Data: ${bookingDateStr} às ${freshBooking.horario}, ${freshBooking.pessoas}p)`);
                } else {
                  let datePart = '';
                  let timePart = '';
                  if (payload.new.inicio) {
                    const parts = payload.new.inicio.split(/T|\s/);
                    datePart = parts[0] || '';
                    if (parts[1]) {
                      timePart = parts[1].slice(0, 5);
                    }
                  }
                  
                  const mockBooking = {
                    cliente_nome: 'Novo Cliente',
                    horario: timePart || '18:30',
                    data: datePart || getLocalDateString(new Date())
                  };
                  addToast(mockBooking);
                  addNotification(mockBooking);
                  const bookingDateStr = mockBooking.data ? new Date(mockBooking.data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
                  addActivityLog('create', `Nova reserva criada para Novo Cliente (Data: ${bookingDateStr} às ${mockBooking.horario})`);
                }
              }
            } catch (err) {
              console.error("Erro no callback realtime do Supabase:", err);
            }
          }
        )
        .subscribe();
    }

    const handleStorageChange = async (e) => {
      if (e.key === 'mock_agendamentos') {
        try {
          const updatedBookings = await getAgendamentos();
          setBookings(updatedBookings);
          
          playChime();
          
          const localList = JSON.parse(e.newValue || '[]');
          if (localList.length > 0) {
            const last = localList[localList.length - 1];
            addToast(last);
            addNotification(last);
            const bookingDateStr = last.data ? new Date(last.data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
            addActivityLog('create', `Nova reserva criada para ${last.clienteNome || last.cliente_nome || 'Cliente'} (Data: ${bookingDateStr} às ${last.horario}, ${last.pessoas || 2}p)`);
          }
        } catch (err) {
          console.error("Erro ao processar storage change:", err);
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
      const bookingToDelete = bookings.find(b => b.id === id);
      const res = await deleteAgendamento(id);
      if (res.success) {
        if (bookingToDelete) {
          addActivityLog('cancel', `Reserva de ${bookingToDelete.cliente_nome || bookingToDelete.clienteNome || 'Cliente'} para o dia ${new Date(bookingToDelete.data + 'T00:00:00').toLocaleDateString('pt-BR')} às ${bookingToDelete.horario} foi cancelada pelo administrador`);
        } else {
          addActivityLog('cancel', `Um agendamento (ID: ${id}) foi cancelado pelo administrador`);
        }
        // Atualiza o estado local imediatamente para refletir nos KPIs e no painel
        setBookings(prev => prev.filter(b => b.id !== id));
        handleRefresh();
      }
    }
  };

  const handleSaveConfigs = async () => {
    const sortedHours = [...horariosDisponiveisSelected].sort((a, b) => a.localeCompare(b));
    const updated = {
      ...config,
      vagas_padrao: config.vagas_padrao,
      dias_funcionamento: diasFuncionamentoSelected,
      campo_observacoes_ativo: campoObservacoesAtivoInput,
      horarios_disponiveis: sortedHours,
      limites_customizados: limitesCustomizadosSelected,
      antecedencia_maxima_dias: antecedenciaMaximaDiasInput
    };

    setSaveStatus({ type: 'loading', message: 'Salvando suas alterações...' });

    const res = await saveAgendaConfig(updated);
    if (res.success) {
      setConfig(updated);
      setHorariosDisponiveisSelected(sortedHours);
      setLimitesCustomizadosSelected(limitesCustomizadosSelected);
      setSaveStatus({ type: 'success', message: 'As configurações da agenda foram salvas com sucesso no banco de dados.' });
      addActivityLog('config_save', `As configurações, limites e regras principais da agenda foram salvas/atualizadas`);
      setTimeout(() => {
        setSaveStatus(null);
      }, 3500);
    } else {
      setSaveStatus({ type: 'error', message: 'Não foi possível salvar as configurações. Por favor, tente novamente.' });
    }
  };

  const handleDiscardChanges = () => {
    if (window.confirm("Deseja realmente descartar todas as alterações não salvas?")) {
      setDiasFuncionamentoSelected(config.dias_funcionamento);
      setCampoObservacoesAtivoInput(config.campo_observacoes_ativo ?? true);
      setHorariosDisponiveisSelected(config.horarios_disponiveis || []);
      setLimitesCustomizadosSelected(config.limites_customizados || {});
      setAntecedenciaMaximaDiasInput(config.antecedencia_maxima_dias ?? 7);
    }
  };

  const handleBulkLimitChange = (newVal) => {
    const val = Math.max(0, parseInt(newVal) || 0);
    setBulkLimitInput(val);
    
    setLimitesCustomizadosSelected(prev => {
      const updated = { ...prev };
      if (!updated[exData]) {
        updated[exData] = {};
      }
      config.horarios_disponiveis.forEach(time => {
        updated[exData][time] = val;
      });
      return updated;
    });
  };

  const handleUpdateSlotLimit = (time, newLimit) => {
    if (!exData) return;
    
    setLimitesCustomizadosSelected(prev => {
      const updated = { ...prev };
      if (newLimit === config.vagas_padrao) {
        if (updated[exData]) {
          delete updated[exData][time];
          if (Object.keys(updated[exData]).length === 0) {
            delete updated[exData];
          }
        }
      } else {
        if (!updated[exData]) {
          updated[exData] = {};
        }
        updated[exData][time] = Math.max(0, parseInt(newLimit));
      }
      return updated;
    });
  };

  const handleRemoveException = (date, time) => {
    setLimitesCustomizadosSelected(prev => {
      const updated = { ...prev };
      if (updated[date]) {
        delete updated[date][time];
        if (Object.keys(updated[date]).length === 0) {
          delete updated[date];
        }
      }
      return updated;
    });
  };

  const handleAddHorario = () => {
    if (!newTimeInput) return;
    if (horariosDisponiveisSelected.includes(newTimeInput)) {
      alert("Este horário já está na lista.");
      return;
    }
    setHorariosDisponiveisSelected(prev => [...prev, newTimeInput].sort((a, b) => a.localeCompare(b)));
    addActivityLog('add_time', `Horário ${newTimeInput} adicionado à lista de horários disponíveis`);
    setNewTimeInput('');
  };

  const handleRemoveHorario = (timeToRemove) => {
    if (window.confirm(`Deseja realmente remover o horário ${timeToRemove}?`)) {
      setHorariosDisponiveisSelected(prev => prev.filter(t => t !== timeToRemove));
      addActivityLog('remove_time', `Horário ${timeToRemove} removido da lista de horários disponíveis`);
    }
  };

  const handleGenerateBulkHorarios = () => {
    if (!bulkStart || !bulkEnd || !bulkInterval) {
      alert("Por favor, preencha todos os campos do gerador.");
      return;
    }

    const [startH, startM] = bulkStart.split(':').map(Number);
    const [endH, endM] = bulkEnd.split(':').map(Number);
    
    let startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const step = parseInt(bulkInterval);
    
    if (startMinutes >= endMinutes) {
      alert("A hora de início deve ser menor que a hora de término.");
      return;
    }

    const generated = [];
    while (startMinutes <= endMinutes) {
      const h = Math.floor(startMinutes / 60) % 24;
      const m = startMinutes % 60;
      const pad = (n) => String(n).padStart(2, '0');
      generated.push(`${pad(h)}:${pad(m)}`);
      startMinutes += step;
    }

    // Merge generated hours with current ones, ensuring uniqueness
    setHorariosDisponiveisSelected(prev => {
      const merged = new Set([...prev, ...generated]);
      return Array.from(merged).sort((a, b) => a.localeCompare(b));
    });

    alert(`${generated.length} horários foram gerados com sucesso! Não esqueça de clicar em "Salvar Regras Principais" abaixo/acima para gravar permanentemente.`);
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

  // KPIs (Filtrados para o dia de hoje)
  const todayStr = getLocalDateString(new Date());
  const bookingsHoje = bookings.filter(b => b.data === todayStr);
  const totalAgendamentos = bookingsHoje.length;
  const totalConfirmados = bookingsHoje.filter(b => b.status === 'Confirmado').length;
  const totalPessoas = bookingsHoje.reduce((sum, b) => sum + (parseInt(b.pessoas) || 1), 0);
  const taxaConfirmacao = totalAgendamentos > 0 ? Math.round((totalConfirmados / totalAgendamentos) * 100) : 0;



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
          
          {/* Botão e Menu de Notificações */}
          <div className="relative notifications-container">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-350 hover:text-white transition-all cursor-pointer relative flex items-center justify-center"
              title="Histórico de Notificações"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-[0_0_6px_#ef4444] animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown de Histórico de Notificações */}
            {showNotifications && (
              <div className="absolute right-0 mt-2.5 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3 animate-fade-in text-left">
                <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Notificações</h3>
                  <div className="flex gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[9px] font-bold text-primary hover:underline cursor-pointer border-0 bg-transparent"
                      >
                        Ler todas
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-[9px] font-bold text-slate-500 hover:text-slate-350 cursor-pointer border-0 bg-transparent"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic text-center py-6 text-slate-400">
                      Nenhuma notificação recebida no momento.
                    </p>
                  ) : (
                    notifications.map(n => {
                      const formatTime = (isoString) => {
                        const date = new Date(isoString);
                        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                      };
                      return (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer relative ${
                            n.read
                              ? 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                              : 'bg-primary/5 border-primary/20 hover:border-primary/30'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-xs font-extrabold text-white truncate max-w-[160px]">
                              {n.booking.cliente_nome}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono">
                              {formatTime(n.timestamp)}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Reserva: <strong className="text-slate-200">{n.booking.data ? new Date(n.booking.data + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</strong> às <strong className="text-slate-200">{n.booking.horario}</strong> ({n.booking.pessoas}p)
                          </p>
                          {!n.read && (
                            <span className="absolute top-3.5 right-3 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_4px_#ef4444]" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Reservas Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 hover:border-slate-700/60 rounded-2xl p-5 flex flex-col justify-between shadow-lg hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 hover:translate-y-[-2px] group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reservas (Hoje)</span>
              <p className="text-[10px] text-slate-500 font-medium">Agendamentos para hoje</p>
            </div>
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tight">{totalAgendamentos}</span>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">Hoje</span>
          </div>
        </div>

        {/* Confirmados Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 hover:border-slate-700/60 rounded-2xl p-5 flex flex-col justify-between shadow-lg hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 hover:translate-y-[-2px] group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Confirmados (Hoje)</span>
              <p className="text-[10px] text-slate-500 font-medium">Garantidos para hoje</p>
            </div>
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 tracking-tight">{totalConfirmados}</span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Hoje</span>
          </div>
        </div>

        {/* Total Clientes Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 hover:border-slate-700/60 rounded-2xl p-5 flex flex-col justify-between shadow-lg hover:shadow-xl hover:shadow-sky-500/5 transition-all duration-300 hover:translate-y-[-2px] group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes (Hoje)</span>
              <p className="text-[10px] text-slate-500 font-medium">Presença estimada hoje</p>
            </div>
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tight">{totalPessoas}</span>
            <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">Pessoas</span>
          </div>
        </div>

        {/* Taxa de Confirmação Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 hover:border-slate-700/60 rounded-2xl p-5 flex flex-col justify-between shadow-lg hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 hover:translate-y-[-2px] group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Confirmações (Hoje)</span>
              <p className="text-[10px] text-slate-500 font-medium">Mapeamento de hoje</p>
            </div>
            <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-3xl font-black text-white tracking-tight">{taxaConfirmacao}%</span>
              <span className="text-[10px] font-medium text-slate-400">{totalConfirmados} de {totalAgendamentos}</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${taxaConfirmacao}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-900">
        <button
          onClick={() => handleTabChange('agenda')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'agenda' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Agenda Semanal
        </button>
        <button
          onClick={() => handleTabChange('config')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'config' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Configurações</span>
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b] shrink-0 animate-pulse" title="Alterações não salvas" />
          )}
        </button>
        <button
          onClick={() => handleTabChange('historico')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'historico' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Histórico de Ações
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
                {agendaViewMode === 'grid' ? (
                  <>
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
                  </>
                ) : (
                  <div className="flex items-center gap-2 px-1">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs uppercase font-black tracking-wider text-indigo-400">Tabela de Reservas</span>
                  </div>
                )}
              </div>
              
              <span className="text-sm font-bold text-white tracking-wide">
                {agendaViewMode === 'grid' ? formatWeekRange() : `Total: ${bookings.length} agendamentos cadastrados`}
              </span>

              {/* Seletor de modo de visualização */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-xl shrink-0">
                <button
                  onClick={() => setAgendaViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer ${
                    agendaViewMode === 'grid'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-450 hover:text-slate-200'
                  }`}
                >
                  Grade Semanal
                </button>
                <button
                  onClick={() => setAgendaViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer ${
                    agendaViewMode === 'table'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-450 hover:text-slate-200'
                  }`}
                >
                  Tabela Geral
                </button>
              </div>
            </div>

          {/* Conteúdo Dinâmico */}
          {agendaViewMode === 'table' ? (
            <div className="overflow-x-auto border border-slate-850 rounded-3xl shadow-2xl bg-slate-900/50 backdrop-blur-md">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold tracking-widest bg-slate-950/40">
                    <th className="p-4 w-60">Data e Hora</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Telefone</th>
                    <th className="p-4 text-center w-24">Pessoas</th>
                    <th className="p-4">Observações</th>
                    <th className="p-4 w-32">Status</th>
                    <th className="p-4 text-center w-28">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300 bg-slate-900/10">
                  {(() => {
                    const sortedBookings = [...bookings]
                      .filter(b => b.status !== 'Cancelado' && b.status !== 'Finalizado')
                      .sort((a, b) => {
                        const dateA = new Date(`${a.data}T${a.horario}:00`);
                        const dateB = new Date(`${b.data}T${b.horario}:00`);
                        return dateA - dateB;
                      });

                    if (sortedBookings.length === 0) {
                      return (
                        <tr>
                          <td colSpan="7" className="p-12 text-center text-slate-500 font-bold text-xs uppercase tracking-wider">
                            Nenhum agendamento encontrado
                          </td>
                        </tr>
                      );
                    }

                    return sortedBookings.map((b) => {
                      const name = b.cliente_nome || b.name || (b.clientes && (b.clientes.nome || b.clientes.cliente_nome)) || 'Sem nome';
                      const phone = b.cliente_telefone || b.phone || (b.clientes && b.clientes.telefone) || 'Sem telefone';
                      const isConfirmed = (b.status || 'Confirmado') === 'Confirmado';
                      
                      const bookingDate = new Date(`${b.data}T00:00:00`);
                      const dateFormatted = bookingDate.toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      });
                      const capitalizedDate = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

                      return (
                        <tr 
                          key={b.id} 
                          className="hover:bg-slate-950/20 transition-colors group/tr"
                        >
                          <td className="p-4 text-xs font-mono font-bold text-white">
                            <div className="flex flex-col gap-0.5">
                              <span>{capitalizedDate}</span>
                              <span className="text-[10px] text-indigo-400 font-black tracking-wider uppercase">⏰ {b.horario}</span>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-extrabold text-slate-100">
                            {name}
                          </td>
                          <td className="p-4 text-xs font-mono text-slate-450">
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {phone}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-mono text-center font-black">
                            <span className="bg-slate-950/50 border border-slate-800 text-slate-350 px-2.5 py-1 rounded-lg">
                              {b.pessoas}p
                            </span>
                          </td>
                          <td className="p-4 text-[11px] text-slate-400 max-w-[200px] truncate" title={b.observacoes || 'Nenhuma'}>
                            {b.observacoes || <span className="text-slate-650 font-mono italic">Sem observações</span>}
                          </td>
                          <td className="p-4 text-xs">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] uppercase font-black tracking-wider ${
                              b.status === 'Cancelado'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : b.status === 'Confirmado'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${
                                b.status === 'Cancelado' ? 'bg-red-500' : b.status === 'Confirmado' ? 'bg-emerald-500' : 'bg-amber-500'
                              }`} />
                              {b.status || 'Confirmado'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => setSelectedBooking(b)}
                                className="p-1.5 rounded bg-slate-950/50 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-450 hover:text-white transition-all cursor-pointer"
                                title="Ver detalhes"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(b.id);
                                }}
                                className="p-1.5 rounded bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/25 text-slate-450 hover:text-red-400 transition-all cursor-pointer"
                                title="Cancelar reserva"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <div 
              ref={gridRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              onWheel={handleWheel}
              className={`overflow-auto max-h-[85vh] border border-slate-900 rounded-3xl shadow-2xl ${isMouseDown ? 'cursor-grabbing select-none' : 'cursor-grab'}`} 
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <table className="w-full min-w-[1600px] border-collapse table-fixed text-left">
                <thead className="sticky top-0 z-20 bg-slate-900 shadow-md">
                  <tr className="border-b border-slate-850 text-slate-300">
                    <th className="w-24 p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center bg-slate-900 sticky left-0 z-30 border-r border-slate-850 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Horário</th>
                    {weekDates.map((date, idx) => {
                      const isToday = new Date().toDateString() === date.toDateString();
                      return (
                        <th key={idx} className={`p-4 border-l border-slate-850 bg-slate-900 ${isToday ? 'text-primary' : ''}`}>
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
                        <td className="p-4 text-sm font-extrabold text-slate-400 text-center bg-slate-900 sticky left-0 z-10 border-r border-slate-850 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                          {time}
                        </td>
                        {weekDates.map((date, dayIdx) => {
                          const dateStr = getLocalDateString(date);
                          const bookingsInSlot = bookings.filter(b => b.data === dateStr && b.horario === time && b.status !== 'Cancelado' && b.status !== 'Finalizado');
                          const occupiedSlots = bookingsInSlot.length;
                          const limit = config.limites_customizados?.[dateStr]?.[time] ?? config.vagas_padrao;
                          const hasException = config.limites_customizados?.[dateStr]?.[time] !== undefined;

                          const isWorkingDay = config.dias_funcionamento.includes(date.getDay());

                          return (
                            <td 
                              key={dayIdx} 
                              className={`p-2 border-l border-slate-850 align-top relative transition-colors ${
                                !isWorkingDay 
                                  ? 'bg-slate-950/70 pattern-dots opacity-30 select-none' 
                                  : 'bg-slate-900/5 group-hover/row:bg-slate-900/20'
                              }`}
                              style={{ height: '90px' }}
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
                                    {(() => {
                                      const slotKey = `${dateStr}_${time}`;
                                      const isExpanded = expandedSlots[slotKey];
                                      const shouldStack = bookingsInSlot.length > 3;
                                      
                                      const visibleBookings = shouldStack && !isExpanded 
                                        ? bookingsInSlot.slice(0, 2) 
                                        : bookingsInSlot;

                                      return (
                                        <>
                                          {visibleBookings.map((b) => {
                                            const name = b.cliente_nome || b.name || (b.clientes && (b.clientes.nome || b.clientes.cliente_nome)) || 'Sem nome';
                                            const phone = b.cliente_telefone || b.phone || (b.clientes && b.clientes.telefone) || 'Sem telefone';
                                            const isConfirmed = (b.status || 'Confirmado') === 'Confirmado';
                                            
                                            return (
                                              <div 
                                                key={b.id} 
                                                onClick={() => setSelectedBooking(b)}
                                                className="group/card relative p-3 bg-gradient-to-br from-slate-900 to-slate-950/70 hover:from-slate-850 hover:to-slate-900 border border-slate-800/85 hover:border-slate-750/90 rounded-xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer select-none text-[11px] leading-tight"
                                              >
                                                <div className="space-y-2">
                                                  {/* Card Top: Status Dot and Pessoas Badge */}
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                      <span className={`w-1.5 h-1.5 rounded-full ${
                                                        b.status === 'Cancelado'
                                                          ? 'bg-red-500 shadow-[0_0_6px_#ef4444]'
                                                          : b.status === 'Confirmado'
                                                          ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                                                          : 'bg-amber-500 shadow-[0_0_6px_#f59e0b]'
                                                      }`} />
                                                      <span className={`text-[9px] uppercase font-black tracking-wider ${
                                                        b.status === 'Cancelado'
                                                          ? 'text-red-400'
                                                          : b.status === 'Confirmado'
                                                          ? 'text-emerald-450'
                                                          : 'text-amber-450'
                                                      }`}>
                                                        {b.status || 'Confirmado'}
                                                      </span>
                                                    </div>
                                                    <span className="text-[9px] font-black text-slate-350 bg-slate-800/80 border border-slate-750 px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-0.5">
                                                      <svg className="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                      </svg>
                                                      {b.pessoas}p
                                                    </span>
                                                  </div>
                                                  
                                                  {/* Cliente Name and Contact Info */}
                                                  <div className="space-y-1">
                                                    <p className="font-extrabold text-slate-100 truncate pr-1 text-xs tracking-wide">
                                                      {name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-450 truncate flex items-center gap-1">
                                                      <svg className="w-2.5 h-2.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                      </svg>
                                                      {phone}
                                                    </p>
                                                  </div>
                                                </div>
                                                
                                                {/* Card Footer: Action */}
                                                <div className="flex justify-end items-center mt-2.5 pt-1.5 border-t border-slate-800/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
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

                                          {shouldStack && !isExpanded && (
                                            <div 
                                              onClick={() => setExpandedSlots(prev => ({ ...prev, [slotKey]: true }))}
                                              className="relative p-3 bg-gradient-to-br from-indigo-950 to-slate-900 hover:from-indigo-900 border border-indigo-500/30 hover:border-indigo-400/50 rounded-xl flex flex-col justify-center items-center shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer select-none text-[11px] py-4 text-center group/stack mt-1.5"
                                            >
                                              {/* Efeito 3D de Cartas Empilhadas */}
                                              <div className="absolute top-1 left-1 w-full h-full bg-slate-900/60 border border-slate-850 rounded-xl -z-10 translate-x-1 translate-y-1 scale-98 shadow-sm transition-transform group-hover/stack:translate-x-1.5 group-hover/stack:translate-y-1.5" />
                                              <div className="absolute top-2 left-2 w-full h-full bg-slate-950/40 border border-slate-900 rounded-xl -z-20 translate-x-2 translate-y-2 scale-96 shadow-sm transition-transform group-hover/stack:translate-x-3 group-hover/stack:translate-y-3" />
                                              
                                              <div className="space-y-1 z-10">
                                                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block">
                                                  +{bookingsInSlot.length - 2} reservas
                                                </span>
                                                <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider block">Clique para expandir</p>
                                              </div>
                                            </div>
                                          )}

                                          {shouldStack && isExpanded && (
                                            <button
                                              type="button"
                                              onClick={() => setExpandedSlots(prev => ({ ...prev, [slotKey]: false }))}
                                              className="w-full py-2 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-[9px] font-extrabold rounded-xl tracking-wider transition-all cursor-pointer text-center uppercase mt-1.5"
                                            >
                                              Recolher reservas &uarr;
                                            </button>
                                          )}
                                        </>
                                      );
                                    })()}
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
          )}
        </div>
      )}

      {/* Aba 2: Configurações */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Configurações de Funcionamento */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-lg space-y-6">
            <h3 className="text-xl font-bold border-b border-slate-850 pb-2">Regras de Funcionamento</h3>

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

            {/* Campo de Observações Ativo */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Campo de Observações</label>
              <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-800 hover:border-primary/20 bg-slate-950/50 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={campoObservacoesAtivoInput}
                  onChange={(e) => setCampoObservacoesAtivoInput(e.target.checked)}
                  className="accent-primary size-4"
                />
                <span className="text-xs font-semibold">Exibir campo de observações no formulário de reserva</span>
              </label>
            </div>

            {/* Antecedência Máxima de Dias */}
            <div className="space-y-2 pt-2 border-t border-slate-850">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Limite de Dias para Agendamento Futuro
              </label>
              <p className="text-[10px] text-slate-500 mb-2">
                Defina até quantos dias a partir da data atual o cliente poderá agendar uma mesa (Padrão: 7 dias).
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => setAntecedenciaMaximaDiasInput(Math.max(1, antecedenciaMaximaDiasInput - 1))}
                    className="px-3.5 py-1.5 text-slate-450 hover:text-white hover:bg-slate-900 font-black transition-all cursor-pointer select-none border-0 text-sm"
                  >
                    -
                  </button>
                  <input 
                    type="number"
                    min="1"
                    max="365"
                    value={antecedenciaMaximaDiasInput}
                    onChange={(e) => setAntecedenciaMaximaDiasInput(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-10 bg-transparent text-white font-mono font-extrabold text-center focus:outline-none border-0 text-xs py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setAntecedenciaMaximaDiasInput(Math.min(365, antecedenciaMaximaDiasInput + 1))}
                    className="px-3.5 py-1.5 text-slate-450 hover:text-white hover:bg-slate-900 font-black transition-all cursor-pointer select-none border-0 text-sm"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-slate-400 font-semibold select-none">dias a partir de hoje</span>
              </div>
            </div>
          </div>

          {/* Exceções e Bloqueio de Vagas */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-lg space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white">Bloqueio & Ajustes de Vagas</h3>
              <p className="text-xs text-slate-400 mt-1">Defina a capacidade ou feche horários específicos (0 vagas) para uma data.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Selecionar Dia para Ajuste</label>
              <div className="relative">
                <input 
                  type="date"
                  value={exData}
                  onChange={(e) => setExData(e.target.value)}
                  onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-primary focus:outline-none transition-all cursor-pointer font-semibold"
                  style={{ colorScheme: 'dark' }}
                />
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Ajuste em Massa para o dia */}
            <div className="bg-slate-950/50 p-4 border border-slate-850 rounded-xl space-y-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-350">Ajuste de Capacidade</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Mude a capacidade de todos os horários deste dia simultaneamente.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase select-none">Vagas Geral:</span>
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => handleBulkLimitChange(Math.max(0, bulkLimitInput - 1))}
                      className="px-3.5 py-1.5 text-slate-400 hover:text-white hover:bg-slate-900 font-black transition-all cursor-pointer select-none border-0 text-sm"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={bulkLimitInput}
                      onChange={(e) => handleBulkLimitChange(e.target.value)}
                      className="w-10 bg-transparent text-white font-mono font-extrabold text-center focus:outline-none border-0 text-xs py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleBulkLimitChange(bulkLimitInput + 1)}
                      className="px-3.5 py-1.5 text-slate-400 hover:text-white hover:bg-slate-900 font-black transition-all cursor-pointer select-none border-0 text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Slots Grid Editor */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Vagas para {exData ? new Date(exData + 'T00:00:00').toLocaleDateString('pt-BR') : ''}
                </h4>
                <span className="text-[10px] text-slate-500">Ajuste de capacidade</span>
              </div>
              
              {config.horarios_disponiveis.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-4">Nenhum horário cadastrado nas regras.</p>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {[...config.horarios_disponiveis].sort().map(time => {
                    const customLimit = limitesCustomizadosSelected?.[exData]?.[time];
                    const savedLimit = config.limites_customizados?.[exData]?.[time];
                    const currentLimit = customLimit !== undefined ? customLimit : config.vagas_padrao;
                    const isCustomized = customLimit !== undefined;
                    const isModified = customLimit !== savedLimit;

                    return (
                      <div 
                        key={time} 
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                          isModified 
                            ? 'bg-amber-500/5 border-amber-500/45 shadow-[0_0_8px_rgba(245,158,11,0.05)]' 
                            : isCustomized 
                            ? 'bg-indigo-500/5 border-indigo-500/30'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-750'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-slate-100">{time}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isCustomized && (
                            <button
                              type="button"
                              onClick={() => handleUpdateSlotLimit(time, config.vagas_padrao)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 animate-fade-in ${
                                isModified
                                  ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/20 hover:border-amber-500/40'
                                  : 'text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/20 hover:border-indigo-500/40'
                              }`}
                              title="Restaurar capacidade padrão"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          )}

                          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateSlotLimit(time, Math.max(0, currentLimit - 1))}
                              className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-900 font-extrabold transition-all cursor-pointer select-none"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-xs font-mono font-bold text-white">
                              {currentLimit}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateSlotLimit(time, currentLimit + 1)}
                              className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-900 font-extrabold transition-all cursor-pointer select-none"
                            >
                              +
                            </button>
                          </div>

                          {currentLimit > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateSlotLimit(time, 0)}
                              className="px-2 py-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 hover:border-transparent rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                            >
                              Bloquear
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateSlotLimit(time, config.vagas_padrao)}
                              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-transparent rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                            >
                              Liberar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Card de Gerenciamento de Horários */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-lg space-y-6">
            <div className="border-b border-slate-850 pb-2">
              <h3 className="text-xl font-bold text-white">Gerenciar Horários da Agenda</h3>
              <p className="text-xs text-slate-400 mt-1">Configure as vagas de horário disponíveis para agendamento dos clientes.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lado Esquerdo: Chips de Horários Ativos */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Horários Ativos ({horariosDisponiveisSelected.length})</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Estes são os horários atualmente oferecidos aos clientes no formulário.</p>
                </div>
                {horariosDisponiveisSelected.length === 0 ? (
                  <div className="p-6 border border-dashed border-slate-800 rounded-xl text-center">
                    <p className="text-xs text-slate-500 italic">Nenhum horário cadastrado. Adicione horários abaixo ou use o gerador.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {horariosDisponiveisSelected.map((time) => (
                      <div 
                        key={time} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-red-500/30 rounded-xl group transition-all text-xs font-mono font-bold"
                      >
                        <span className="text-slate-200">{time}</span>
                        <button 
                          type="button"
                          onClick={() => handleRemoveHorario(time)}
                          className="text-slate-500 hover:text-red-400 font-extrabold transition-colors cursor-pointer text-sm leading-none"
                          title={`Remover ${time}`}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Adicionar Individual */}
                <div className="pt-4 border-t border-slate-850/50 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Adicionar Horário Individual</h4>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="time"
                        value={newTimeInput}
                        onChange={(e) => setNewTimeInput(e.target.value)}
                        onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-primary focus:outline-none cursor-pointer font-semibold"
                        style={{ colorScheme: 'dark' }}
                      />
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddHorario}
                      className="px-4 py-2.5 bg-slate-950 border border-slate-800 hover:border-primary/50 text-white hover:text-primary font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>
              </div>

              {/* Lado Direito: Gerador em Massa */}
              <div className="bg-slate-950/40 border border-slate-850/50 p-4 rounded-xl space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-350">Gerador de Horários em Massa</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Preencha um intervalo de horas de forma automática.</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase text-slate-400">Hora Início</label>
                    <div className="relative">
                      <input 
                        type="time"
                        value={bulkStart}
                        onChange={(e) => setBulkStart(e.target.value)}
                        onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                        className="w-full pl-8 pr-2 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-primary focus:outline-none cursor-pointer font-semibold"
                        style={{ colorScheme: 'dark' }}
                      />
                      <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-slate-500">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase text-slate-400">Hora Fim</label>
                    <div className="relative">
                      <input 
                        type="time"
                        value={bulkEnd}
                        onChange={(e) => setBulkEnd(e.target.value)}
                        onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                        className="w-full pl-8 pr-2 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-primary focus:outline-none cursor-pointer font-semibold"
                        style={{ colorScheme: 'dark' }}
                      />
                      <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-slate-500">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase text-slate-400">Intervalo</label>
                    <select
                      value={bulkInterval}
                      onChange={(e) => setBulkInterval(e.target.value)}
                      className="w-full px-2 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-primary focus:outline-none cursor-pointer"
                    >
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                      <option value="60">60 min (1h)</option>
                      <option value="90">90 min</option>
                      <option value="120">120 min (2h)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateBulkHorarios}
                  className="w-full py-2.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                >
                  Gerar Horários
                </button>
              </div>
            </div>
          </div>

          {/* Botão unificado para salvar todas as alterações no rodapé */}
          <div className="md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-900 mt-4">
            {hasUnsavedChanges ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-450 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-xl animate-pulse w-full sm:w-auto">
                <svg className="w-4 h-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Alterações pendentes de gravação. Não se esqueça de salvar!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 px-4 py-2.5 w-full sm:w-auto">
                <svg className="w-4.5 h-4.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Configurações sincronizadas</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
              {hasUnsavedChanges && (
                <button
                  onClick={handleDiscardChanges}
                  className="w-full sm:w-auto px-6 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-2xl transition-all cursor-pointer text-xs uppercase tracking-wider"
                >
                  Cancelar Alterações
                </button>
              )}
              <button
                onClick={handleSaveConfigs}
                className="w-full sm:w-auto px-10 py-4 bg-primary hover:brightness-110 text-white font-black rounded-2xl shadow-lg hover:shadow-primary/20 transition-all cursor-pointer text-xs uppercase tracking-wider shrink-0"
              >
                Salvar Todas as Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aba 3: Histórico de Ações */}
      {activeTab === 'historico' && (
        <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-850 pb-4">
            <div>
              <h3 className="text-xl font-bold text-white">Histórico de Atividades</h3>
              <p className="text-xs text-slate-400 mt-1">Veja um registro cronológico de todas as ações e modificações realizadas na agenda.</p>
            </div>
            <button
              onClick={() => {
                if (window.confirm("Deseja realmente limpar todo o histórico de ações?")) {
                  setActivityLogs([]);
                  localStorage.removeItem('admin_activity_logs');
                  setCurrentPage(1);
                }
              }}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 hover:border-transparent rounded-xl text-xs font-bold transition-all cursor-pointer border-0"
            >
              Limpar Histórico
            </button>
          </div>

          {(() => {
            const logsPerPage = 20;
            const totalPages = Math.ceil(activityLogs.length / logsPerPage);
            const startIndex = (currentPage - 1) * logsPerPage;
            const endIndex = startIndex + logsPerPage;
            const paginatedLogs = activityLogs.slice(startIndex, endIndex);

            return (
              <>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {activityLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-10">Nenhuma ação registrada no histórico de atividades.</p>
                  ) : (
                    <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6">
                      {paginatedLogs.map(log => {
                        const logDate = new Date(log.timestamp);
                        const formattedDateTime = `${logDate.toLocaleDateString('pt-BR')} às ${logDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
                        
                        // Escolhe cores baseadas no tipo de ação
                        let colorClass = 'bg-slate-800 border-slate-700 text-slate-400';
                        let badgeText = 'Geral';
                        
                        if (log.actionType === 'create') {
                          colorClass = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-455';
                          badgeText = 'Novo Agendamento';
                        } else if (log.actionType === 'cancel') {
                          colorClass = 'bg-red-500/15 border-red-500/30 text-red-455';
                          badgeText = 'Cancelamento';
                        } else if (log.actionType === 'config_save') {
                          colorClass = 'bg-primary/15 border-primary/30 text-primary-400';
                          badgeText = 'Configurações';
                        } else if (log.actionType === 'override_limit' || log.actionType === 'remove_override') {
                          colorClass = 'bg-amber-500/15 border-amber-500/30 text-amber-455';
                          badgeText = 'Ajuste de Vagas';
                        } else if (log.actionType === 'add_time' || log.actionType === 'remove_time') {
                          colorClass = 'bg-sky-500/15 border-sky-500/30 text-sky-455';
                          badgeText = 'Horários';
                        }

                        return (
                          <div key={log.id} className="relative group/log">
                            {/* Ponto indicador da linha do tempo */}
                            <span className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-slate-950 flex items-center justify-center transition-transform group-hover/log:scale-110 ${
                              log.actionType === 'create' ? 'border-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' :
                              log.actionType === 'cancel' ? 'border-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]' :
                              log.actionType === 'config_save' ? 'border-primary shadow-[0_0_6px_rgba(99,102,241,0.5)]' :
                              log.actionType === 'add_time' || log.actionType === 'remove_time' ? 'border-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.5)]' :
                              'border-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                            }`} />

                            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-2 hover:border-slate-800 transition-all">
                              <div className="flex justify-between items-center flex-wrap gap-2">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${colorClass}`}>
                                  {badgeText}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {formattedDateTime}
                                </span>
                              </div>
                              <p className="text-xs text-slate-350 leading-relaxed font-medium">
                                {log.details}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-850 select-none">
                    <span className="text-xs text-slate-500 font-medium">
                      Exibindo {startIndex + 1} a {Math.min(endIndex, activityLogs.length)} de {activityLogs.length} atividades
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer select-none active:scale-95 border-slate-800/80 ${
                          currentPage === 1
                            ? 'bg-slate-900/40 text-slate-650 cursor-not-allowed opacity-50'
                            : 'bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        ← Anterior
                      </button>
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
                              currentPage === pageNum
                                ? 'bg-gradient-to-br from-indigo-600 to-primary text-white border-indigo-500 shadow-md font-black'
                                : 'bg-slate-950 border-slate-800/80 text-slate-450 hover:text-slate-200 hover:border-slate-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer select-none active:scale-95 border-slate-800/80 ${
                          currentPage === totalPages
                            ? 'bg-slate-900/40 text-slate-650 cursor-not-allowed opacity-50'
                            : 'bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        Próxima →
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Modal de Detalhes da Reserva (Google Calendar Style) */}
      {selectedBooking && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedBooking(null);
            }
          }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
        >
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
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block ${
                    selectedBooking.status === 'Cancelado'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : selectedBooking.status === 'Pendente'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-green-500/10 text-green-400 border border-green-500/20'
                  }`}>
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

      {/* Pop-up profissional de Salvamento */}
      {saveStatus && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[110] animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-4 text-center transform transition-all scale-100">
            {saveStatus.type === 'loading' && (
              <>
                <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary">
                  <svg className="animate-spin h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Salvando Configurações</h3>
                  <p className="text-xs text-slate-400 mt-1">{saveStatus.message}</p>
                </div>
              </>
            )}
            
            {saveStatus.type === 'success' && (
              <>
                <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Salvo com Sucesso!</h3>
                  <p className="text-xs text-slate-400 mt-1">{saveStatus.message}</p>
                </div>
                <button
                  onClick={() => setSaveStatus(null)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer border-0"
                >
                  Entendido
                </button>
              </>
            )}

            {saveStatus.type === 'error' && (
              <>
                <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Erro ao Salvar</h3>
                  <p className="text-xs text-slate-400 mt-1">{saveStatus.message}</p>
                </div>
                <button
                  onClick={() => setSaveStatus(null)}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer border-0"
                >
                  Tentar Novamente
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pop-up profissional de Sair Sem Salvar */}
      {showConfirmLeaveModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[110] animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-4 text-center">
            <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Alterações Não Salvas</h3>
              <p className="text-xs text-slate-400 mt-1">
                Você possui alterações nas configurações da agenda que ainda não foram gravadas. Se você sair agora, essas alterações serão perdidas permanentemente.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmLeave}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer border-0"
              >
                Sair sem salvar
              </button>
              <button
                onClick={handleCancelLeave}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer border-0"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
