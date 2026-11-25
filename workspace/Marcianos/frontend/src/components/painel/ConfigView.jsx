import React, { useEffect, useId, useMemo, useState } from 'react';
import { Loader2, Minus, Plus, X } from 'lucide-react';
import { formatPhone, vagasLabel, sortTimes, toDateKey, pad2 } from '../../services/agenda';
import { isWebhookDevUrl } from '../../services/notify';

const WEEK = [
  { day: 1, label: 'Seg' },
  { day: 2, label: 'Ter' },
  { day: 3, label: 'Qua' },
  { day: 4, label: 'Qui' },
  { day: 5, label: 'Sex' },
  { day: 6, label: 'Sáb' },
  { day: 0, label: 'Dom' },
];

const EDITABLE_KEYS = [
  'dias_funcionamento',
  'horarios_disponiveis',
  'vagas_padrao',
  'limites_customizados',
  'campo_observacoes_ativo',
  'antecedencia_maxima_dias',
  'app_name',
  'description',
  'address',
  'phone',
  'phone2',
];

const pick = (cfg) => Object.fromEntries(EDITABLE_KEYS.map((k) => [k, cfg[k]]));

function generateTimes(start, end, interval) {
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const out = [];
  for (let t = toMin(start); t <= toMin(end); t += interval) out.push(`${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`);
  return out;
}

/** Configurações da agenda em termos simples. Nada é salvo até "Salvar alterações". */
export default function ConfigView({ config, usingDb, onSave, onDirtyChange }) {
  const uid = useId();
  const [draft, setDraft] = useState(() => pick(config));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [newTime, setNewTime] = useState('');
  const [timeError, setTimeError] = useState('');
  const [gen, setGen] = useState({ start: '18:00', end: '22:00', interval: 30 });
  const [exDate, setExDate] = useState(() => toDateKey(new Date()));

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(pick(config)), [draft, config]);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  // Avisa antes de fechar a aba com alterações pendentes
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const times = sortTimes(draft.horarios_disponiveis || []);

  const toggleDay = (day) => {
    const days = draft.dias_funcionamento || [];
    set('dias_funcionamento', days.includes(day) ? days.filter((d) => d !== day) : [...days, day]);
  };

  const addTime = () => {
    if (!/^\d{2}:\d{2}$/.test(newTime)) {
      setTimeError('Escolha um horário, por exemplo 19:30.');
      return;
    }
    if (times.includes(newTime)) {
      setTimeError(`${newTime} já está na lista.`);
      return;
    }
    set('horarios_disponiveis', sortTimes([...times, newTime]));
    setNewTime('');
    setTimeError('');
  };

  const exceptions = draft.limites_customizados?.[exDate] || {};
  const setException = (time, value) => {
    const all = { ...(draft.limites_customizados || {}) };
    const day = { ...(all[exDate] || {}) };
    if (value === '' || value === null) delete day[time];
    else day[time] = Math.max(0, Number(value) || 0);
    if (Object.keys(day).length === 0) delete all[exDate];
    else all[exDate] = day;
    set('limites_customizados', all);
  };
  const closeWholeDay = () => {
    set('limites_customizados', { ...(draft.limites_customizados || {}), [exDate]: Object.fromEntries(times.map((t) => [t, 0])) });
  };
  const resetDay = () => {
    const all = { ...(draft.limites_customizados || {}) };
    delete all[exDate];
    set('limites_customizados', all);
  };
  const daysWithExceptions = Object.keys(draft.limites_customizados || {})
    .filter((k) => k >= toDateKey(new Date()))
    .sort();

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await onSave({ ...config, ...draft, horarios_disponiveis: times });
    } catch (err) {
      console.error('[Configurações] Erro ao salvar:', err);
      setSaveError('Não foi possível salvar. Suas alterações continuam aqui; tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="config-title" className="space-y-5 pb-28">
      <h2 id="config-title" className="text-xl font-bold tracking-[-0.01em] sm:text-2xl">
        Configurações
      </h2>

      <Sheet title="Dias de funcionamento" hint="Só os dias marcados aparecem para reserva.">
        <div role="group" aria-label="Dias de funcionamento" className="flex flex-wrap gap-2">
          {WEEK.map(({ day, label }) => {
            const on = (draft.dias_funcionamento || []).includes(day);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDay(day)}
                className={`panel-btn min-w-14 ${on ? 'bg-mint text-mint-deep' : 'panel-btn-ghost text-panel-ink-soft'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Sheet>

      <Sheet title="Horários de reserva" hint="Os horários que o cliente pode escolher, em todos os dias abertos.">
        {times.length === 0 ? (
          <p className="text-[15px] text-st-pre-ink">Nenhum horário: ninguém consegue reservar. Adicione pelo menos um.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {times.map((t) => (
              <li key={t} className="inline-flex items-center gap-1 rounded-full bg-mint-soft py-1 pl-3 pr-1 text-[15px] font-semibold text-mint-deep">
                {t}
                <button
                  type="button"
                  onClick={() => set('horarios_disponiveis', times.filter((x) => x !== t))}
                  className="grid size-8 place-items-center rounded-full hover:bg-mint"
                  aria-label={`Remover ${t}`}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-new-time`} className="mb-1.5 block text-sm font-semibold">
              Adicionar um horário
            </label>
            <div className="flex gap-2">
              <input
                id={`${uid}-new-time`}
                type="time"
                step="900"
                value={newTime}
                onChange={(e) => {
                  setNewTime(e.target.value);
                  setTimeError('');
                }}
                className="panel-field max-w-40"
                aria-invalid={Boolean(timeError)}
                aria-describedby={timeError ? `${uid}-time-error` : undefined}
              />
              <button type="button" className="panel-btn panel-btn-soft" onClick={addTime}>
                Adicionar
              </button>
            </div>
            {timeError && (
              <p id={`${uid}-time-error`} className="mt-1.5 text-sm font-medium text-st-naoveio-ink">
                {timeError}
              </p>
            )}
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Gerar uma lista de horários</legend>
            <div className="flex flex-wrap items-end gap-2">
              <label className="block text-[13px] text-panel-ink-soft">
                De
                <input type="time" step="900" value={gen.start} onChange={(e) => setGen((g) => ({ ...g, start: e.target.value }))} className="panel-field mt-1 block w-32" />
              </label>
              <label className="block text-[13px] text-panel-ink-soft">
                Até
                <input type="time" step="900" value={gen.end} onChange={(e) => setGen((g) => ({ ...g, end: e.target.value }))} className="panel-field mt-1 block w-32" />
              </label>
              <label className="block text-[13px] text-panel-ink-soft">
                A cada
                <select value={gen.interval} onChange={(e) => setGen((g) => ({ ...g, interval: Number(e.target.value) }))} className="panel-field mt-1 block w-32">
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>1 hora</option>
                </select>
              </label>
              <button
                type="button"
                className="panel-btn panel-btn-ghost"
                onClick={() => gen.start && gen.end && gen.start <= gen.end && set('horarios_disponiveis', generateTimes(gen.start, gen.end, gen.interval))}
              >
                Trocar a lista
              </button>
            </div>
            <p className="mt-1.5 text-[13px] text-panel-ink-soft">Substitui os horários acima. Dá para desfazer em “Descartar”.</p>
          </fieldset>
        </div>
      </Sheet>

      <Sheet title="Vagas e regras">
        <div className="grid gap-5 sm:grid-cols-2">
          <Stepper
            label="Reservas por horário"
            hint="Quantas reservas (mesas) cabem em cada horário. Cada reserva ocupa 1 vaga, seja de 2 ou de 5 pessoas."
            value={Number(draft.vagas_padrao) || 0}
            min={1}
            max={200}
            format={vagasLabel}
            onChange={(v) => set('vagas_padrao', v)}
          />
          <Stepper
            label="Reservas com antecedência de até"
            hint="Quantos dias à frente o cliente pode reservar, contando hoje."
            value={Number(draft.antecedencia_maxima_dias) || 7}
            min={1}
            max={60}
            format={(v) => `${v} ${v === 1 ? 'dia' : 'dias'}`}
            onChange={(v) => set('antecedencia_maxima_dias', v)}
          />
        </div>
        <label className="mt-5 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={draft.campo_observacoes_ativo ?? true}
            onChange={(e) => set('campo_observacoes_ativo', e.target.checked)}
            className="mt-1 size-5 accent-[var(--color-mint-strong)]"
          />
          <span>
            <span className="block text-[15px] font-semibold">Campo de observação na reserva</span>
            <span className="block text-sm text-panel-ink-soft">O cliente pode avisar aniversário, alergia ou cadeirinha.</span>
          </span>
        </label>
      </Sheet>

      <Sheet title="Exceções de um dia" hint="Feriado, evento ou casa cheia: mude as vagas só daquele dia. 0 fecha o horário.">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm font-semibold">
            Dia
            <input type="date" min={toDateKey(new Date())} value={exDate} onChange={(e) => setExDate(e.target.value)} className="panel-field mt-1.5 block w-48" />
          </label>
          <button type="button" className="panel-btn panel-btn-danger" onClick={closeWholeDay} disabled={times.length === 0}>
            Fechar o dia inteiro
          </button>
          {Object.keys(exceptions).length > 0 && (
            <button type="button" className="panel-btn panel-btn-ghost" onClick={resetDay}>
              Voltar ao padrão
            </button>
          )}
        </div>
        {exDate && times.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {times.map((t) => {
              const value = exceptions[t];
              return (
                <li key={t} className={`rounded-2xl border p-3 ${value === 0 ? 'border-st-naoveio-ink/40 bg-st-naoveio-bg/50' : value !== undefined ? 'border-mint-strong/40 bg-mint-soft' : 'border-panel-line'}`}>
                  <label className="block text-[15px] font-bold" htmlFor={`${uid}-ex-${t}`}>
                    {t}
                  </label>
                  <input
                    id={`${uid}-ex-${t}`}
                    type="number"
                    min={0}
                    max={500}
                    inputMode="numeric"
                    placeholder={`${draft.vagas_padrao} (padrão)`}
                    value={value ?? ''}
                    onChange={(e) => setException(t, e.target.value)}
                    className="panel-field mt-1.5"
                  />
                  <p className="mt-1 text-[13px] text-panel-ink-soft">{value === 0 ? 'Fechado' : value !== undefined ? vagasLabel(value) : 'Padrão'}</p>
                </li>
              );
            })}
          </ul>
        )}
        {daysWithExceptions.length > 0 && (
          <p className="mt-4 text-sm text-panel-ink-soft">
            Dias com exceção:{' '}
            {daysWithExceptions.map((k, i) => (
              <React.Fragment key={k}>
                {i > 0 && ', '}
                <button type="button" className="font-semibold text-mint-strong underline underline-offset-4" onClick={() => setExDate(k)}>
                  {k.split('-').reverse().slice(0, 2).join('/')}
                </button>
              </React.Fragment>
            ))}
          </p>
        )}
      </Sheet>

      <Sheet title="Dados do restaurante" hint="Aparecem na página de reserva e no cartão de embarque do cliente.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Nome" value={draft.app_name || ''} onChange={(v) => set('app_name', v)} />
          <TextField label="Endereço" value={draft.address || ''} onChange={(v) => set('address', v)} />
          <TextField label="WhatsApp do restaurante" type="tel" value={draft.phone || ''} onChange={(v) => set('phone', formatPhone(v))} />
          <TextField label="Outro telefone (opcional)" type="tel" value={draft.phone2 || ''} onChange={(v) => set('phone2', formatPhone(v))} />
          <TextField className="sm:col-span-2" label="Descrição" value={draft.description || ''} onChange={(v) => set('description', v)} />
        </div>
      </Sheet>

      <Sheet title="Sistema">
        <ul className="space-y-2 text-[15px]">
          <li>
            <strong className="font-semibold">Onde ficam as reservas:</strong>{' '}
            {usingDb ? 'no banco de dados (Supabase).' : 'só neste navegador (modo local). As tabelas do Supabase ainda não foram criadas; peça para quem cuida do site.'}
          </li>
          {isWebhookDevUrl() && (
            <li className="text-st-pre-ink">
              <strong className="font-semibold">Aviso de reserva pelo WhatsApp:</strong> ainda aponta para o computador de desenvolvimento, então as mensagens
              automáticas não saem no site publicado.
            </li>
          )}
          <li>
            <strong className="font-semibold">Visitas à página de reserva:</strong> {Number(config.acessos_pagina_agenda) || 0}
          </li>
        </ul>
      </Sheet>

      {/* Barra de salvar: só aparece com alteração pendente */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="panel-toast mx-auto flex max-w-[720px] flex-wrap items-center gap-3 rounded-[20px] bg-panel-ink px-4 py-3 text-white shadow-[0_18px_40px_-16px_rgb(29_40_38/0.55)]">
            <p className="min-w-0 flex-1 text-[15px]" role="status">
              {saveError || 'Você tem alterações não salvas.'}
            </p>
            <button type="button" className="panel-btn bg-white/10 text-white hover:bg-white/20" onClick={() => setDraft(pick(config))} disabled={saving}>
              Descartar
            </button>
            <button type="button" className="panel-btn bg-mint text-mint-deep" onClick={save} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Sheet({ title, hint, children }) {
  return (
    <section className="rounded-[20px] border border-panel-line bg-panel-sheet p-5">
      <h3 className="text-[17px] font-bold">{title}</h3>
      {hint && <p className="mt-1 text-[15px] text-panel-ink-soft">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stepper({ label, hint, value, min, max, format, onChange }) {
  const id = useId();
  return (
    <div>
      <p id={id} className="text-sm font-semibold">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2" role="group" aria-labelledby={id}>
        <button type="button" className="panel-btn panel-btn-ghost size-11 px-0" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Diminuir">
          <Minus className="size-4" aria-hidden />
        </button>
        <output aria-live="polite" className="min-w-28 text-center text-[17px] font-bold">
          {format(value)}
        </output>
        <button type="button" className="panel-btn panel-btn-ghost size-11 px-0" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Aumentar">
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
      {hint && <p className="mt-1.5 text-[13px] text-panel-ink-soft">{hint}</p>}
    </div>
  );
}

function TextField({ label, value, onChange, type = 'text', className = '' }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="panel-field" />
    </div>
  );
}
