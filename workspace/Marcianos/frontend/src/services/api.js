import { supabase } from '../lib/supabase';

let useDatabase = true;
let isChecked = false;

// Helper para verificar se as tabelas existem no Supabase
async function checkDb() {
  if (isChecked) return;
  try {
    const { error } = await supabase.from('agendamentos').select('id').limit(1);
    if (error && (error.message?.includes("Could not find the table") || error.code === 'PGRST205')) {
      console.warn("[API Service] Tabela 'agendamentos' não encontrada. Rodando em modo de simulação com localStorage.");
      useDatabase = false;
    } else if (error) {
      console.error("[API Service] Erro ao testar Supabase:", error);
      useDatabase = false;
    } else {
      console.log("[API Service] Conectado ao Supabase com sucesso.");
      useDatabase = true;
    }
  } catch (err) {
    console.warn("[API Service] Falha na conexão com Supabase. Usando localStorage de fallback.", err);
    useDatabase = false;
  }
  isChecked = true;
}

// Inicializa dados de simulação no localStorage se vazios
function initMockData() {
  if (!localStorage.getItem('mock_agendamentos')) {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('mock_agendamentos', JSON.stringify([
      {
        id: '1',
        cliente_nome: 'Carlos Silva',
        cliente_telefone: '(51) 99888-7766',
        data: today,
        horario: '19:30',
        pessoas: 3,
        observacoes: 'Mesa perto do boliche, por favor.',
        status: 'Confirmado',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        cliente_nome: 'Mariana Souza',
        cliente_telefone: '(51) 99777-6655',
        data: today,
        horario: '20:30',
        pessoas: 2,
        observacoes: 'Aniversariante do dia.',
        status: 'Pendente',
        created_at: new Date().toISOString()
      }
    ]));
  }

  if (!localStorage.getItem('mock_configuracao_agenda')) {
    localStorage.setItem('mock_configuracao_agenda', JSON.stringify({
      dias_funcionamento: [2, 3, 4, 5, 6, 0], // Terça a Domingo
      horarios_disponiveis: ["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"],
      vagas_padrao: 5,
      limites_customizados: {} // { "2026-06-29": { "19:00": 2 } }
    }));
  }
}

initMockData();

/**
 * Retorna se o app está usando o Supabase ou se está no fallback local.
 */
export function isUsingDatabase() {
  return useDatabase;
}

/**
 * Obtém todos os agendamentos salvos.
 */
export async function getAgendamentos() {
  await checkDb();
  if (useDatabase) {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .order('data', { ascending: true })
      .order('horario', { ascending: true });
    
    if (!error) return data || [];
    console.error("Erro ao buscar agendamentos do Supabase:", error);
  }
  
  return JSON.parse(localStorage.getItem('mock_agendamentos') || '[]');
}

/**
 * Salva um novo agendamento.
 */
export async function createAgendamento(bookingData) {
  await checkDb();
  
  const payload = {
    cliente_nome: bookingData.name,
    cliente_telefone: bookingData.phone,
    data: bookingData.date,
    horario: bookingData.time,
    pessoas: parseInt(bookingData.guests) || 1,
    observacoes: bookingData.notes || '',
    status: 'Confirmado'
  };

  if (useDatabase) {
    const { data, error } = await supabase
      .from('agendamentos')
      .insert([payload])
      .select();
    
    if (!error) return { success: true, data: data[0] };
    console.error("Erro ao inserir agendamento no Supabase:", error);
  }

  // Fallback Local
  const localList = JSON.parse(localStorage.getItem('mock_agendamentos') || '[]');
  const newBooking = {
    id: String(Date.now()),
    ...payload,
    created_at: new Date().toISOString()
  };
  localList.push(newBooking);
  localStorage.setItem('mock_agendamentos', JSON.stringify(localList));
  return { success: true, data: newBooking };
}

/**
 * Deleta um agendamento.
 */
export async function deleteAgendamento(id) {
  await checkDb();
  if (useDatabase) {
    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', id);
    if (!error) return { success: true };
    console.error("Erro ao deletar agendamento do Supabase:", error);
  }

  const localList = JSON.parse(localStorage.getItem('mock_agendamentos') || '[]');
  const filtered = localList.filter(b => b.id !== id);
  localStorage.setItem('mock_agendamentos', JSON.stringify(filtered));
  return { success: true };
}

/**
 * Obtém as chaves e valores das configurações da agenda.
 */
export async function getAgendaConfig() {
  await checkDb();
  if (useDatabase) {
    const { data, error } = await supabase
      .from('configuracao_agenda')
      .select('chave, valor');
    
    if (!error && data && data.length > 0) {
      // Mapeia chaves para um objeto central
      const configs = {};
      data.forEach(item => {
        configs[item.chave] = item.valor;
      });
      
      // Garante fallbacks para chaves ausentes
      const defaultConfigs = JSON.parse(localStorage.getItem('mock_configuracao_agenda'));
      return {
        dias_funcionamento: configs.dias_funcionamento ?? defaultConfigs.dias_funcionamento,
        horarios_disponiveis: configs.horarios_disponiveis ?? defaultConfigs.horarios_disponiveis,
        vagas_padrao: configs.vagas_padrao ?? defaultConfigs.vagas_padrao,
        limites_customizados: configs.limites_customizados ?? defaultConfigs.limites_customizados,
      };
    }
  }

  return JSON.parse(localStorage.getItem('mock_configuracao_agenda'));
}

/**
 * Salva as chaves e valores das configurações da agenda.
 */
export async function saveAgendaConfig(configs) {
  await checkDb();
  
  if (useDatabase) {
    let hasError = false;
    for (const [chave, valor] of Object.entries(configs)) {
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

  // Fallback Local
  localStorage.setItem('mock_configuracao_agenda', JSON.stringify(configs));
  return { success: true };
}
