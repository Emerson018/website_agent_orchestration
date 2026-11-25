import { supabase } from '../lib/supabase';
import { GRUPO_GRANDE, STATUS, normalizeStatus } from './agenda';

// O app usa as tabelas do Supabase quando existem; senão guarda tudo no navegador (modo local).
let useDatabase = true;
let isChecked = false;
let dbCheckPromise = null;

if (typeof window !== 'undefined') {
  const cachedStatus = localStorage.getItem('supabase_db_status');
  if (cachedStatus) {
    useDatabase = cachedStatus === 'connected';
    isChecked = true;
  }
}

async function performDbCheck() {
  try {
    // Sem resposta em 3s (sem internet, endereço errado), segue no modo local nesta visita
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase não respondeu em 3s')), 3000));
    const { error } = await Promise.race([supabase.from('agendamentos_base').select('id').limit(1), timeout]);
    if (error && (error.message?.includes('Could not find the table') || error.code === 'PGRST205')) {
      console.warn("[API] Tabela 'agendamentos_base' não encontrada. Usando o modo local.");
      useDatabase = false;
      localStorage.setItem('supabase_db_status', 'mock');
    } else if (error) {
      console.error('[API] Erro ao testar o Supabase:', error);
      useDatabase = false;
    } else {
      useDatabase = true;
      localStorage.setItem('supabase_db_status', 'connected');
    }
  } catch (err) {
    console.warn('[API] Sem conexão com o Supabase. Usando o modo local.', err);
    useDatabase = false;
  } finally {
    isChecked = true;
  }
}

async function checkDb() {
  if (!dbCheckPromise) dbCheckPromise = performDbCheck();
  // Com o resultado em cache, responde na hora e revalida em segundo plano
  if (isChecked) return;
  return dbCheckPromise;
}

export function isUsingDatabase() {
  return useDatabase;
}

// ---------- Modo local ----------

const MOCK_BOOKINGS = 'mock_agendamentos';
const MOCK_CONFIG = 'mock_configuracao_agenda';

const DEFAULT_CONFIG = {
  dias_funcionamento: [2, 3, 4, 5, 6, 0], // Terça a domingo (0 = domingo)
  horarios_disponiveis: ['18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'],
  vagas_padrao: 5, // Reservas (mesas) por horário; cada reserva ocupa 1 vaga, qualquer que seja o grupo
  limites_customizados: {}, // { 'AAAA-MM-DD': { 'HH:MM': vagas } }, 0 = bloqueado
  campo_observacoes_ativo: true,
  antecedencia_maxima_dias: 7,
  acessos_pagina_agenda: 0,
  app_name: 'Marcianos',
  description: 'O maior rodízio de mini burgers do universo, com boliche e diversão garantida para toda a família!',
  address: 'Av. Padre Cacique, 580 - Menino Deus - Porto Alegre/RS',
  phone: '(51) 99523-9876',
  phone2: '',
};

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function seedLocal() {
  if (!localStorage.getItem(MOCK_BOOKINGS)) {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    localStorage.setItem(
      MOCK_BOOKINGS,
      JSON.stringify([
        { id: '1', nome: 'Carlos Silva', telefone: '(51) 99876-1234', data: key, horario: '19:30', pessoas: 3, observacoes: '', status: STATUS.CONFIRMADA, criadoEm: today.toISOString() },
        { id: '2', nome: 'Mariana Souza', telefone: '(51) 98123-4567', data: key, horario: '20:30', pessoas: 7, observacoes: 'Aniversário da Júlia', status: STATUS.PRE_RESERVA, criadoEm: today.toISOString() },
      ])
    );
  }
  if (!localStorage.getItem(MOCK_CONFIG)) {
    localStorage.setItem(MOCK_CONFIG, JSON.stringify(DEFAULT_CONFIG));
  }
}

if (typeof window !== 'undefined') seedLocal();

/** Uma reserva sempre no mesmo formato, venha do Supabase ou do modo local. */
function normalizeLocal(raw) {
  return {
    id: String(raw.id),
    nome: raw.nome || raw.clienteNome || raw.cliente_nome || '',
    telefone: raw.telefone || raw.clienteTelefone || raw.cliente_telefone || '',
    data: raw.data || (raw.dataHora || '').slice(0, 10),
    horario: raw.horario || (raw.dataHora || '').slice(11, 16),
    pessoas: Number(raw.pessoas) || 1,
    observacoes: raw.observacoes || '',
    status: normalizeStatus(raw.status),
    criadoEm: raw.criadoEm || raw.created_at || new Date().toISOString(),
  };
}

function normalizeDb(item) {
  const detail = Array.isArray(item.detalhes_agendamento_nicho)
    ? item.detalhes_agendamento_nicho[0]
    : item.detalhes_agendamento_nicho;
  // "inicio" vem como data e hora locais; corta o texto para não sofrer com fuso horário
  const [datePart = '', timePart = ''] = String(item.inicio || '').split(/T|\s/);
  return {
    id: String(item.id),
    nome: item.clientes?.nome || '',
    telefone: item.clientes?.telefone || '',
    data: datePart,
    horario: timePart.slice(0, 5),
    pessoas: Number(detail?.num_pessoas) || 1,
    observacoes: detail?.observacoes || '',
    status: normalizeStatus(item.status),
    criadoEm: item.criado_em || `${datePart}T${timePart}`,
  };
}

// ---------- Reservas ----------

export async function getAgendamentos() {
  await checkDb();
  if (useDatabase) {
    const { data, error } = await supabase
      .from('agendamentos_base')
      .select('id, inicio, status, criado_em, clientes ( nome, telefone ), detalhes_agendamento_nicho ( num_pessoas, observacoes )')
      .order('inicio', { ascending: true });
    if (!error && data) return data.map(normalizeDb);
    console.error('[API] Erro ao buscar reservas no Supabase:', error);
  }
  return readLocal(MOCK_BOOKINGS, []).map(normalizeLocal);
}

/**
 * Ocupação para a página pública: só data, horário, pessoas e status.
 * Nunca traz nome nem telefone de outros clientes.
 */
export async function getOcupacao() {
  await checkDb();
  if (useDatabase) {
    const { data, error } = await supabase
      .from('agendamentos_base')
      .select('id, inicio, status, detalhes_agendamento_nicho ( num_pessoas )')
      .gte('inicio', new Date().toISOString().slice(0, 10));
    if (!error && data) {
      return data.map((item) => {
        const { id, data: dia, horario, pessoas, status } = normalizeDb(item);
        return { id, data: dia, horario, pessoas, status };
      });
    }
    console.error('[API] Erro ao buscar a ocupação no Supabase:', error);
  }
  return readLocal(MOCK_BOOKINGS, []).map((raw) => {
    const { id, data, horario, pessoas, status } = normalizeLocal(raw);
    return { id, data, horario, pessoas, status };
  });
}

/**
 * Cria a reserva. Grupos a partir de GRUPO_GRANDE pessoas viram pré-reserva.
 * @param {{name: string, phone: string, guests: number, date: string, time: string, notes?: string}} input
 */
export async function createAgendamento(input) {
  await checkDb();
  const pessoas = Number(input.guests) || 1;
  const status = pessoas >= GRUPO_GRANDE ? STATUS.PRE_RESERVA : STATUS.CONFIRMADA;

  if (useDatabase) {
    const inicio = `${input.date}T${input.time}:00`;
    const [h, m] = input.time.split(':').map(Number);
    const fim = `${input.date}T${String((h + 2) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;

    const { data: existing } = await supabase.from('clientes').select('id').eq('telefone', input.phone).maybeSingle();
    let clienteId = existing?.id;
    if (!clienteId) {
      const { data: created, error } = await supabase
        .from('clientes')
        .insert({ nome: input.name, telefone: input.phone })
        .select('id')
        .single();
      if (error) throw error;
      clienteId = created.id;
    }

    const { data: booking, error: bookingError } = await supabase
      .from('agendamentos_base')
      .insert({ cliente_id: clienteId, inicio, fim, status, valor_total: 0 })
      .select('id')
      .single();
    if (bookingError) throw bookingError;

    const { error: detailError } = await supabase.from('detalhes_agendamento_nicho').insert({
      id_agendamento_base: booking.id,
      tipo_servico: 'Reserva de Mesa',
      preco: 0,
      num_pessoas: pessoas,
      observacoes: input.notes || '',
    });
    if (detailError) throw detailError;

    return { success: true, data: { id: String(booking.id), status } };
  }

  const list = readLocal(MOCK_BOOKINGS, []);
  const booking = {
    id: String(Date.now()),
    nome: input.name,
    telefone: input.phone,
    data: input.date,
    horario: input.time,
    pessoas,
    observacoes: input.notes || '',
    status,
    criadoEm: new Date().toISOString(),
  };
  list.push(booking);
  localStorage.setItem(MOCK_BOOKINGS, JSON.stringify(list));
  return { success: true, data: booking };
}

/** Muda o status de uma reserva. Cancelar também passa por aqui: nada é apagado. */
export async function updateAgendamentoStatus(id, status) {
  await checkDb();
  if (useDatabase) {
    const { error } = await supabase.from('agendamentos_base').update({ status }).eq('id', id);
    if (error) throw error;
    return { success: true };
  }
  const list = readLocal(MOCK_BOOKINGS, []).map((b) => (String(b.id) === String(id) ? { ...b, status } : b));
  localStorage.setItem(MOCK_BOOKINGS, JSON.stringify(list));
  return { success: true };
}

/** Escuta mudanças nas reservas em tempo real (só com o Supabase). Devolve a função que para de escutar. */
export function subscribeAgendamentos(onChange) {
  if (!useDatabase) return () => {};
  const channel = supabase
    .channel('marcianos-reservas')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos_base' }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ---------- Configuração ----------

export async function getAgendaConfig() {
  await checkDb();
  const local = { ...DEFAULT_CONFIG, ...readLocal(MOCK_CONFIG, {}) };
  if (useDatabase) {
    const { data, error } = await supabase.from('configuracao_agenda').select('chave, valor');
    if (!error && data && data.length > 0) {
      const fromDb = Object.fromEntries(data.map((row) => [row.chave, row.valor]));
      return { ...local, ...fromDb };
    }
  }
  return local;
}

export async function saveAgendaConfig(configs) {
  await checkDb();
  if (useDatabase) {
    const rows = Object.entries(configs)
      .filter(([chave]) => chave !== 'acessos_pagina_agenda') // o contador não é editado aqui
      .map(([chave, valor]) => ({ chave, valor }));
    const { error } = await supabase.from('configuracao_agenda').upsert(rows, { onConflict: 'chave' });
    if (error) throw error;
    return { success: true };
  }
  localStorage.setItem(MOCK_CONFIG, JSON.stringify({ ...readLocal(MOCK_CONFIG, {}), ...configs }));
  return { success: true };
}

/** Conta uma visita à página de reservas. */
export async function trackPageAccess() {
  await checkDb();
  try {
    if (useDatabase) {
      const { data } = await supabase.from('configuracao_agenda').select('valor').eq('chave', 'acessos_pagina_agenda').maybeSingle();
      const next = (parseInt(data?.valor, 10) || 0) + 1;
      await supabase.from('configuracao_agenda').upsert({ chave: 'acessos_pagina_agenda', valor: next }, { onConflict: 'chave' });
    } else {
      const cfg = readLocal(MOCK_CONFIG, {});
      localStorage.setItem(MOCK_CONFIG, JSON.stringify({ ...cfg, acessos_pagina_agenda: (cfg.acessos_pagina_agenda || 0) + 1 }));
    }
  } catch (err) {
    console.error('[API] Erro ao contar o acesso:', err);
  }
}
