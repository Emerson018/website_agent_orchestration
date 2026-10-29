import { supabase } from '../lib/supabase';

export const DEFAULT_AGENDA_CONFIG = {
  dias_funcionamento: [2, 3, 4, 5, 6, 0], // Terça a Domingo
  horarios_disponiveis: ['18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'],
  vagas_padrao: 5,
  limites_customizados: {},
  campo_observacoes_ativo: true,
  antecedencia_maxima_dias: 7,
  acessos_pagina_agenda: 0,
  app_name: 'Marcianos',
  description:
    'O maior rodízio de mini burgers do universo, com boliche e diversão garantida para toda a família!',
  address: 'Av. Padre Cacique, 580 - Menino Deus - Porto Alegre/RS',
  phone: '(51) 99523-9876',
  phone2: '',
  emoji_app: '🛸',
  emoji_address: '📍',
  emoji_contact: '📞',
};

let useDatabase = true;
let isChecked = false;
let dbCheckPromise = null;

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getLocalDateString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatPhoneMask(val) {
  if (!val) return '';
  const digits = String(val).replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function formatWahaChatId(phone) {
  let digitsForWaha = String(phone || '').replace(/\D/g, '');
  if (!digitsForWaha) return '';
  if (!digitsForWaha.startsWith('55')) {
    digitsForWaha = '55' + digitsForWaha;
  }
  if (digitsForWaha.length === 13) {
    const ddd = parseInt(digitsForWaha.slice(2, 4), 10);
    if (ddd > 28) {
      digitsForWaha = digitsForWaha.slice(0, 4) + digitsForWaha.slice(5);
    }
  }
  return `${digitsForWaha}@c.us`;
}

export function deriveBookingLifecycleStatus(currentStatus, inicioIso, now = new Date()) {
  const status = currentStatus || 'Confirmado';
  if (status === 'Cancelado' || status === 'Finalizado' || !inicioIso) {
    return { status, changed: false };
  }

  const localPart = String(inicioIso).slice(0, 19);
  const bookingTime = new Date(localPart);
  if (Number.isNaN(bookingTime.getTime())) {
    return { status, changed: false };
  }

  const diffMinutes = (now.getTime() - bookingTime.getTime()) / (1000 * 60);

  if (status === 'Agendado' || status === 'Confirmado' || status === 'Pendente') {
    if (diffMinutes >= 0 && diffMinutes < 40) {
      return { status: 'Em andamento', changed: status !== 'Em andamento' };
    }
    if (diffMinutes >= 40) {
      return { status: 'Finalizado', changed: true };
    }
  } else if (status === 'Em andamento' && diffMinutes >= 40) {
    return { status: 'Finalizado', changed: true };
  }

  return { status, changed: false };
}

export function computeSlotAvailability(
  dateStr,
  timeSlot,
  config = DEFAULT_AGENDA_CONFIG,
  bookings = [],
  now = new Date()
) {
  const fallbackLimit = config?.vagas_padrao ?? DEFAULT_AGENDA_CONFIG.vagas_padrao;
  if (!dateStr) {
    return { available: true, remaining: fallbackLimit, limit: fallbackLimit };
  }

  const limit = config?.limites_customizados?.[dateStr]?.[timeSlot] ?? fallbackLimit;
  const todayStr = getLocalDateString(now);

  if (dateStr < todayStr) {
    return { available: false, remaining: 0, limit };
  }

  if (dateStr === todayStr && timeSlot) {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const [slotHour, slotMinute] = String(timeSlot).split(':').map(Number);

    if (slotHour < currentHour || (slotHour === currentHour && slotMinute <= currentMinute)) {
      return { available: false, remaining: 0, limit };
    }
  }

  const bookingsInSlot = (bookings || []).filter(
    (b) => b.data === dateStr && b.horario === timeSlot && b.status !== 'Cancelado'
  );
  const occupiedSlots = bookingsInSlot.length;
  const remaining = Math.max(0, limit - occupiedSlots);

  return {
    available: remaining >= 1,
    remaining,
    limit,
  };
}

export function getAvailableBookingDays(config = DEFAULT_AGENDA_CONFIG, startDate = new Date()) {
  const days = [];
  const current = new Date(startDate);
  const limitDays = config?.antecedencia_maxima_dias ?? DEFAULT_AGENDA_CONFIG.antecedencia_maxima_dias;
  const workingDays = config?.dias_funcionamento ?? DEFAULT_AGENDA_CONFIG.dias_funcionamento;

  for (let i = 0; i < limitDays; i++) {
    if (workingDays.includes(current.getDay())) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function generateTimeSlots(startStr, endStr, intervalMinutes) {
  if (!startStr || !endStr || !intervalMinutes) return [];
  const [startH, startM] = String(startStr).split(':').map(Number);
  const [endH, endM] = String(endStr).split(':').map(Number);
  let startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  const step = parseInt(intervalMinutes, 10);

  if (!step || step <= 0 || startTotal >= endTotal) {
    return [];
  }

  const generated = [];
  const pad = (n) => String(n).padStart(2, '0');
  while (startTotal <= endTotal) {
    const h = Math.floor(startTotal / 60) % 24;
    const m = startTotal % 60;
    generated.push(`${pad(h)}:${pad(m)}`);
    startTotal += step;
  }
  return generated;
}

export function hasUnsavedConfigChanges(draft, saved) {
  if (!saved || !draft) return false;
  if ((draft.campo_observacoes_ativo ?? true) !== (saved.campo_observacoes_ativo ?? true)) {
    return true;
  }
  if ((draft.antecedencia_maxima_dias ?? 7) !== (saved.antecedencia_maxima_dias ?? 7)) {
    return true;
  }
  if ((draft.app_name || '') !== (saved.app_name || '')) return true;
  if ((draft.description || '') !== (saved.description || '')) return true;
  if ((draft.address || '') !== (saved.address || '')) return true;

  const draftPhone = draft.phone ? formatPhoneMask(draft.phone) : '';
  const savedPhone = saved.phone ? formatPhoneMask(saved.phone) : '';
  if (draftPhone !== savedPhone) return true;

  const draftPhone2 = draft.phone2 ? formatPhoneMask(draft.phone2) : '';
  const savedPhone2 = saved.phone2 ? formatPhoneMask(saved.phone2) : '';
  if (draftPhone2 !== savedPhone2) return true;

  if (
    JSON.stringify(draft.limites_customizados || {}) !==
    JSON.stringify(saved.limites_customizados || {})
  ) {
    return true;
  }

  const draftDays = [...(draft.dias_funcionamento || [])].sort();
  const savedDays = [...(saved.dias_funcionamento || [])].sort();
  if (draftDays.length !== savedDays.length) return true;
  for (let i = 0; i < draftDays.length; i++) {
    if (draftDays[i] !== savedDays[i]) return true;
  }

  const draftHours = [...(draft.horarios_disponiveis || [])].sort();
  const savedHours = [...(saved.horarios_disponiveis || [])].sort();
  if (draftHours.length !== savedHours.length) return true;
  for (let i = 0; i < draftHours.length; i++) {
    if (draftHours[i] !== savedHours[i]) return true;
  }

  return false;
}

// Tenta carregar status do banco pré-verificado do localStorage para carregamento instantâneo
if (hasLocalStorage()) {
  const cachedStatus = localStorage.getItem('supabase_db_status');
  if (cachedStatus) {
    useDatabase = cachedStatus === 'connected';
    isChecked = true;
  }
}

async function performDbCheck() {
  try {
    const { error } = await supabase.from('agendamentos_base').select('id').limit(1);
    if (
      error &&
      (error.message?.includes('Could not find the table') || error.code === 'PGRST205')
    ) {
      console.warn(
        "[API Service] Tabela 'agendamentos_base' não encontrada. Rodando em modo de simulação."
      );
      useDatabase = false;
      if (hasLocalStorage()) localStorage.setItem('supabase_db_status', 'mock');
    } else if (error) {
      console.error('[API Service] Erro ao testar Supabase:', error);
      useDatabase = false;
    } else {
      useDatabase = true;
      if (hasLocalStorage()) localStorage.setItem('supabase_db_status', 'connected');
    }
  } catch (err) {
    console.warn('[API Service] Falha na rede com Supabase. Usando localStorage.', err);
    useDatabase = false;
  } finally {
    isChecked = true;
  }
}

async function checkDb() {
  if (isChecked) {
    if (!dbCheckPromise) {
      dbCheckPromise = performDbCheck();
    }
    return;
  }

  if (!dbCheckPromise) {
    dbCheckPromise = performDbCheck();
  }
  return dbCheckPromise;
}

function initMockData() {
  if (!hasLocalStorage()) return;

  if (!localStorage.getItem('mock_agendamentos')) {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(
      'mock_agendamentos',
      JSON.stringify([
        {
          id: '1',
          clienteNome: 'Carlos Silva',
          dataHora: `${today}T19:30:00`,
          data: today,
          horario: '19:30',
          pessoas: 3,
          servicoNome: 'Reserva de Mesa',
          status: 'Confirmado',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          clienteNome: 'Mariana Souza',
          dataHora: `${today}T20:30:00`,
          data: today,
          horario: '20:30',
          pessoas: 2,
          servicoNome: 'Reserva de Mesa',
          status: 'Pendente',
          created_at: new Date().toISOString(),
        },
      ])
    );
  }

  if (!localStorage.getItem('mock_configuracao_agenda')) {
    localStorage.setItem('mock_configuracao_agenda', JSON.stringify(DEFAULT_AGENDA_CONFIG));
  }
}

initMockData();

export function isUsingDatabase() {
  return useDatabase;
}

/**
 * Obtém todos os agendamentos salvos (aplicando transição de status de 40 min de forma simétrica).
 */
export async function getAgendamentos() {
  await checkDb();
  const now = new Date();

  if (useDatabase) {
    const { data, error } = await supabase
      .from('agendamentos_base')
      .select(`
        id,
        inicio,
        status,
        criado_em,
        clientes (
          nome,
          telefone
        ),
        detalhes_agendamento_nicho (
          tipo_servico,
          num_pessoas,
          observacoes
        )
      `)
      .order('inicio', { ascending: false });

    if (!error && data) {
      const updates = [];

      const mapped = data.map((item) => {
        const nichoDet = Array.isArray(item.detalhes_agendamento_nicho)
          ? item.detalhes_agendamento_nicho[0]
          : item.detalhes_agendamento_nicho;

        let datePart = '';
        let timePart = '';
        if (item.inicio) {
          const parts = item.inicio.split(/T|\s/);
          datePart = parts[0] || '';
          if (parts[1]) {
            timePart = parts[1].slice(0, 5);
          }
        }

        const lifecycle = deriveBookingLifecycleStatus(item.status, item.inicio, now);
        if (lifecycle.changed) {
          updates.push({ id: item.id, status: lifecycle.status });
        }

        return {
          id: item.id,
          clienteNome: item.clientes?.nome || 'Cliente Desconhecido',
          cliente_nome: item.clientes?.nome || 'Cliente Desconhecido',
          clienteTelefone: item.clientes?.telefone || 'Sem telefone',
          cliente_telefone: item.clientes?.telefone || 'Sem telefone',
          observacoes: nichoDet?.observacoes || '',
          dataHora: `${datePart}T${timePart}:00`,
          data: datePart,
          horario: timePart,
          pessoas: nichoDet?.num_pessoas || 1,
          servicoNome: nichoDet?.tipo_servico || 'Reserva de Mesa',
          status: lifecycle.status,
          created_at: item.criado_em || `${datePart}T${timePart}:00`,
        };
      });

      if (updates.length > 0) {
        const finalizados = updates.filter((x) => x.status === 'Finalizado').map((x) => x.id);
        const emAndamento = updates.filter((x) => x.status === 'Em andamento').map((x) => x.id);

        (async () => {
          try {
            const promises = [];
            if (finalizados.length > 0) {
              promises.push(
                supabase
                  .from('agendamentos_base')
                  .update({ status: 'Finalizado' })
                  .in('id', finalizados)
              );
            }
            if (emAndamento.length > 0) {
              promises.push(
                supabase
                  .from('agendamentos_base')
                  .update({ status: 'Em andamento' })
                  .in('id', emAndamento)
              );
            }
            await Promise.all(promises);
          } catch (err) {
            console.error('Erro ao sincronizar status passados no Supabase:', err);
          }
        })();
      }

      return mapped;
    }
    console.error('Erro ao buscar agendamentos do Supabase:', error);
  }

  if (!hasLocalStorage()) return [];
  const rawList = JSON.parse(localStorage.getItem('mock_agendamentos') || '[]');
  let localChanged = false;
  const normalizedLocal = rawList.map((item) => {
    const inicioIso = item.dataHora || (item.data && item.horario ? `${item.data}T${item.horario}:00` : '');
    const lifecycle = deriveBookingLifecycleStatus(item.status, inicioIso, now);
    if (lifecycle.changed) {
      localChanged = true;
    }
    return {
      ...item,
      cliente_nome: item.cliente_nome || item.clienteNome || 'Cliente Desconhecido',
      clienteNome: item.clienteNome || item.cliente_nome || 'Cliente Desconhecido',
      status: lifecycle.status,
    };
  });

  if (localChanged) {
    localStorage.setItem('mock_agendamentos', JSON.stringify(normalizedLocal));
  }

  return normalizedLocal;
}

/**
 * Salva um novo agendamento.
 */
export async function createAgendamento(bookingData) {
  await checkDb();

  if (useDatabase) {
    try {
      const inicio = `${bookingData.date}T${bookingData.time}:00`;

      let [h, m] = bookingData.time.split(':').map(Number);
      h = (h + 1) % 24;
      const pad = (n) => String(n).padStart(2, '0');
      const fim = `${bookingData.date}T${pad(h)}:${pad(m)}:00`;

      let clienteId;

      const { data: clienteExistente, error: clientFindError } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefone', bookingData.phone)
        .maybeSingle();

      if (clientFindError) {
        console.error('[API Service] Erro ao buscar cliente:', clientFindError);
      }

      if (clienteExistente) {
        clienteId = clienteExistente.id;
      } else {
        const { data: novoCliente, error: clientInsertError } = await supabase
          .from('clientes')
          .insert({
            nome: bookingData.name,
            telefone: bookingData.phone,
          })
          .select('id')
          .single();

        if (clientInsertError) {
          throw clientInsertError;
        }
        clienteId = novoCliente.id;
      }

      const { data: novoAgendamento, error: bookingInsertError } = await supabase
        .from('agendamentos_base')
        .insert({
          cliente_id: clienteId,
          inicio: inicio,
          fim: fim,
          status: 'Agendado',
          valor_total: 0.0,
        })
        .select('id')
        .single();

      if (bookingInsertError) {
        throw bookingInsertError;
      }

      const { error: nichoInsertError } = await supabase
        .from('detalhes_agendamento_nicho')
        .insert({
          id_agendamento_base: novoAgendamento.id,
          tipo_servico: 'Reserva de Mesa',
          preco: 0.0,
          num_pessoas: parseInt(bookingData.guests, 10) || 2,
          observacoes: bookingData.notes || '',
        });

      if (nichoInsertError) {
        throw nichoInsertError;
      }

      return { success: true };
    } catch (err) {
      console.error('Erro ao salvar agendamento no Supabase:', err);
      throw err;
    }
  }

  const localList = hasLocalStorage()
    ? JSON.parse(localStorage.getItem('mock_agendamentos') || '[]')
    : [];
  const today = new Date().toISOString();
  const newBooking = {
    id: String(Date.now()),
    clienteNome: bookingData.name,
    cliente_nome: bookingData.name,
    clienteTelefone: bookingData.phone || 'Sem telefone',
    cliente_telefone: bookingData.phone || 'Sem telefone',
    observacoes: bookingData.notes || '',
    dataHora: `${bookingData.date}T${bookingData.time}:00`,
    data: bookingData.date,
    horario: bookingData.time,
    pessoas: parseInt(bookingData.guests, 10) || 2,
    servicoNome: 'Reserva de Mesa',
    status: 'Agendado',
    created_at: today,
  };
  localList.push(newBooking);
  if (hasLocalStorage()) {
    localStorage.setItem('mock_agendamentos', JSON.stringify(localList));
  }
  return { success: true, data: newBooking };
}

/**
 * Deleta um agendamento.
 */
export async function deleteAgendamento(id) {
  await checkDb();
  if (useDatabase) {
    const { error } = await supabase.from('agendamentos_base').delete().eq('id', id);
    if (!error) return { success: true };
    console.error('Erro ao deletar agendamento do Supabase:', error);
  }

  if (hasLocalStorage()) {
    const localList = JSON.parse(localStorage.getItem('mock_agendamentos') || '[]');
    const filtered = localList.filter((b) => b.id !== id);
    localStorage.setItem('mock_agendamentos', JSON.stringify(filtered));
  }
  return { success: true };
}

function mergeWithDefaultAgendaConfig(raw = {}, fallback = {}) {
  const getField = (key) => raw[key] ?? fallback[key] ?? DEFAULT_AGENDA_CONFIG[key];
  return {
    dias_funcionamento: getField('dias_funcionamento'),
    horarios_disponiveis: getField('horarios_disponiveis'),
    vagas_padrao: getField('vagas_padrao'),
    limites_customizados: getField('limites_customizados'),
    campo_observacoes_ativo: getField('campo_observacoes_ativo'),
    antecedencia_maxima_dias: getField('antecedencia_maxima_dias'),
    acessos_pagina_agenda:
      raw.acessos_pagina_agenda ??
      fallback.acessos_pagina_agenda ??
      (hasLocalStorage() ? parseInt(localStorage.getItem('mock_acessos_pagina_agenda'), 10) || 0 : 0),
    app_name: getField('app_name'),
    description: getField('description'),
    address: getField('address'),
    phone: getField('phone'),
    phone2: getField('phone2'),
    emoji_app: getField('emoji_app'),
    emoji_address: getField('emoji_address'),
    emoji_contact: getField('emoji_contact'),
  };
}

/**
 * Obtém as chaves e valores das configurações da agenda.
 */
export async function getAgendaConfig() {
  await checkDb();
  const localDefaults = hasLocalStorage()
    ? JSON.parse(localStorage.getItem('mock_configuracao_agenda') || '{}')
    : {};

  if (useDatabase) {
    const { data, error } = await supabase.from('configuracao_agenda').select('chave, valor');

    if (!error && data && data.length > 0) {
      const configs = {};
      data.forEach((item) => {
        configs[item.chave] = item.valor;
      });
      return mergeWithDefaultAgendaConfig(configs, localDefaults);
    }
  }

  return mergeWithDefaultAgendaConfig(localDefaults, DEFAULT_AGENDA_CONFIG);
}

/**
 * Salva as chaves e valores das configurações da agenda.
 */
export async function saveAgendaConfig(configs) {
  await checkDb();

  if (useDatabase) {
    let hasError = false;
    for (const [chave, valor] of Object.entries(configs)) {
      if (chave === 'acessos_pagina_agenda') continue;
      const { error } = await supabase
        .from('configuracao_agenda')
        .upsert({ chave, valor }, { onConflict: 'chave' });
      if (error) {
        console.error(`Erro ao salvar config '${chave}' no Supabase:`, error);
        hasError = true;
      }
    }
    if (!hasError) return { success: true };
  }

  if (hasLocalStorage()) {
    localStorage.setItem('mock_configuracao_agenda', JSON.stringify(configs));
  }
  return { success: true };
}

/**
 * Registra o acesso na página de agendamentos.
 */
export async function trackPageAccess() {
  await checkDb();
  if (useDatabase) {
    try {
      const { data } = await supabase
        .from('configuracao_agenda')
        .select('valor')
        .eq('chave', 'acessos_pagina_agenda')
        .maybeSingle();

      let currentVal = 0;
      if (data && data.valor !== undefined && data.valor !== null) {
        currentVal = parseInt(data.valor, 10) || 0;
      }

      await supabase.from('configuracao_agenda').upsert({
        chave: 'acessos_pagina_agenda',
        valor: currentVal + 1,
        atualizado_em: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Erro ao registrar acesso no banco de dados:', err);
    }
  } else if (hasLocalStorage()) {
    try {
      const mockAccesses = parseInt(localStorage.getItem('mock_acessos_pagina_agenda'), 10) || 0;
      localStorage.setItem('mock_acessos_pagina_agenda', String(mockAccesses + 1));
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * Inscreve um callback unificado para mudanças em tempo real (Supabase Realtime ou evento `storage` local).
 */
export function subscribeToBookings({ onChanges, enabledDb = useDatabase } = {}) {
  let channel = null;

  if (enabledDb) {
    channel = supabase
      .channel('admin-bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agendamentos_base',
        },
        async (payload) => {
          const updatedBookings = await getAgendamentos();
          if (onChanges) {
            await onChanges({
              source: 'supabase',
              eventType: payload.eventType,
              newRecord: payload.new,
              oldRecord: payload.old,
              bookings: updatedBookings,
            });
          }
        }
      )
      .subscribe();
  }

  const handleStorageChange = async (e) => {
    if (e.key === 'mock_agendamentos') {
      const updatedBookings = await getAgendamentos();
      const localList = JSON.parse(e.newValue || '[]');
      const last = localList.length > 0 ? localList[localList.length - 1] : null;
      if (onChanges) {
        await onChanges({
          source: 'storage',
          eventType: 'INSERT',
          newRecord: last,
          oldRecord: null,
          bookings: updatedBookings,
        });
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageChange);
  }

  return () => {
    if (channel) {
      supabase.removeChannel(channel);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageChange);
    }
  };
}
