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
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });

  const showAlert = (title, message, type = 'info') => {
    setAlertModal({ show: true, title, message, type });
  };

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

  // Controle de Tema (Light vs Dark Mode)
  const [themeMode, setThemeMode] = useState(() => {
    try {
      return localStorage.getItem('admin_theme_mode') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  const toggleThemeMode = () => {
    const nextTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextTheme);
    try {
      localStorage.setItem('admin_theme_mode', nextTheme);
    } catch (e) {}
  };

  // Controle de Seções Retráteis (Accordions) da Aba Configurações
  const [openConfigSections, setOpenConfigSections] = useState({
    horarios: true,
    bloqueio: false,
    cadastro: false,
    regras: false
  });

  const toggleConfigSection = (sectionKey) => {
    setOpenConfigSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const [appNameInput, setAppNameInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [phone2Input, setPhone2Input] = useState('');

  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);

  const [usingDb, setUsingDb] = useState(false);

  const formatPhoneNumber = (val) => {
    if (!val) return '';
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  useEffect(() => {
    if (!addressInput || addressInput.trim().length < 2) {
      setAddressSuggestions([]);
      return;
    }

    const defaultPlaces = [
      "Av. Padre Cacique, 580 - Menino Deus - Porto Alegre/RS",
      "Rua dos Andradas, 1000 - Centro Histórico - Porto Alegre/RS",
      "Av. Nilo Peçanha, 1500 - Boa Vista - Porto Alegre/RS",
      "Av. Ipiranga, 6681 - Partenon - Porto Alegre/RS",
      "Rua Fernando Machado, 400 - Centro - Porto Alegre/RS",
      "Av. Carlos Gomes, 1100 - Auxiliadora - Porto Alegre/RS",
      "Av. Borges de Medeiros, 2000 - Praia de Belas - Porto Alegre/RS",
      "Av. Assis Brasil, 2611 - Cristo Redentor - Porto Alegre/RS",
      "Av. Goethe, 200 - Moinhos de Vento - Porto Alegre/RS",
      "Av. Paulista, 1000 - Bela Vista - São Paulo/SP",
    ];

    const queryLower = addressInput.toLowerCase();
    const matchedLocal = defaultPlaces.filter(p => p.toLowerCase().includes(queryLower));

    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressInput)}&countrycodes=br&limit=5`
        );
        if (response.ok) {
          const data = await response.json();
          const apiSuggestions = data.map(item => item.display_name);
          const combined = Array.from(new Set([...matchedLocal, ...apiSuggestions])).slice(0, 6);
          setAddressSuggestions(combined);
        } else {
          setAddressSuggestions(matchedLocal.slice(0, 6));
        }
      } catch (e) {
        setAddressSuggestions(matchedLocal.slice(0, 6));
      } finally {
        setIsSearchingAddress(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [addressInput]);

  // Sincroniza o bulkLimitInput com o limite do dia selecionado
  useEffect(() => {
    if (config && exData) {
      const firstTime = config.horarios_disponiveis?.length ? [...config.horarios_disponiveis].sort()[0] : null;
      const customLimit = firstTime ? config.limites_customizados?.[exData]?.[firstTime] : undefined;
      setBulkLimitInput(customLimit !== undefined ? customLimit : config.vagas_padrao);
    }
  }, [exData, config]);

  // Função utilitária para resetar todos os inputs locais para o valor salvo da configuração
  const resetLocalInputsToSavedConfig = (targetConfig = config) => {
    if (!targetConfig) return;
    setDiasFuncionamentoSelected(targetConfig.dias_funcionamento || []);
    setCampoObservacoesAtivoInput(targetConfig.campo_observacoes_ativo ?? true);
    setHorariosDisponiveisSelected(targetConfig.horarios_disponiveis || []);
    setLimitesCustomizadosSelected(targetConfig.limites_customizados || {});
    setAntecedenciaMaximaDiasInput(targetConfig.antecedencia_maxima_dias ?? 7);
    setAppNameInput(targetConfig.app_name || '');
    setDescriptionInput(targetConfig.description || '');
    setAddressInput(targetConfig.address || '');
    setPhoneInput(targetConfig.phone ? formatPhoneNumber(targetConfig.phone) : '');
    setPhone2Input(targetConfig.phone2 ? formatPhoneNumber(targetConfig.phone2) : '');
  };

  // Verificação de alterações não salvas
  const checkUnsavedChanges = () => {
    if (!config) return false;
    if (campoObservacoesAtivoInput !== (config.campo_observacoes_ativo ?? true)) return true;
    if (antecedenciaMaximaDiasInput !== (config.antecedencia_maxima_dias ?? 7)) return true;
    if (appNameInput !== (config.app_name || '')) return true;
    if (descriptionInput !== (config.description || '')) return true;
    if (addressInput !== (config.address || '')) return true;
    if (phoneInput !== (config.phone ? formatPhoneNumber(config.phone) : '')) return true;
    if (phone2Input !== (config.phone2 ? formatPhoneNumber(config.phone2) : '')) return true;
    if (JSON.stringify(limitesCustomizadosSelected) !== JSON.stringify(config.limites_customizados || {})) return true;
    
    // Compara dias de funcionamento
    if (diasFuncionamentoSelected.length !== (config.dias_funcionamento || []).length) return true;
    const sortedSelectedDays = [...diasFuncionamentoSelected].sort();
    const sortedConfigDays = [...(config.dias_funcionamento || [])].sort();
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
    
    // Descarta todas as alterações redefinindo TODOS os inputs locais para a configuração ativa salva
    resetLocalInputsToSavedConfig();
    
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
        


        setBookings(bks);
        setConfig(cfg);
        setVagasPadraoInput(cfg.vagas_padrao);
        setDiasFuncionamentoSelected(cfg.dias_funcionamento);
        setCampoObservacoesAtivoInput(cfg.campo_observacoes_ativo ?? true);
        setHorariosDisponiveisSelected(cfg.horarios_disponiveis || []);
        setLimitesCustomizadosSelected(cfg.limites_customizados || {});
        setAntecedenciaMaximaDiasInput(cfg.antecedencia_maxima_dias ?? 7);
        setAppNameInput(cfg.app_name || '');
        setDescriptionInput(cfg.description || '');
        setAddressInput(cfg.address || '');
        setPhoneInput(cfg.phone ? formatPhoneNumber(cfg.phone) : '');
        setPhone2Input(cfg.phone2 ? formatPhoneNumber(cfg.phone2) : '');
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
      antecedencia_maxima_dias: antecedenciaMaximaDiasInput,
      app_name: appNameInput,
      description: descriptionInput,
      address: addressInput,
      phone: phoneInput,
      phone2: phone2Input
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
      resetLocalInputsToSavedConfig();
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
      showAlert("Aviso", "Este horário já está na lista.", "warning");
      return;
    }
    setHorariosDisponiveisSelected(prev => [...prev, newTimeInput].sort((a, b) => a.localeCompare(b)));
    addActivityLog('add_time', `Horário ${newTimeInput} adicionado à lista de horários disponíveis`);
    setNewTimeInput('');
  };

  const handleRemoveHorario = (timeToRemove) => {
    setHorariosDisponiveisSelected(prev => prev.filter(t => t !== timeToRemove));
    addActivityLog('remove_time', `Horário ${timeToRemove} removido da lista de horários disponíveis`);
  };

  const handleGenerateBulkHorarios = () => {
    if (!bulkStart || !bulkEnd || !bulkInterval) {
      showAlert("Gerador de Horários", "Por favor, preencha todos os campos do gerador.", "warning");
      return;
    }

    const [startH, startM] = bulkStart.split(':').map(Number);
    const [endH, endM] = bulkEnd.split(':').map(Number);
    
    let startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const step = parseInt(bulkInterval);
    
    if (startMinutes >= endMinutes) {
      showAlert("Gerador de Horários", "A hora de início deve ser menor que a hora de término.", "warning");
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

    showAlert("Sucesso!", `${generated.length} horários foram gerados com sucesso! Não esqueça de clicar em "Salvar Todas as Alterações" para gravar permanentemente.`, "success");
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
    <div className={`min-h-screen font-sans p-4 sm:p-6 lg:p-8 space-y-6 relative overflow-hidden select-none transition-colors duration-300 ${
      themeMode === 'dark'
        ? 'bg-slate-950 text-slate-100'
        : 'bg-[#F6F5F0] text-stone-900'
    }`}>
      {/* Gradiente Radial Suave no topo superior direito */}
      <div className={`absolute top-0 right-0 w-[600px] h-[600px] blur-3xl pointer-events-none -z-10 ${
        themeMode === 'dark'
          ? 'bg-gradient-to-br from-[#C85A17]/15 via-[#E5A93C]/5 to-transparent'
          : 'bg-gradient-to-br from-amber-200/35 via-amber-100/10 to-transparent'
      }`} />

      {/* Top Floating Capsular Navbar */}
      <div className={`backdrop-blur-md rounded-full px-4 sm:px-6 py-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors ${
        themeMode === 'dark'
          ? 'bg-slate-900/90 border border-slate-800'
          : 'bg-white/80 border border-stone-200/70'
      }`}>
        {/* Brand Pill */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-[#221B16] to-[#1A1613] border border-[#3E3228] text-[#E5A93C] font-black text-xs uppercase tracking-wider px-5 py-2 rounded-full shadow-sm flex items-center gap-2 font-serif-brand">
            <span className="w-2 h-2 rounded-full bg-[#C85A17] animate-pulse" />
            {appNameInput || 'Campeiro Fogão'}
          </div>
          <span className={`text-xs font-semibold hidden sm:inline-block ${
            themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
          }`}>
            Painel de Gestão & Reservas
          </span>
        </div>

        {/* Tab Pills Nav */}
        <div className={`flex items-center gap-1.5 p-1.5 rounded-full border transition-colors ${
          themeMode === 'dark'
            ? 'bg-slate-950 border-slate-800'
            : 'bg-stone-100/80 border-stone-200/50'
        }`}>
          <button
            onClick={() => handleTabChange('agenda')}
            className={`px-5 py-2 text-xs rounded-full transition-all cursor-pointer ${
              activeTab === 'agenda'
                ? 'bg-gradient-to-r from-[#C85A17] to-[#E5A93C] text-[#FAF7F2] shadow-md shadow-[#C85A17]/25 font-bold'
                : themeMode === 'dark'
                ? 'text-slate-400 hover:text-white font-semibold'
                : 'text-stone-600 hover:text-stone-900 font-semibold'
            }`}
          >
            Agenda Semanal
          </button>
          <button
            onClick={() => handleTabChange('config')}
            className={`px-5 py-2 text-xs rounded-full transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'config'
                ? 'bg-gradient-to-r from-[#C85A17] to-[#E5A93C] text-[#FAF7F2] shadow-md shadow-[#C85A17]/25 font-bold'
                : themeMode === 'dark'
                ? 'text-slate-400 hover:text-white font-semibold'
                : 'text-stone-600 hover:text-stone-900 font-semibold'
            }`}
          >
            <span>Configurações</span>
            {hasUnsavedChanges && (
              <span className="w-2 h-2 rounded-full bg-[#C85A17] shadow-[0_0_6px_#C85A17] shrink-0 animate-pulse" title="Alterações não salvas" />
            )}
          </button>
          <button
            onClick={() => handleTabChange('historico')}
            className={`px-5 py-2 text-xs rounded-full transition-all cursor-pointer ${
              activeTab === 'historico'
                ? 'bg-gradient-to-r from-[#C85A17] to-[#E5A93C] text-[#FAF7F2] shadow-md shadow-[#C85A17]/25 font-bold'
                : themeMode === 'dark'
                ? 'text-slate-400 hover:text-white font-semibold'
                : 'text-stone-600 hover:text-stone-900 font-semibold'
            }`}
          >
            Histórico de Ações
          </button>
        </div>

        {/* Action Buttons Right: Dark/Light Mode + Notificações */}
        <div className="flex items-center gap-2.5">
          {/* Botão de Alternância de Tema (Dark Mode / Light Mode) */}
          <button
            type="button"
            onClick={toggleThemeMode}
            className={`p-2.5 rounded-full border transition-all cursor-pointer flex items-center justify-center shadow-xs ${
              themeMode === 'dark'
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
            title={themeMode === 'dark' ? 'Alternar para Modo Claro (Light Mode)' : 'Alternar para Modo Escuro (Dark Mode)'}
          >
            {themeMode === 'dark' ? (
              /* Sol icon para ativar Light Mode */
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              /* Lua icon para ativar Dark Mode */
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Botão e Menu de Notificações */}
          <div className="relative notifications-container">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2.5 rounded-full border transition-all cursor-pointer relative flex items-center justify-center shadow-xs ${
                themeMode === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
              title="Histórico de Notificações"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-stone-900 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown de Histórico de Notificações */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-stone-900 text-stone-100 border border-stone-800 rounded-3xl shadow-2xl p-4 z-50 space-y-3 animate-fade-in text-left">
                <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Notificações</h3>
                  <div className="flex gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[9px] font-bold text-amber-400 hover:underline cursor-pointer border-0 bg-transparent"
                      >
                        Ler todas
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-[9px] font-bold text-stone-400 hover:text-stone-200 cursor-pointer border-0 bg-transparent"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-[10px] text-stone-400 italic text-center py-6">
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
                          className={`p-2.5 rounded-2xl border transition-all cursor-pointer relative ${
                            n.read
                              ? 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                              : 'bg-amber-400/10 border-amber-400/30 hover:border-amber-400/50'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-xs font-extrabold text-white truncate max-w-[160px]">
                              {n.booking.cliente_nome}
                            </span>
                            <span className="text-[9px] text-amber-400 font-mono font-bold">
                              {formatTime(n.timestamp)}
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-300 mt-1">
                            Reserva: <strong className="text-white">{n.booking.data ? new Date(n.booking.data + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</strong> às <strong className="text-white">{n.booking.horario}</strong> ({n.booking.pessoas}p)
                          </p>
                          {!n.read && (
                            <span className="absolute top-3.5 right-3 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero Header Limpo Sem Métricas Duplicadas */}
      <div className="pt-2">
        <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight font-serif-brand ${
          themeMode === 'dark' ? 'text-white' : 'text-stone-900'
        }`}>
          Painel Administrativo
        </h1>
        <p className={`text-xs sm:text-sm mt-1 font-medium ${
          themeMode === 'dark' ? 'text-slate-400' : 'text-stone-600'
        }`}>
          Gestão em tempo real das reservas, turnos, limites e disponibilidade do salão.
        </p>
      </div>

      {/* 4 Principais KPI Cards Únicos */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Reservas Card */}
        <div className={`rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 group ${
          themeMode === 'dark'
            ? 'bg-slate-900 border border-slate-800 text-slate-100 shadow-md hover:border-[#C85A17]/60'
            : 'bg-white border border-stone-200/80 text-stone-900 shadow-sm hover:shadow-md hover:border-amber-300'
        }`}>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
              }`}>Reservas (Hoje)</span>
              <p className={`text-[11px] font-medium ${
                themeMode === 'dark' ? 'text-slate-500' : 'text-stone-400'
              }`}>Agendamentos para hoje</p>
            </div>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-transform duration-300 group-hover:scale-110 ${
              themeMode === 'dark'
                ? 'bg-[#C85A17]/20 text-[#E5A93C] border border-[#C85A17]/30'
                : 'bg-amber-100 text-amber-900 border border-amber-300/60'
            }`}>
              🔥
            </div>
          </div>
          <div className="mt-5 flex items-baseline justify-between">
            <span className="text-4xl font-bold tracking-tight font-serif-brand">{totalAgendamentos}</span>
            <span className="text-[10px] font-bold text-white bg-gradient-to-r from-[#C85A17] to-[#E5A93C] px-3 py-1 rounded-full shadow-xs">
              Hoje
            </span>
          </div>
        </div>

        {/* Confirmados Card */}
        <div className={`rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 group ${
          themeMode === 'dark'
            ? 'bg-slate-900 border border-slate-800 text-slate-100 shadow-md hover:border-emerald-500/40'
            : 'bg-white border border-stone-200/80 text-stone-900 shadow-sm hover:shadow-md hover:border-emerald-300'
        }`}>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
              }`}>Confirmados (Hoje)</span>
              <p className={`text-[11px] font-medium ${
                themeMode === 'dark' ? 'text-slate-500' : 'text-stone-400'
              }`}>Garantidos para hoje</p>
            </div>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-transform duration-300 group-hover:scale-110 ${
              themeMode === 'dark'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-emerald-100 text-emerald-900 border border-emerald-300/60'
            }`}>
              ✓
            </div>
          </div>
          <div className="mt-5 flex items-baseline justify-between">
            <span className="text-4xl font-bold tracking-tight font-serif-brand">{totalConfirmados}</span>
            <span className={`text-[10px] font-black px-3 py-1 rounded-full shadow-xs ${
              themeMode === 'dark' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-900'
            }`}>
              Garantidos
            </span>
          </div>
        </div>

        {/* Total Acessos Card */}
        <div className={`rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 group ${
          themeMode === 'dark'
            ? 'bg-slate-900 border border-slate-800 text-slate-100 shadow-md hover:border-[#D4A373]/40'
            : 'bg-white border border-stone-200/80 text-stone-900 shadow-sm hover:shadow-md hover:border-sky-300'
        }`}>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
              }`}>Acessos à Agenda</span>
              <p className={`text-[11px] font-medium ${
                themeMode === 'dark' ? 'text-slate-500' : 'text-stone-400'
              }`}>Visitas na página de reserva</p>
            </div>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-transform duration-300 group-hover:scale-110 ${
              themeMode === 'dark'
                ? 'bg-[#D4A373]/20 text-[#D4A373] border border-[#D4A373]/30'
                : 'bg-sky-100 text-sky-900 border border-sky-300/60'
            }`}>
              👁️
            </div>
          </div>
          <div className="mt-5 flex items-baseline justify-between">
            <span className="text-4xl font-bold tracking-tight font-serif-brand">
              {config.acessos_pagina_agenda || 0}
            </span>
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
              themeMode === 'dark' ? 'bg-[#D4A373]/15 border-[#D4A373]/30 text-[#D4A373]' : 'bg-sky-50 border-sky-200 text-sky-800'
            }`}>
              Visualizações
            </span>
          </div>
        </div>

        {/* Taxa de Confirmação Card */}
        <div className={`rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 group ${
          themeMode === 'dark'
            ? 'bg-slate-900 border border-slate-800 text-slate-100 shadow-md hover:border-[#C85A17]/50'
            : 'bg-white border border-stone-200/80 text-stone-900 shadow-sm hover:shadow-md hover:border-purple-300'
        }`}>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
              }`}>Taxa de Conversão</span>
              <p className={`text-[11px] font-medium ${
                themeMode === 'dark' ? 'text-slate-500' : 'text-stone-400'
              }`}>Mapeamento de confirmação</p>
            </div>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-transform duration-300 group-hover:scale-110 ${
              themeMode === 'dark'
                ? 'bg-[#C85A17]/20 text-[#E5A93C] border border-[#C85A17]/30'
                : 'bg-purple-100 text-purple-900 border border-purple-300/60'
            }`}>
              %
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-3xl font-bold tracking-tight font-serif-brand">{taxaConfirmacao}%</span>
              <span className={`text-[10px] font-bold ${
                themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
              }`}>{totalConfirmados} de {totalAgendamentos}</span>
            </div>
            <div className={`w-full rounded-full h-2 overflow-hidden ${
              themeMode === 'dark' ? 'bg-slate-950' : 'bg-stone-100'
            }`}>
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  themeMode === 'dark' ? 'bg-gradient-to-r from-[#C85A17] to-[#E5A93C]' : 'bg-amber-600'
                }`}
                style={{ width: `${taxaConfirmacao}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Database Warning */}
      {!usingDb && (
        <div className={`border px-5 py-4 rounded-3xl text-xs flex gap-3 items-center shadow-xs ${
          themeMode === 'dark'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            : 'bg-amber-500/10 border-amber-500/30 text-stone-800'
        }`}>
          <span className="text-lg">⚠️</span>
          <div>
            <strong>Aviso de Banco de Dados:</strong> As tabelas `agendamentos` e `configuracao_agenda` não foram encontradas no Supabase. O painel está salvando dados localmente no navegador para demonstração. Copie o script SQL em `supabase_schema/001_initial_schema.sql` e execute-o no SQL Editor do Supabase para conectar permanentemente.
          </div>
        </div>
      )}

      {/* Aba 1: Agenda Semanal (Adaptada dinamicamente para Light Mode e Dark Mode) */}
      {activeTab === 'agenda' && (
        <div className="space-y-4">
          {/* Navigation bar (Barra de Controle de visualização e semanas) */}
          <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 p-4 px-6 rounded-3xl transition-colors duration-300 ${
            themeMode === 'dark'
              ? 'bg-slate-900 border border-slate-800 text-slate-100 shadow-md'
              : 'bg-white border border-stone-200/80 text-stone-900 shadow-sm'
          }`}>
            <div className="flex items-center gap-2">
              {agendaViewMode === 'grid' ? (
                <>
                  <button 
                    onClick={() => changeWeek(-1)}
                    className={`p-2.5 rounded-full border text-xs font-bold transition-colors cursor-pointer ${
                      themeMode === 'dark'
                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                        : 'bg-stone-100 border-stone-200 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    &larr;
                  </button>
                  <button 
                    onClick={setTodayWeek}
                    className="px-4 py-2.5 rounded-full bg-amber-400 text-stone-900 text-xs font-extrabold transition-all cursor-pointer shadow-xs"
                  >
                    Hoje
                  </button>
                  <button 
                    onClick={() => changeWeek(1)}
                    className={`p-2.5 rounded-full border text-xs font-bold transition-colors cursor-pointer ${
                      themeMode === 'dark'
                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                        : 'bg-stone-100 border-stone-200 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    &rarr;
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs uppercase font-black tracking-wider text-stone-900 bg-amber-400 px-3 py-1 rounded-full">
                    Tabela de Reservas
                  </span>
                </div>
              )}
            </div>
            
            <span className={`text-sm font-extrabold tracking-wide ${
              themeMode === 'dark' ? 'text-white' : 'text-stone-900'
            }`}>
              {agendaViewMode === 'grid' ? formatWeekRange() : `Total: ${bookings.length} agendamentos cadastrados`}
            </span>

            {/* Seletor de modo de visualização */}
            <div className={`flex items-center gap-1.5 p-1.5 rounded-full border shrink-0 ${
              themeMode === 'dark'
                ? 'bg-slate-950 border-slate-800'
                : 'bg-stone-100 border-stone-200'
            }`}>
              <button
                onClick={() => setAgendaViewMode('grid')}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  agendaViewMode === 'grid'
                    ? 'bg-amber-400 text-stone-900 shadow-xs'
                    : themeMode === 'dark'
                    ? 'text-slate-400 hover:text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Grade Semanal
              </button>
              <button
                onClick={() => setAgendaViewMode('table')}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  agendaViewMode === 'table'
                    ? 'bg-amber-400 text-stone-900 shadow-xs'
                    : themeMode === 'dark'
                    ? 'text-slate-400 hover:text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Tabela Geral
              </button>
            </div>
          </div>

          {/* Conteúdo Dinâmico */}
          {agendaViewMode === 'table' ? (
            <div className={`overflow-x-auto border rounded-3xl shadow-sm transition-colors ${
              themeMode === 'dark'
                ? 'bg-slate-900 border-slate-800'
                : 'bg-white border-stone-200/80'
            }`}>
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className={`border-b text-[10px] uppercase font-bold tracking-widest ${
                    themeMode === 'dark'
                      ? 'border-slate-800 text-slate-400 bg-slate-950/60'
                      : 'border-stone-200 text-stone-500 bg-stone-50/70'
                  }`}>
                    <th className="p-4 w-60">Data e Hora</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Telefone</th>
                    <th className="p-4 text-center w-24">Pessoas</th>
                    <th className="p-4">Observações</th>
                    <th className="p-4 w-32">Status</th>
                    <th className="p-4 text-center w-28">Ações</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  themeMode === 'dark'
                    ? 'divide-slate-800 text-slate-300'
                    : 'divide-stone-100 text-stone-700'
                }`}>
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
                          <td colSpan="7" className="p-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                            Nenhum agendamento encontrado
                          </td>
                        </tr>
                      );
                    }

                    return sortedBookings.map((b) => {
                      const name = b.cliente_nome || b.name || (b.clientes && (b.clientes.nome || b.clientes.cliente_nome)) || 'Sem nome';
                      const phone = b.cliente_telefone || b.phone || (b.clientes && b.clientes.telefone) || 'Sem telefone';
                      
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
                          className={`transition-colors group/tr ${
                            themeMode === 'dark' ? 'hover:bg-slate-800/40' : 'hover:bg-amber-50/40'
                          }`}
                        >
                          <td className={`p-4 text-xs font-mono font-bold ${
                            themeMode === 'dark' ? 'text-white' : 'text-stone-900'
                          }`}>
                            <div className="flex flex-col gap-0.5">
                              <span>{capitalizedDate}</span>
                              <span className="text-[10px] text-amber-500 font-black tracking-wider uppercase">⏰ {b.horario}</span>
                            </div>
                          </td>
                          <td className={`p-4 text-xs font-extrabold ${
                            themeMode === 'dark' ? 'text-slate-100' : 'text-stone-900'
                          }`}>
                            {name}
                          </td>
                          <td className={`p-4 text-xs font-mono ${
                            themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
                          }`}>
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {phone}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-mono text-center font-black">
                            <span className={`px-2.5 py-1 rounded-lg border ${
                              themeMode === 'dark'
                                ? 'bg-slate-950 border-slate-800 text-slate-300'
                                : 'bg-stone-100 border-stone-200 text-stone-800'
                            }`}>
                              {b.pessoas}p
                            </span>
                          </td>
                          <td className={`p-4 text-[11px] max-w-[200px] truncate ${
                            themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
                          }`} title={b.observacoes || 'Nenhuma'}>
                            {b.observacoes || <span className="italic opacity-60">Sem observações</span>}
                          </td>
                          <td className="p-4 text-xs">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] uppercase font-black tracking-wider ${
                              b.status === 'Cancelado'
                                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                : b.status === 'Confirmado'
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : b.status === 'Em andamento'
                                ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20 animate-pulse'
                                : b.status === 'Finalizado'
                                ? 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                b.status === 'Cancelado'
                                  ? 'bg-red-500'
                                  : b.status === 'Confirmado'
                                  ? 'bg-emerald-500'
                                  : b.status === 'Em andamento'
                                  ? 'bg-purple-500'
                                  : b.status === 'Finalizado'
                                  ? 'bg-slate-400'
                                  : 'bg-amber-500'
                              }`} />
                              {b.status || 'Confirmado'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => setSelectedBooking(b)}
                                className={`p-1.5 rounded border transition-all cursor-pointer ${
                                  themeMode === 'dark'
                                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                                    : 'bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-700'
                                }`}
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
                                className="p-1.5 rounded bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-500 transition-all cursor-pointer"
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
              className={`overflow-auto max-h-[85vh] rounded-3xl shadow-xl border transition-colors ${
                themeMode === 'dark'
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-white border-stone-200/80'
              } ${isMouseDown ? 'cursor-grabbing select-none' : 'cursor-grab'}`} 
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <table className="w-full min-w-[1600px] border-collapse table-fixed text-left">
                <thead className={`sticky top-0 z-20 shadow-sm ${
                  themeMode === 'dark' ? 'bg-slate-900' : 'bg-stone-100'
                }`}>
                  <tr className={`border-b ${
                    themeMode === 'dark' ? 'border-slate-800 text-slate-300' : 'border-stone-200 text-stone-700'
                  }`}>
                    <th className={`w-24 p-4 text-xs font-bold uppercase tracking-wider text-center sticky left-0 z-30 border-r shadow-sm ${
                      themeMode === 'dark'
                        ? 'bg-slate-900 border-slate-800 text-slate-400'
                        : 'bg-stone-100 border-stone-200 text-stone-700'
                    }`}>Horário</th>
                    {weekDates.map((date, idx) => {
                      const isToday = new Date().toDateString() === date.toDateString();
                      return (
                        <th key={idx} className={`p-4 border-l ${
                          themeMode === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-stone-200 bg-stone-100'
                        } ${isToday ? 'text-amber-500 font-extrabold' : ''}`}>
                          <div className="flex flex-col">
                            <span className={`text-[10px] uppercase font-bold tracking-widest ${
                              isToday
                                ? 'text-amber-500 font-black'
                                : themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
                            }`}>
                              {weekDaysLabels[idx]}
                            </span>
                            <span className={`text-lg font-black mt-0.5 ${
                              isToday
                                ? 'text-amber-500'
                                : themeMode === 'dark' ? 'text-white' : 'text-stone-900'
                            }`}>
                              {date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' })}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  themeMode === 'dark' ? 'divide-slate-800/80 bg-slate-950/20' : 'divide-stone-200/60 bg-stone-50/20'
                }`}>
                  {config.horarios_disponiveis.map((time) => (
                    <tr key={time} className={`transition-colors group/row ${
                      themeMode === 'dark' ? 'hover:bg-slate-800/20' : 'hover:bg-amber-50/30'
                    }`}>
                      <td className={`p-4 text-sm font-extrabold text-center sticky left-0 z-10 border-r shadow-sm ${
                        themeMode === 'dark'
                          ? 'bg-slate-900 border-slate-800 text-slate-300'
                          : 'bg-stone-100 border-stone-200 text-stone-800'
                      }`}>
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
                              className={`p-2 align-top relative transition-colors border-l ${
                                themeMode === 'dark' ? 'border-slate-800' : 'border-stone-200'
                              } ${
                                !isWorkingDay 
                                  ? themeMode === 'dark' ? 'bg-slate-950/70 opacity-30 select-none' : 'bg-stone-200/50 opacity-40 select-none'
                                  : themeMode === 'dark' ? 'bg-slate-900/5 group-hover/row:bg-slate-900/20' : 'bg-white group-hover/row:bg-amber-50/30'
                              }`}
                              style={{ height: '90px' }}
                            >
                              {isWorkingDay ? (
                                <div className="space-y-2">
                                  {/* Slot Capacity indicator */}
                                  <div className="flex justify-between items-center">
                                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold tracking-wide shadow-xs ${
                                      occupiedSlots >= limit 
                                        ? 'bg-red-500/15 text-red-500 border border-red-500/20' 
                                        : hasException 
                                        ? 'bg-amber-500/15 text-amber-600 border border-amber-500/20'
                                        : themeMode === 'dark' ? 'bg-slate-800/80 text-slate-400 border border-slate-700' : 'bg-stone-100 text-stone-600 border border-stone-200'
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
                                            
                                            return (
                                              <div 
                                                key={b.id} 
                                                onClick={() => setSelectedBooking(b)}
                                                className={`group/card relative p-3 border rounded-xl flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer select-none text-[11px] leading-tight ${
                                                  themeMode === 'dark'
                                                    ? 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-white'
                                                    : 'bg-white hover:bg-stone-50 border-stone-200/90 hover:border-amber-300 text-stone-900'
                                                }`}
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
                                                          : b.status === 'Em andamento'
                                                          ? 'bg-purple-500 shadow-[0_0_6px_#a855f7] animate-pulse'
                                                          : b.status === 'Finalizado'
                                                          ? 'bg-slate-400 shadow-[0_0_6px_#94a3b8]'
                                                          : 'bg-amber-500 shadow-[0_0_6px_#f59e0b]'
                                                      }`} />
                                                      <span className={`text-[9px] uppercase font-black tracking-wider ${
                                                        b.status === 'Cancelado'
                                                          ? 'text-red-500'
                                                          : b.status === 'Confirmado'
                                                          ? 'text-emerald-600'
                                                          : b.status === 'Em andamento'
                                                          ? 'text-purple-600'
                                                          : b.status === 'Finalizado'
                                                          ? 'text-slate-500'
                                                          : 'text-amber-600'
                                                      }`}>
                                                        {b.status || 'Confirmado'}
                                                      </span>
                                                    </div>
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-0.5 border ${
                                                      themeMode === 'dark'
                                                        ? 'bg-slate-800 border-slate-700 text-slate-300'
                                                        : 'bg-stone-100 border-stone-200 text-stone-700'
                                                    }`}>
                                                      <svg className="w-2.5 h-2.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                      </svg>
                                                      {b.pessoas}p
                                                    </span>
                                                  </div>
                                                  
                                                  {/* Cliente Name and Contact Info */}
                                                  <div className="space-y-1">
                                                    <p className={`font-extrabold truncate pr-1 text-xs tracking-wide ${
                                                      themeMode === 'dark' ? 'text-slate-100' : 'text-stone-900'
                                                    }`}>
                                                      {name}
                                                    </p>
                                                    <p className={`text-[10px] truncate flex items-center gap-1 ${
                                                      themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
                                                    }`}>
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

      {/* Aba 2: Configurações (Totalmente adaptada para Light Mode e Dark Mode) */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Card 1: Gerenciar Horários da Agenda */}
          <div className={`rounded-3xl border overflow-hidden transition-all duration-300 ${
            themeMode === 'dark'
              ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-md'
              : 'bg-white border-stone-200/80 text-stone-900 shadow-sm'
          }`}>
            <button
              type="button"
              onClick={() => toggleConfigSection('horarios')}
              className={`w-full p-6 text-left flex items-center justify-between transition-colors cursor-pointer select-none ${
                themeMode === 'dark' ? 'bg-slate-900 hover:bg-slate-850' : 'bg-white hover:bg-stone-50'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg p-2 bg-amber-400 text-stone-900 rounded-2xl">⏰</span>
                  <h3 className={`text-xl font-extrabold ${themeMode === 'dark' ? 'text-white' : 'text-stone-900'}`}>
                    Gerenciar Horários da Agenda
                  </h3>
                </div>
                <p className={`text-xs font-medium ${themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'}`}>
                  Configure as vagas de horário disponíveis para agendamento dos clientes.
                </p>
              </div>
            </button>

            {openConfigSections.horarios && (
              <div className={`p-6 pt-6 border-t space-y-6 ${
                themeMode === 'dark' ? 'border-slate-800' : 'border-stone-200/60'
              }`}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Lado Esquerdo: Chips de Horários Ativos */}
                  <div className="space-y-4">
                    <div>
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${
                        themeMode === 'dark' ? 'text-slate-300' : 'text-stone-500'
                      }`}>Horários Ativos ({horariosDisponiveisSelected.length})</h4>
                      <p className={`text-[11px] mt-0.5 font-medium ${
                        themeMode === 'dark' ? 'text-slate-400' : 'text-stone-400'
                      }`}>Estes são os horários atualmente oferecidos aos clientes no formulário.</p>
                    </div>
                    {horariosDisponiveisSelected.length === 0 ? (
                      <div className={`p-6 border border-dashed rounded-2xl text-center ${
                        themeMode === 'dark' ? 'border-slate-800' : 'border-stone-300'
                      }`}>
                        <p className="text-xs text-stone-400 italic">Nenhum horário cadastrado. Adicione horários abaixo ou use o gerador.</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto pr-1">
                        {horariosDisponiveisSelected.map((time) => (
                          <div 
                            key={time} 
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl group transition-all text-xs font-mono font-bold shadow-xs border ${
                              themeMode === 'dark'
                                ? 'bg-slate-950 text-amber-400 border-slate-800'
                                : 'bg-stone-900 text-white border-stone-800'
                            }`}
                          >
                            <span className={themeMode === 'dark' ? 'text-amber-400' : 'text-amber-400'}>{time}</span>
                            <button 
                              type="button"
                              onClick={() => handleRemoveHorario(time)}
                              className="text-stone-400 hover:text-red-400 font-extrabold transition-colors cursor-pointer text-sm leading-none"
                              title={`Remover ${time}`}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Adicionar Individual */}
                    <div className={`pt-4 border-t space-y-2 ${
                      themeMode === 'dark' ? 'border-slate-800' : 'border-stone-200/60'
                    }`}>
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${
                        themeMode === 'dark' ? 'text-slate-300' : 'text-stone-500'
                      }`}>Adicionar Horário Individual</h4>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <select 
                            value={newTimeInput}
                            onChange={(e) => setNewTimeInput(e.target.value)}
                            className={`w-full px-3 py-2.5 text-xs rounded-xl focus:border-amber-500 focus:outline-none cursor-pointer font-semibold border ${
                              themeMode === 'dark'
                                ? 'bg-slate-950 border-slate-800 text-slate-100'
                                : 'bg-stone-50 border-stone-200 text-stone-900'
                            }`}
                          >
                            <option value="">-- Selecione o Horário --</option>
                            {["07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00","22:30","23:00","23:30"].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddHorario}
                          className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                        >
                          + Adicionar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Lado Direito: Gerador em Massa */}
                  <div className={`p-5 rounded-2xl space-y-4 border ${
                    themeMode === 'dark'
                      ? 'bg-slate-950/60 border-slate-800'
                      : 'bg-stone-50/70 border-stone-200/80'
                  }`}>
                    <div>
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${
                        themeMode === 'dark' ? 'text-slate-200' : 'text-stone-700'
                      }`}>Gerador de Horários em Massa</h4>
                      <p className={`text-[11px] mt-0.5 ${
                        themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
                      }`}>Preencha um intervalo de horas de forma automática.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className={`block text-[9px] font-bold uppercase ${
                          themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
                        }`}>Hora Início</label>
                        <select
                          value={bulkStart}
                          onChange={(e) => setBulkStart(e.target.value)}
                          className={`w-full px-2 py-2 text-xs rounded-xl focus:border-amber-500 focus:outline-none cursor-pointer font-semibold border ${
                            themeMode === 'dark'
                              ? 'bg-slate-900 border-slate-800 text-slate-100'
                              : 'bg-white border-stone-200 text-stone-900'
                          }`}
                        >
                          {["06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00","22:30","23:00"].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className={`block text-[9px] font-bold uppercase ${
                          themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
                        }`}>Hora Fim</label>
                        <select
                          value={bulkEnd}
                          onChange={(e) => setBulkEnd(e.target.value)}
                          className={`w-full px-2 py-2 text-xs rounded-xl focus:border-amber-500 focus:outline-none cursor-pointer font-semibold border ${
                            themeMode === 'dark'
                              ? 'bg-slate-900 border-slate-800 text-slate-100'
                              : 'bg-white border-stone-200 text-stone-900'
                          }`}
                        >
                          {["06:30","07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00","22:30","23:00","23:30"].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className={`block text-[9px] font-bold uppercase ${
                          themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
                        }`}>Intervalo</label>
                        <select
                          value={bulkInterval}
                          onChange={(e) => setBulkInterval(e.target.value)}
                          className={`w-full px-2 py-2 text-xs rounded-xl focus:border-amber-500 focus:outline-none cursor-pointer border ${
                            themeMode === 'dark'
                              ? 'bg-slate-900 border-slate-800 text-slate-100'
                              : 'bg-white border-stone-200 text-stone-900'
                          }`}
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
                      className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                    >
                      Gerar Horários
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Bloqueio & Ajustes de Vagas */}
          <div className={`rounded-3xl border overflow-hidden transition-all duration-300 ${
            themeMode === 'dark'
              ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-md'
              : 'bg-white border-stone-200/80 text-stone-900 shadow-sm'
          }`}>
            <button
              type="button"
              onClick={() => toggleConfigSection('bloqueio')}
              className={`w-full p-6 text-left flex items-center justify-between transition-colors cursor-pointer select-none ${
                themeMode === 'dark' ? 'bg-slate-900 hover:bg-slate-850' : 'bg-white hover:bg-stone-50'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg p-2 bg-stone-900 text-amber-400 rounded-2xl border border-stone-800">🚫</span>
                  <h3 className={`text-xl font-extrabold ${themeMode === 'dark' ? 'text-white' : 'text-stone-900'}`}>
                    Bloqueio & Ajustes de Vagas
                  </h3>
                </div>
                <p className={`text-xs font-medium ${themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'}`}>
                  Defina a capacidade ou feche horários específicos (0 vagas) para uma data.
                </p>
              </div>
            </button>

            {openConfigSections.bloqueio && (
              <div className={`p-6 pt-6 border-t space-y-6 ${
                themeMode === 'dark' ? 'border-slate-800' : 'border-stone-200/60'
              }`}>
                <div className="space-y-2">
                  <label className={`block text-xs font-bold uppercase tracking-wider ${
                    themeMode === 'dark' ? 'text-slate-300' : 'text-stone-500'
                  }`}>Selecionar Dia para Ajuste</label>
                  <div className="relative">
                    <select 
                      value={exData}
                      onChange={(e) => setExData(e.target.value)}
                      className={`w-full px-4 py-3 text-xs rounded-xl focus:border-amber-500 focus:outline-none transition-all cursor-pointer font-semibold border ${
                        themeMode === 'dark'
                          ? 'bg-slate-950 border-slate-800 text-slate-100'
                          : 'bg-stone-50 border-stone-200 text-stone-900'
                      }`}
                    >
                      {Array.from({ length: 14 }).map((_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() + i);
                        const dateStr = getLocalDateString(d);
                        const label = i === 0 
                          ? `Hoje (${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})` 
                          : i === 1 
                          ? `Amanhã (${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})`
                          : `${d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}`;
                        return <option key={dateStr} value={dateStr}>{label}</option>;
                      })}
                    </select>
                  </div>
                </div>

                {/* Ajuste em Massa para o dia */}
                <div className={`p-4 rounded-2xl space-y-3 border ${
                  themeMode === 'dark'
                    ? 'bg-slate-950/60 border-slate-800'
                    : 'bg-stone-50 border-stone-200/80'
                }`}>
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${
                      themeMode === 'dark' ? 'text-slate-200' : 'text-stone-700'
                    }`}>Ajuste de Capacidade</h4>
                    <p className={`text-[10px] mt-0.5 ${
                      themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
                    }`}>Mude a capacidade de todos os horários deste dia simultaneamente.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase select-none ${
                        themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
                      }`}>Vagas Geral:</span>
                      <select
                        value={bulkLimitInput}
                        onChange={(e) => handleBulkLimitChange(parseInt(e.target.value))}
                        className={`px-3 py-1.5 text-xs rounded-xl font-mono font-bold focus:border-amber-500 focus:outline-none cursor-pointer border ${
                          themeMode === 'dark'
                            ? 'bg-slate-900 border-slate-800 text-white'
                            : 'bg-white border-stone-200 text-stone-900'
                        }`}
                      >
                        <option value="0">0 vagas (Bloquear Tudo)</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50].map(n => (
                          <option key={n} value={n}>{n} vagas por horário</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Slots Grid Editor */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${
                      themeMode === 'dark' ? 'text-slate-300' : 'text-stone-500'
                    }`}>
                      Vagas para {exData ? new Date(exData + 'T00:00:00').toLocaleDateString('pt-BR') : ''}
                    </h4>
                    <span className="text-[10px] text-stone-400 font-medium">Ajuste de capacidade</span>
                  </div>
                  
                  {config.horarios_disponiveis.length === 0 ? (
                    <p className="text-xs text-stone-400 italic text-center py-4">Nenhum horário cadastrado nas regras.</p>
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
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${
                              isModified 
                                ? 'bg-amber-500/10 border-amber-400 shadow-xs' 
                                : isCustomized 
                                ? themeMode === 'dark' ? 'bg-amber-400/10 border-amber-400/30' : 'bg-amber-50/50 border-amber-300'
                                : themeMode === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-mono font-black ${
                                themeMode === 'dark' ? 'text-slate-100' : 'text-stone-900'
                              }`}>{time}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isCustomized && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSlotLimit(time, config.vagas_padrao)}
                                  className="p-1.5 rounded-lg text-amber-700 bg-amber-100 hover:bg-amber-200 transition-all cursor-pointer shrink-0"
                                  title="Restaurar capacidade padrão"
                                >
                                  🔄
                                </button>
                              )}

                              <select
                                value={currentLimit}
                                onChange={(e) => handleUpdateSlotLimit(time, parseInt(e.target.value))}
                                className={`px-2 py-1 text-xs rounded-lg font-mono font-bold focus:border-amber-500 focus:outline-none cursor-pointer border ${
                                  themeMode === 'dark'
                                    ? 'bg-slate-900 border-slate-800 text-white'
                                    : 'bg-white border-stone-200 text-stone-900'
                                }`}
                              >
                                <option value="0">0 (Bloqueado)</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 50].map(n => (
                                  <option key={n} value={n}>{n} vagas</option>
                                ))}
                              </select>

                              {currentLimit > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSlotLimit(time, 0)}
                                  className="px-2 py-1 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 hover:border-transparent rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                                >
                                  Bloquear
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSlotLimit(time, config.vagas_padrao)}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-transparent rounded-lg text-[9px] font-bold transition-all cursor-pointer"
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
            )}
          </div>

          {/* Cards de Cadastro e Regras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Card 3: Cadastro do Estabelecimento */}
            <div className={`rounded-3xl border overflow-hidden transition-all duration-300 ${
              themeMode === 'dark'
                ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-md'
                : 'bg-white border-stone-200/80 text-stone-900 shadow-sm'
            }`}>
              <button
                type="button"
                onClick={() => toggleConfigSection('cadastro')}
                className={`w-full p-6 text-left flex items-center justify-between transition-colors cursor-pointer select-none ${
                  themeMode === 'dark' ? 'bg-slate-900 hover:bg-slate-850' : 'bg-white hover:bg-stone-50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg p-2 bg-amber-400 text-stone-900 rounded-2xl">🏢</span>
                    <h3 className={`text-xl font-extrabold ${themeMode === 'dark' ? 'text-white' : 'text-stone-900'}`}>
                      Cadastro do Estabelecimento
                    </h3>
                  </div>
                  <p className={`text-xs font-medium ${themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'}`}>
                    Configure nome, telefones, endereço e descrição.
                  </p>
                </div>
              </button>

              {openConfigSections.cadastro && (
                <div className={`p-6 pt-6 border-t space-y-6 ${
                  themeMode === 'dark' ? 'border-slate-800' : 'border-stone-200/60'
                }`}>
                  {/* Nome do Estabelecimento (Limite: 60 caracteres) */}
                  <div className="space-y-1.5">
                    <label className={`block text-xs font-bold uppercase tracking-wider ${
                      themeMode === 'dark' ? 'text-slate-300' : 'text-stone-500'
                    }`}>Nome do Estabelecimento</label>
                    <input 
                      type="text"
                      maxLength={60}
                      value={appNameInput}
                      onChange={(e) => setAppNameInput(e.target.value.slice(0, 60))}
                      placeholder="Ex: Marcianos"
                      className={`w-full px-4 py-2.5 text-xs rounded-xl focus:border-amber-500 focus:outline-none font-semibold border ${
                        themeMode === 'dark'
                          ? 'bg-slate-950 border-slate-800 text-slate-100'
                          : 'bg-stone-50 border-stone-200 text-stone-900'
                      }`}
                    />
                  </div>

                  {/* Telefones de Contato (Formatados) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className={`block text-xs font-bold uppercase tracking-wider ${
                        themeMode === 'dark' ? 'text-slate-300' : 'text-stone-500'
                      }`}>Telefone Principal</label>
                      <input 
                        type="text"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(formatPhoneNumber(e.target.value))}
                        placeholder="Ex: (51) 99523-9876"
                        maxLength={15}
                        className={`w-full px-4 py-2.5 text-xs rounded-xl focus:border-amber-500 focus:outline-none font-mono font-semibold border ${
                          themeMode === 'dark'
                            ? 'bg-slate-950 border-slate-800 text-slate-100'
                            : 'bg-stone-50 border-stone-200 text-stone-900'
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={`block text-xs font-bold uppercase tracking-wider ${
                        themeMode === 'dark' ? 'text-slate-300' : 'text-stone-500'
                      }`}>Telefone Adicional (Opcional)</label>
                      <input 
                        type="text"
                        value={phone2Input}
                        onChange={(e) => setPhone2Input(formatPhoneNumber(e.target.value))}
                        placeholder="Ex: (51) 98888-7777"
                        maxLength={15}
                        className={`w-full px-4 py-2.5 text-xs rounded-xl focus:border-amber-500 focus:outline-none font-mono font-semibold border ${
                          themeMode === 'dark'
                            ? 'bg-slate-950 border-slate-800 text-slate-100'
                            : 'bg-stone-50 border-stone-200 text-stone-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Endereço com Busca / Autocomplete */}
                  <div className="space-y-1.5 relative">
                    <label className={`block text-xs font-bold uppercase tracking-wider ${
                      themeMode === 'dark' ? 'text-slate-300' : 'text-stone-500'
                    }`}>Endereço Completo</label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={addressInput}
                        onChange={(e) => {
                          setAddressInput(e.target.value);
                          setShowAddressDropdown(true);
                        }}
                        onFocus={() => setShowAddressDropdown(true)}
                        placeholder="Comece a digitar o nome do lugar para escolher..."
                        className={`w-full px-4 py-2.5 text-xs rounded-xl focus:border-amber-500 focus:outline-none font-semibold pr-10 border ${
                          themeMode === 'dark'
                            ? 'bg-slate-950 border-slate-800 text-slate-100'
                            : 'bg-stone-50 border-stone-200 text-stone-900'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-stone-400">
                        {isSearchingAddress ? (
                          <span className="animate-spin">⌛</span>
                        ) : (
                          <span>📍</span>
                        )}
                      </div>
                    </div>

                    {/* Dropdown de Sugestões */}
                    {showAddressDropdown && addressSuggestions.length > 0 && (
                      <div className={`absolute z-50 left-0 right-0 top-full mt-1 rounded-2xl shadow-xl overflow-hidden max-h-56 overflow-y-auto border ${
                        themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'
                      }`}>
                        {addressSuggestions.map((sug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setAddressInput(sug);
                              setShowAddressDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-start gap-2 cursor-pointer border-b last:border-0 ${
                              themeMode === 'dark'
                                ? 'text-slate-200 hover:bg-slate-800 border-slate-800'
                                : 'text-stone-800 hover:bg-amber-50 border-stone-100'
                            }`}
                          >
                            <span className="shrink-0 text-stone-400 mt-0.5">📍</span>
                            <span className="leading-tight">{sug}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Descrição (Slogan) - Formato 0/150 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className={`block text-xs font-bold uppercase tracking-wider ${
                        themeMode === 'dark' ? 'text-slate-300' : 'text-stone-500'
                      }`}>Descrição (Slogan)</label>
                      <span className="text-[10px] font-mono text-stone-400 font-semibold">{descriptionInput.length}/150</span>
                    </div>
                    <textarea 
                      rows="3"
                      maxLength={150}
                      value={descriptionInput}
                      onChange={(e) => setDescriptionInput(e.target.value.slice(0, 150))}
                      placeholder="Descrição curta que aparece no rodapé do site..."
                      className={`w-full px-4 py-2.5 text-xs rounded-xl focus:border-amber-500 focus:outline-none font-semibold resize-none border ${
                        themeMode === 'dark'
                          ? 'bg-slate-950 border-slate-800 text-slate-100'
                          : 'bg-stone-50 border-stone-200 text-stone-900'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Card 4: Regras de Funcionamento */}
            <div className={`rounded-3xl border overflow-hidden transition-all duration-300 ${
              themeMode === 'dark'
                ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-md'
                : 'bg-white border-stone-200/80 text-stone-900 shadow-sm'
            }`}>
              <button
                type="button"
                onClick={() => toggleConfigSection('regras')}
                className={`w-full p-6 text-left flex items-center justify-between transition-colors cursor-pointer select-none ${
                  themeMode === 'dark' ? 'bg-slate-900 hover:bg-slate-850' : 'bg-white hover:bg-stone-50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg p-2 bg-amber-400 text-stone-900 rounded-2xl">⚙️</span>
                    <h3 className={`text-xl font-extrabold ${themeMode === 'dark' ? 'text-white' : 'text-stone-900'}`}>
                      Regras de Funcionamento
                    </h3>
                  </div>
                  <p className={`text-xs font-medium ${themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'}`}>
                    Defina os dias de abertura, observações e prazos.
                  </p>
                </div>
              </button>

              {openConfigSections.regras && (
                <div className={`p-6 pt-6 border-t space-y-6 ${
                  themeMode === 'dark' ? 'border-slate-800' : 'border-stone-200/60'
                }`}>
                  {/* Dias de funcionamento */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <label className={`block text-xs font-bold uppercase tracking-wider ${
                        themeMode === 'dark' ? 'text-slate-300' : 'text-stone-500'
                      }`}>Dias em que o Estabelecimento Abre</label>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "seg-sex") setDiasFuncionamentoSelected([1, 2, 3, 4, 5]);
                          else if (val === "seg-sab") setDiasFuncionamentoSelected([1, 2, 3, 4, 5, 6]);
                          else if (val === "ter-dom") setDiasFuncionamentoSelected([2, 3, 4, 5, 6, 0]);
                          else if (val === "todos") setDiasFuncionamentoSelected([1, 2, 3, 4, 5, 6, 0]);
                          else if (val === "fds") setDiasFuncionamentoSelected([6, 0]);
                        }}
                        className={`px-3 py-1.5 text-xs rounded-xl focus:border-amber-500 focus:outline-none cursor-pointer font-semibold border ${
                          themeMode === 'dark'
                            ? 'bg-slate-950 border-slate-800 text-slate-100'
                            : 'bg-stone-50 border-stone-200 text-stone-900'
                        }`}
                      >
                        <option value="">-- Escolher Preset de Dias --</option>
                        <option value="todos">Todos os Dias (Seg a Dom)</option>
                        <option value="ter-dom">Terça a Domingo</option>
                        <option value="seg-sab">Segunda a Sábado</option>
                        <option value="seg-sex">Segunda a Sexta-feira</option>
                        <option value="fds">Apenas Finais de Semana (Sáb e Dom)</option>
                      </select>
                    </div>
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
                          <label key={day.value} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer select-none transition-colors ${
                            themeMode === 'dark'
                              ? 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200'
                              : 'bg-stone-50 border-stone-200 hover:border-amber-400 text-stone-800'
                          }`}>
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
                              className="accent-amber-500 size-4"
                            />
                            <span className="text-xs font-semibold">{day.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Campo de Observações Ativo */}
                  <div className="space-y-2">
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${
                      themeMode === 'dark' ? 'text-slate-300' : 'text-stone-500'
                    }`}>Campo de Observações</label>
                    <select
                      value={campoObservacoesAtivoInput ? "true" : "false"}
                      onChange={(e) => setCampoObservacoesAtivoInput(e.target.value === "true")}
                      className={`w-full px-4 py-3 text-xs rounded-xl focus:border-amber-500 focus:outline-none cursor-pointer font-semibold border ${
                        themeMode === 'dark'
                          ? 'bg-slate-950 border-slate-800 text-slate-100'
                          : 'bg-stone-50 border-stone-200 text-stone-900'
                      }`}
                    >
                      <option value="true">✅ Ativo - Exibir campo de observações no formulário de reserva</option>
                      <option value="false">🚫 Inativo - Ocultar campo de observações</option>
                    </select>
                  </div>

                  {/* Antecedência Máxima de Dias */}
                  <div className={`space-y-2 pt-2 border-t ${
                    themeMode === 'dark' ? 'border-slate-800' : 'border-stone-200'
                  }`}>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${
                      themeMode === 'dark' ? 'text-slate-300' : 'text-stone-500'
                    }`}>
                      Limite de Dias para Agendamento Futuro
                    </label>
                    <p className={`text-[10px] mb-2 font-medium ${
                      themeMode === 'dark' ? 'text-slate-400' : 'text-stone-400'
                    }`}>
                      Defina até quantos dias a partir da data atual o cliente poderá agendar uma mesa (Padrão: 7 dias).
                    </p>
                    <select
                      value={antecedenciaMaximaDiasInput}
                      onChange={(e) => setAntecedenciaMaximaDiasInput(parseInt(e.target.value))}
                      className={`w-full px-4 py-3 text-xs rounded-xl focus:border-amber-500 focus:outline-none cursor-pointer font-semibold border ${
                        themeMode === 'dark'
                          ? 'bg-slate-950 border-slate-800 text-slate-100'
                          : 'bg-stone-50 border-stone-200 text-stone-900'
                      }`}
                    >
                      <option value="1">1 dia (Somente amanhã)</option>
                      <option value="3">3 dias à frente</option>
                      <option value="7">7 dias (1 semana - Padrão)</option>
                      <option value="14">14 dias (2 semanas)</option>
                      <option value="21">21 dias (3 semanas)</option>
                      <option value="30">30 dias (1 mês)</option>
                      <option value="60">60 dias (2 meses)</option>
                      <option value="90">90 dias (3 meses)</option>
                      <option value="180">180 dias (6 meses)</option>
                      <option value="365">365 dias (1 ano)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botão unificado para salvar todas as alterações no rodapé */}
          <div className={`md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t mt-4 ${
            themeMode === 'dark' ? 'border-slate-800' : 'border-stone-200/80'
          }`}>
            {hasUnsavedChanges ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-900 bg-amber-400/20 border border-amber-400/50 px-4 py-3 rounded-2xl animate-pulse w-full sm:w-auto">
                <span className="text-base">⚠️</span>
                <span className={themeMode === 'dark' ? 'text-amber-300' : 'text-stone-900'}>Alterações pendentes de gravação. Não se esqueça de salvar!</span>
              </div>
            ) : (
              <div className={`flex items-center gap-2 text-xs font-semibold px-4 py-2.5 w-full sm:w-auto ${
                themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
              }`}>
                <span className="text-emerald-500 font-bold text-base">✓</span>
                <span>Configurações sincronizadas</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
              {hasUnsavedChanges && (
                <button
                  onClick={handleDiscardChanges}
                  className={`w-full sm:w-auto px-6 py-3.5 font-bold rounded-2xl transition-all cursor-pointer text-xs uppercase tracking-wider border ${
                    themeMode === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-stone-200 hover:bg-stone-300 text-stone-800 border-stone-300'
                  }`}
                >
                  Cancelar Alterações
                </button>
              )}
              <button
                onClick={handleSaveConfigs}
                className="w-full sm:w-auto px-8 py-3.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-black rounded-2xl shadow-md transition-all cursor-pointer text-xs uppercase tracking-wider shrink-0"
              >
                Salvar Todas as Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aba 3: Histórico de Ações (Cores distintas por tipo de ação & Adaptável a Temas) */}
      {activeTab === 'historico' && (
        <div className={`border p-6 sm:p-8 rounded-3xl shadow-xl space-y-6 transition-colors ${
          themeMode === 'dark'
            ? 'bg-slate-900 text-slate-100 border-slate-800'
            : 'bg-white text-stone-900 border-stone-200/80'
        }`}>
          <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 ${
            themeMode === 'dark' ? 'border-slate-800' : 'border-stone-200'
          }`}>
            <div>
              <h3 className={`text-xl font-black flex items-center gap-2 ${
                themeMode === 'dark' ? 'text-white' : 'text-stone-900'
              }`}>
                <span>⚡</span> Histórico de Atividades
              </h3>
              <p className={`text-xs mt-1 ${
                themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
              }`}>Veja um registro cronológico de todas as ações e modificações realizadas na agenda.</p>
            </div>
            <button
              onClick={() => {
                if (window.confirm("Deseja realmente limpar todo o histórico de ações?")) {
                  setActivityLogs([]);
                  localStorage.removeItem('admin_activity_logs');
                  setCurrentPage(1);
                }
              }}
              className="px-4 py-2 bg-red-500/15 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
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

            // Função para resolver cores e ícones exclusivos para cada tipo de ação no Histórico
            const getLogMeta = (log) => {
              const type = log.actionType || '';
              const details = (log.details || '').toLowerCase();

              if (type === 'cancel' || details.includes('cancel')) {
                return {
                  label: 'Cancelamento',
                  icon: '✕',
                  dotBg: 'bg-red-500 text-white',
                  badgeBg: 'bg-red-500/15 text-red-500 border-red-500/30',
                  hoverBorder: 'hover:border-red-500/40'
                };
              }
              if (type === 'create' || details.includes('novo agendamento') || details.includes('reserva')) {
                return {
                  label: 'Novo Agendamento',
                  icon: '✓',
                  dotBg: 'bg-emerald-500 text-white',
                  badgeBg: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
                  hoverBorder: 'hover:border-emerald-500/40'
                };
              }
              if (type === 'update' || type === 'edit' || details.includes('alterad') || details.includes('modificad')) {
                return {
                  label: 'Modificação',
                  icon: '✎',
                  dotBg: 'bg-indigo-500 text-white',
                  badgeBg: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
                  hoverBorder: 'hover:border-indigo-500/40'
                };
              }
              if (type === 'config_save' || details.includes('config')) {
                return {
                  label: 'Configuração Salva',
                  icon: '⚙',
                  dotBg: 'bg-purple-500 text-white',
                  badgeBg: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
                  hoverBorder: 'hover:border-purple-500/40'
                };
              }
              if (type === 'override_limit' || details.includes('vagas') || details.includes('capacidade')) {
                return {
                  label: 'Ajuste de Vagas',
                  icon: '⚡',
                  dotBg: 'bg-amber-500 text-stone-900',
                  badgeBg: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
                  hoverBorder: 'hover:border-amber-500/40'
                };
              }
              if (type === 'horarios' || details.includes('horário') || details.includes('horario')) {
                return {
                  label: 'Gestão de Horários',
                  icon: '⏰',
                  dotBg: 'bg-teal-500 text-white',
                  badgeBg: 'bg-teal-500/15 text-teal-600 border-teal-500/30',
                  hoverBorder: 'hover:border-teal-500/40'
                };
              }
              return {
                label: 'Atividade',
                icon: '📌',
                dotBg: 'bg-sky-500 text-white',
                badgeBg: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
                hoverBorder: 'hover:border-sky-500/40'
              };
            };

            return (
              <>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {activityLogs.length === 0 ? (
                    <p className={`text-xs italic text-center py-10 ${
                      themeMode === 'dark' ? 'text-slate-400' : 'text-stone-400'
                    }`}>Nenhuma ação registrada no histórico de atividades.</p>
                  ) : (
                    <div className={`relative border-l-2 ml-4 pl-6 space-y-6 ${
                      themeMode === 'dark' ? 'border-slate-800' : 'border-stone-200'
                    }`}>
                      {paginatedLogs.map(log => {
                        const logDate = new Date(log.timestamp);
                        const formattedDateTime = `${logDate.toLocaleDateString('pt-BR')} às ${logDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
                        const meta = getLogMeta(log);

                        return (
                          <div key={log.id} className="relative group/log">
                            {/* Ponto indicador da linha do tempo com cor e ícone específicos */}
                            <span className={`absolute -left-[31px] top-1.5 w-5 h-5 rounded-full font-extrabold text-[10px] flex items-center justify-center shadow-xs ${meta.dotBg}`}>
                              {meta.icon}
                            </span>

                            <div className={`p-4 rounded-2xl space-y-2 border transition-all ${
                              themeMode === 'dark'
                                ? 'bg-slate-950/80 border-slate-800'
                                : 'bg-stone-50 border-stone-200/80'
                            } ${meta.hoverBorder}`}>
                              <div className="flex justify-between items-center flex-wrap gap-2">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${meta.badgeBg}`}>
                                  {meta.label}
                                </span>
                                <span className={`text-[10px] font-mono font-semibold ${
                                  themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
                                }`}>
                                  {formattedDateTime}
                                </span>
                              </div>
                              <p className={`text-xs leading-relaxed font-medium ${
                                themeMode === 'dark' ? 'text-slate-200' : 'text-stone-800'
                              }`}>
                                {log.details}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Paginação Adaptável a Temas */}
                {totalPages > 1 && (
                  <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t select-none mt-6 ${
                    themeMode === 'dark' ? 'border-slate-800' : 'border-stone-200'
                  }`}>
                    <span className={`text-xs font-medium ${
                      themeMode === 'dark' ? 'text-slate-400' : 'text-stone-500'
                    }`}>
                      Exibindo {startIndex + 1} a {Math.min(endIndex, activityLogs.length)} de {activityLogs.length} atividades
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
                          currentPage === 1
                            ? themeMode === 'dark' ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed opacity-50' : 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                            : themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
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
                                ? 'bg-amber-400 text-stone-900 border-amber-400 shadow-sm font-black'
                                : themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
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
                        className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
                          currentPage === totalPages
                            ? themeMode === 'dark' ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed opacity-50' : 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                            : themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
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
                      : selectedBooking.status === 'Confirmado'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : selectedBooking.status === 'Em andamento'
                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse'
                      : selectedBooking.status === 'Finalizado'
                      ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
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

      {/* Pop-up profissional de Alertas/Informações */}
      {alertModal.show && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAlertModal(prev => ({ ...prev, show: false }));
            }
          }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[120] animate-fade-in"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-4 text-center">
            <button 
              onClick={() => setAlertModal(prev => ({ ...prev, show: false }))}
              className="absolute top-4 right-4 text-slate-450 hover:text-white text-xl font-bold transition-colors border-0 bg-transparent cursor-pointer"
            >
              &times;
            </button>
            <div className={`mx-auto w-12 h-12 flex items-center justify-center rounded-full border ${
              alertModal.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : alertModal.type === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : alertModal.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-primary/10 border-primary/20 text-primary'
            }`}>
              {alertModal.type === 'success' ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              ) : alertModal.type === 'error' ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : alertModal.type === 'warning' ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{alertModal.title}</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {alertModal.message}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setAlertModal(prev => ({ ...prev, show: false }))}
                className="w-full py-2.5 bg-primary hover:brightness-110 text-white font-bold rounded-xl text-xs transition-all cursor-pointer border-0"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
