import { useCallback, useEffect, useRef, useState } from 'react';
import { getAgendaConfig, getAgendamentos, isUsingDatabase, saveAgendaConfig, subscribeAgendamentos, updateAgendamentoStatus } from '../../services/api';
import { shortDateLabel, pessoasLabel } from '../../services/agenda';

const LOG_KEY = 'admin_activity_logs';
const MAX_LOGS = 300;

function readLogs() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

const describe = (b) => `${b.nome || 'Cliente sem nome'} · ${pessoasLabel(b.pessoas)} · ${shortDateLabel(b.data)} às ${b.horario}`;

/** Dados e ações do painel: reservas, configuração, histórico e avisos com desfazer. */
export function usePainel() {
  const [bookings, setBookings] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [usingDb, setUsingDb] = useState(isUsingDatabase());
  const [logs, setLogs] = useState(readLogs);
  const [toasts, setToasts] = useState([]);
  const knownIds = useRef(null);

  const addLog = useCallback((type, details) => {
    setLogs((prev) => {
      const next = [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, actionType: type, details, timestamp: new Date().toISOString() }, ...prev].slice(0, MAX_LOGS);
      localStorage.setItem(LOG_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const dismissToast = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const pushToast = useCallback(
    (toast) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
      setTimeout(() => dismissToast(id), toast.duration ?? 6000);
    },
    [dismissToast]
  );

  const reload = useCallback(async () => {
    try {
      const [bks, cfg] = await Promise.all([getAgendamentos(), getAgendaConfig()]);
      // Reserva que apareceu desde a última carga vira aviso e entra no histórico
      if (knownIds.current) {
        bks
          .filter((b) => !knownIds.current.has(b.id))
          .forEach((b) => {
            pushToast({ tone: 'info', message: `Nova reserva: ${describe(b)}` });
            addLog('create', `Nova reserva: ${describe(b)}`);
          });
      }
      knownIds.current = new Set(bks.map((b) => b.id));
      setBookings(bks);
      setConfig(cfg);
      setUsingDb(isUsingDatabase());
      setLoadError(false);
    } catch (err) {
      console.error('[Painel] Erro ao carregar:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [addLog, pushToast]);

  useEffect(() => {
    reload();
    const stop = subscribeAgendamentos(() => reload());
    // Sem tempo real (modo local), confere a cada minuto e quando a aba volta a ficar visível
    const interval = setInterval(reload, 60000);
    const onVisible = () => document.visibilityState === 'visible' && reload();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stop();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [reload]);

  /** Muda o status com aviso de desfazer. Nada é apagado. */
  const changeStatus = useCallback(
    async (booking, status, { silentUndo = false } = {}) => {
      const previous = booking.status;
      if (previous === status) return;
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status } : b)));
      try {
        await updateAgendamentoStatus(booking.id, status);
        addLog(status, `${previous} → ${status}: ${describe(booking)}`);
        if (!silentUndo) {
          pushToast({
            tone: 'success',
            message: `${booking.nome || 'Reserva'}: ${status}`,
            action: { label: 'Desfazer', run: () => changeStatus({ ...booking, status }, previous, { silentUndo: true }) },
          });
        }
      } catch (err) {
        console.error('[Painel] Erro ao mudar o status:', err);
        setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: previous } : b)));
        pushToast({ tone: 'error', message: 'Não deu para salvar a mudança. Confira a internet e tente de novo.' });
      }
    },
    [addLog, pushToast]
  );

  const saveConfig = useCallback(
    async (draft) => {
      await saveAgendaConfig(draft);
      setConfig(draft);
      addLog('config', 'Configurações da agenda atualizadas');
      pushToast({ tone: 'success', message: 'Configurações salvas.' });
    },
    [addLog, pushToast]
  );

  return { bookings, config, loading, loadError, usingDb, logs, toasts, dismissToast, pushToast, changeStatus, saveConfig, reload };
}
