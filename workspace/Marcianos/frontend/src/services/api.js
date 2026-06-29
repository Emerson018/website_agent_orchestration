import { supabase } from '../lib/supabase';

let useDatabase = true;
let isChecked = false;
let dbCheckPromise = null;

// Tenta carregar status do banco pré-verificado do localStorage para carregamento instantâneo
if (typeof window !== 'undefined') {
  const cachedStatus = localStorage.getItem('supabase_db_status');
  if (cachedStatus) {
    useDatabase = cachedStatus === 'connected';
    isChecked = true;
  }
}

async function performDbCheck() {
  try {
    const { error } = await supabase.from('agendamentos_base').select('id').limit(1);
    if (error && (error.message?.includes("Could not find the table") || error.code === 'PGRST205')) {
      console.warn("[API Service] Tabela 'agendamentos_base' não encontrada. Rodando em modo de simulação.");
      useDatabase = false;
      localStorage.setItem('supabase_db_status', 'mock');
    } else if (error) {
      console.error("[API Service] Erro ao testar Supabase:", error);
      useDatabase = false;
    } else {
      useDatabase = true;
      localStorage.setItem('supabase_db_status', 'connected');
    }
  } catch (err) {
    console.warn("[API Service] Falha na rede com Supabase. Usando localStorage.", err);
    useDatabase = false;
  } finally {
    isChecked = true;
  }
}

// Helper para verificar se as tabelas existem no Supabase (Deduplicado e Cacheado)
async function checkDb() {
  if (isChecked) {
    // Se já checado, atualiza em background silenciosamente se ainda não houver promise ativa
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

// Inicializa dados de simulação no localStorage se vazios
function initMockData() {
  if (!localStorage.getItem('mock_agendamentos')) {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('mock_agendamentos', JSON.stringify([
      {
        id: '1',
        clienteNome: 'Carlos Silva',
        dataHora: `${today}T19:30:00`,
        data: today,
        horario: '19:30',
        pessoas: 3,
        servicoNome: 'Reserva de Mesa',
        status: 'Confirmado',
        created_at: new Date().toISOString()
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
        created_at: new Date().toISOString()
      }
    ]));
  }

  if (!localStorage.getItem('mock_configuracao_agenda')) {
    localStorage.setItem('mock_configuracao_agenda', JSON.stringify({
      dias_funcionamento: [2, 3, 4, 5, 6, 0], // Terça a Domingo
      horarios_disponiveis: ["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"],
      vagas_padrao: 5,
      limites_customizados: {}
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
      .from('agendamentos_base')
      .select(`
        id,
        inicio,
        status,
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
      return data.map(item => {
        const nichoDet = Array.isArray(item.detalhes_agendamento_nicho)
          ? item.detalhes_agendamento_nicho[0]
          : item.detalhes_agendamento_nicho;

        // Extrai data (YYYY-MM-DD) e horário (HH:MM) a partir de inicio de forma direta para evitar desvios de fuso horário
        let datePart = '';
        let timePart = '';
        if (item.inicio) {
          const parts = item.inicio.split(/T|\s/);
          datePart = parts[0] || '';
          if (parts[1]) {
            timePart = parts[1].slice(0, 5);
          }
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
          status: item.status || 'Confirmado'
        };
      });
    }
    console.error("Erro ao buscar agendamentos do Supabase:", error);
  }
  
  return JSON.parse(localStorage.getItem('mock_agendamentos') || '[]');
}

/**
 * Salva um novo agendamento.
 */
export async function createAgendamento(bookingData) {
  await checkDb();
  
  if (useDatabase) {
    try {
      // Salva data e horário local diretamente sem conversão de fuso horário para evitar desvios
      const inicio = `${bookingData.date}T${bookingData.time}:00`;
      
      let [h, m] = bookingData.time.split(':').map(Number);
      h = (h + 1) % 24;
      const pad = (n) => String(n).padStart(2, '0');
      const fim = `${bookingData.date}T${pad(h)}:${pad(m)}:00`;

      let clienteId;

      // Busca se o cliente já existe pelo telefone
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
        // Cria novo cliente
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

      // Cria o agendamento base
      const { data: novoAgendamento, error: bookingInsertError } = await supabase
        .from('agendamentos_base')
        .insert({
          cliente_id: clienteId,
          inicio: inicio,
          fim: fim,
          status: 'Confirmado',
          valor_total: 0.00
        })
        .select('id')
        .single();

      if (bookingInsertError) {
        throw bookingInsertError;
      }

      // Cria os detalhes do nicho
      const { error: nichoInsertError } = await supabase
        .from('detalhes_agendamento_nicho')
        .insert({
          id_agendamento_base: novoAgendamento.id,
          tipo_servico: 'Reserva de Mesa',
          preco: 0.00,
          num_pessoas: parseInt(bookingData.guests) || 2,
          observacoes: bookingData.notes || ''
        });

      if (nichoInsertError) {
        throw nichoInsertError;
      }

      return { success: true };
    } catch (err) {
      console.error("Erro ao salvar agendamento no Supabase:", err);
      throw err;
    }
  }

  // Fallback Local
  const localList = JSON.parse(localStorage.getItem('mock_agendamentos') || '[]');
  const today = new Date().toISOString();
  const newBooking = {
    id: String(Date.now()),
    clienteNome: bookingData.name,
    dataHora: `${bookingData.date}T${bookingData.time}:00`,
    data: bookingData.date,
    horario: bookingData.time,
    pessoas: parseInt(bookingData.guests) || 2,
    servicoNome: 'Reserva de Mesa',
    status: 'Confirmado',
    created_at: today
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
      .from('agendamentos_base')
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
      const configs = {};
      data.forEach(item => {
        configs[item.chave] = item.valor;
      });
      
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
