import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, LogOut, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePainel } from '../components/painel/usePainel';
import HojeView from '../components/painel/HojeView';
import SemanaView from '../components/painel/SemanaView';
import ConfigView from '../components/painel/ConfigView';
import HistoricoView from '../components/painel/HistoricoView';
import ReservaDialog from '../components/painel/ReservaDialog';
import logo from '../logo.png';

const TABS = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: 'Semana' },
  { id: 'config', label: 'Configurações' },
  { id: 'historico', label: 'Histórico' },
];

/** Painel do dono: a noite de serviço primeiro; semana, configurações e histórico nas abas. */
function AdminDashboard() {
  const { logout, isDevSession } = useAuth();
  const painel = usePainel();
  const { bookings, config, loading, loadError, usingDb, logs, toasts, dismissToast, changeStatus, saveConfig, reload } = painel;

  const [tab, setTab] = useState('hoje');
  const [selected, setSelected] = useState(null);
  const [configDirty, setConfigDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);
  const leaveRef = useRef(null);
  const tabRefs = useRef({});

  useEffect(() => {
    document.title = 'Painel de reservas · Marcianos';
  }, []);

  // A reserva aberta acompanha as mudanças (status alterado, tempo real)
  const selectedBooking = selected ? bookings.find((b) => b.id === selected.id) || selected : null;

  const goTo = (next) => {
    if (next === tab) return;
    if (tab === 'config' && configDirty) {
      setPendingTab(next);
      leaveRef.current?.showModal();
      return;
    }
    setTab(next);
  };

  // Setas do teclado entre as abas, como num grupo de abas nativo
  const onTabKey = (e, index) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = TABS[(index + delta + TABS.length) % TABS.length].id;
    goTo(next);
    tabRefs.current[next]?.focus();
  };

  const handleDirty = useCallback((d) => setConfigDirty(d), []);

  return (
    <div className="panel-root min-h-dvh font-sans">
      {isDevSession && (
        <p className="bg-st-pre-bg px-4 py-2 text-center text-sm font-medium text-st-pre-ink">
          Modo de desenvolvimento: você entrou sem senha. No site publicado, o painel pede e-mail e senha.
        </p>
      )}

      <header className="border-b border-panel-line bg-panel-bg">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logo} alt="" width="40" height="40" className="size-10 rounded-xl object-cover" />
            <div className="min-w-0">
              <p className="font-display text-[15px] font-bold uppercase leading-tight tracking-[0.06em]">{config?.app_name || 'Marcianos'}</p>
              <p className="truncate text-[13px] text-panel-ink-soft">Painel de reservas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noreferrer" className="panel-btn panel-btn-ghost hidden sm:inline-flex">
              <ExternalLink className="size-4" aria-hidden /> Página de reserva
            </a>
            <button type="button" className="panel-btn panel-btn-ghost" onClick={logout}>
              <LogOut className="size-4" aria-hidden /> Sair
            </button>
          </div>
        </div>

        <nav className="mx-auto max-w-[1240px] px-4 pb-3 sm:px-6" aria-label="Seções do painel">
          <div role="tablist" aria-label="Seções do painel" className="scroll-row -mx-1 flex gap-1 overflow-x-auto rounded-full bg-panel-sunken p-1 sm:inline-flex">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                ref={(el) => (tabRefs.current[t.id] = el)}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => goTo(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={`relative min-h-10 shrink-0 rounded-full px-3 text-[14px] font-semibold transition-colors sm:px-4 sm:text-[15px] ${
                  tab === t.id ? 'bg-mint text-mint-deep' : 'text-panel-ink-soft hover:text-panel-ink'
                }`}
              >
                {t.label}
                {t.id === 'config' && configDirty && (
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-st-pre-ink" aria-label="(alterações não salvas)" />
                )}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6">
        {loading ? (
          <p className="flex items-center gap-2 text-[15px] text-panel-ink-soft" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Carregando as reservas…
          </p>
        ) : loadError || !config ? (
          <div role="alert" className="rounded-[20px] bg-st-naoveio-bg p-5 text-st-naoveio-ink">
            <p className="font-semibold">Não foi possível carregar as reservas.</p>
            <p className="mt-1 text-[15px]">Confira a internet e tente de novo.</p>
            <button type="button" className="panel-btn panel-btn-ghost mt-3" onClick={reload}>
              Tentar de novo
            </button>
          </div>
        ) : (
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={-1}>
            {tab === 'hoje' && <HojeView bookings={bookings} config={config} onStatus={changeStatus} onOpen={setSelected} />}
            {tab === 'semana' && <SemanaView bookings={bookings} config={config} onOpen={setSelected} />}
            {tab === 'config' && <ConfigView config={config} usingDb={usingDb} onSave={saveConfig} onDirtyChange={handleDirty} />}
            {tab === 'historico' && <HistoricoView logs={logs} />}
          </div>
        )}
      </main>

      <ReservaDialog booking={selectedBooking} onClose={() => setSelected(null)} onStatus={changeStatus} />

      <dialog ref={leaveRef} className="panel-dialog m-auto" aria-labelledby="leave-title" onClose={() => setPendingTab(null)}>
        <div className="p-6">
          <h2 id="leave-title" className="text-xl font-bold">
            Sair sem salvar?
          </h2>
          <p className="mt-2 text-[15px] text-panel-ink-soft">As alterações nas configurações ainda não foram salvas e vão se perder.</p>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" className="panel-btn panel-btn-ghost" onClick={() => leaveRef.current.close()}>
              Continuar editando
            </button>
            <button
              type="button"
              className="panel-btn panel-btn-danger"
              onClick={() => {
                const next = pendingTab;
                setConfigDirty(false);
                leaveRef.current.close();
                if (next) setTab(next);
              }}
            >
              Sair sem salvar
            </button>
          </div>
        </div>
      </dialog>

      {/* Avisos: confirmação de cada ação, com desfazer */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 px-3 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={`panel-toast pointer-events-auto flex w-full max-w-[520px] items-center gap-3 rounded-2xl px-4 py-3 shadow-[0_14px_34px_-14px_rgb(29_40_38/0.5)] ${
              t.tone === 'error' ? 'bg-st-naoveio-ink text-white' : 'bg-panel-ink text-white'
            } ${tab === 'config' && configDirty ? 'mb-20' : ''}`}
          >
            <p className="min-w-0 flex-1 text-[15px]">{t.message}</p>
            {t.action && (
              <button
                type="button"
                className="panel-btn bg-mint text-mint-deep"
                onClick={() => {
                  t.action.run();
                  dismissToast(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" className="grid size-9 place-items-center rounded-full hover:bg-white/10" onClick={() => dismissToast(t.id)} aria-label="Fechar aviso">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;
