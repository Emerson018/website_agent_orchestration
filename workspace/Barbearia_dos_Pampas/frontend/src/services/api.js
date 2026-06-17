import { supabase } from '../lib/supabase';

/**
 * Obtém a lista de agendamentos salvos.
 * Retorna um array vazio simulado por enquanto.
 */
export async function getAgendamentos() {
  console.log('[API Service] Carregando lista de agendamentos...');
  return [
    {
      id: '1',
      clienteNome: 'Carlos Silva',
      dataHora: '2026-06-08T10:00:00-03:00',
      servicoNome: 'Corte de Cabelo Degradê',
      status: 'Confirmado'
    },
    {
      id: '2',
      clienteNome: 'Mariana Souza',
      dataHora: '2026-06-08T14:30:00-03:00',
      servicoNome: 'Barba Terapia',
      status: 'Pendente'
    },
    {
      id: '3',
      clienteNome: 'Ricardo Oliveira',
      dataHora: '2026-06-09T09:15:00-03:00',
      servicoNome: 'Combo Cabelo + Barba + Sobrancelha',
      status: 'Confirmado'
    }
  ];
}

/**
 * Cria um novo agendamento com os dados especificados.
 * Exibe no console para depuração e simulação.
 */
export async function createAgendamento(data) {
  console.log('[API Service] Solicitando criação de agendamento com dados:', data);
  return { success: true, data };
}
