import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { promises as fs } from 'fs';
import path from 'path';
import LogoutButton from '@/components/LogoutButton';
import { Calendar, User, Phone, Mail, Clock, ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getConfig() {
  try {
    const configPath = path.join(process.cwd(), 'ai_config.json');
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return {
      app_name: 'Agendador PWA',
      primary_color: '#4F46E5',
      secondary_color: '#10B981',
    };
  }
}

export default async function AdminDashboard() {
  const config = await getConfig();
  const supabase = await createClient();

  // Verifica a sessão do usuário
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  // Consulta os agendamentos da tabela agendamentos_base com JOIN em clientes
  let bookings: any[] = [];
  let dbError = null;

  try {
    const { data, error } = await supabase
      .from('agendamentos_base')
      .select(`
        id,
        inicio,
        fim,
        status,
        valor_total,
        clientes (
          nome,
          telefone,
          email
        )
      `)
      .order('inicio', { ascending: true });

    if (error) {
      dbError = error;
    } else {
      bookings = data || [];
    }
  } catch (err: any) {
    dbError = err;
  }

  // KPIs
  const totalAgendamentos = bookings.length;
  const totalConfirmados = bookings.filter((b) => b.status === 'confirmado' || b.status === 'Confirmado').length;
  const totalPendentes = bookings.filter((b) => b.status === 'pendente' || b.status === 'Pendente').length;
  const totalCancelados = bookings.filter((b) => b.status === 'cancelado' || b.status === 'Cancelado').length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      
      {/* Header */}
      <header 
        className="px-6 py-4 flex items-center justify-between shadow-sm border-b border-gray-150 text-white"
        style={{ backgroundColor: config.primary_color }}
      >
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center font-bold">
            A
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">Painel Admin</h1>
            <p className="text-[10px] text-white/80">{config.app_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium opacity-90 hidden sm:inline">
            {user.email}
          </span>
          <LogoutButton />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Painel de Controle e KPIs
          </h2>
          <p className="text-xs text-gray-550 mt-1">
            Monitore a agenda e analise as métricas de atendimento em tempo real.
          </p>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* Card Total */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total</span>
            <span className="text-3xl font-extrabold text-gray-900 mt-2">{totalAgendamentos}</span>
          </div>

          {/* Card Confirmados */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-500">Confirmados</span>
            <span className="text-3xl font-extrabold text-green-600 mt-2">{totalConfirmados}</span>
          </div>

          {/* Card Pendentes */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Pendentes</span>
            <span className="text-3xl font-extrabold text-amber-600 mt-2">{totalPendentes}</span>
          </div>

          {/* Card Cancelados */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Cancelados</span>
            <span className="text-3xl font-extrabold text-red-500 mt-2">{totalCancelados}</span>
          </div>
        </div>

        {/* Database Error Warning */}
        {dbError && (
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5 flex gap-4">
            <ShieldAlert className="size-6 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-900">Configuração de Banco de Dados Pendente</h4>
              <p className="text-xs text-amber-700 leading-relaxed">
                Não foi possível ler os agendamentos. Isso ocorre porque o banco de dados do inquilino ainda não foi inicializado.
                Vá até o painel do Lead no CRM e execute o <strong>Deploy do Banco de Dados</strong> para criar as tabelas do agendador.
              </p>
            </div>
          </div>
        )}

        {/* Bookings Section */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-3xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">
              Fila de Agendamentos (Tabela: agendamentos_base)
            </h3>
          </div>

          <div className="divide-y divide-gray-100 overflow-x-auto">
            {!dbError && bookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">
                Nenhum agendamento encontrado no banco de dados.
              </div>
            ) : (
              bookings.map((booking) => {
                const clientName = booking.clientes?.nome || 'Cliente Anônimo';
                const clientPhone = booking.clientes?.telefone || 'Sem telefone';
                const clientEmail = booking.clientes?.email || 'Sem e-mail';
                const start = new Date(booking.inicio).toLocaleString('pt-BR');
                const end = new Date(booking.fim).toLocaleString('pt-BR');

                return (
                  <div key={booking.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                    <div className="space-y-3">
                      {/* Client Info */}
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-700 font-semibold">
                          <User className="size-3.5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{clientName}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Phone className="size-3" /> {clientPhone}
                            </span>
                            {clientEmail && (
                              <span className="flex items-center gap-1">
                                <Mail className="size-3" /> {clientEmail}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium sm:text-right shrink-0">
                      {/* Date details */}
                      <div className="space-y-1 text-gray-500">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Calendar className="size-3.5" />
                          <span>Início: {start}</span>
                        </div>
                        <div className="flex items-center gap-1.5 justify-end">
                          <Clock className="size-3.5" />
                          <span>Fim: {end}</span>
                        </div>
                      </div>

                      {/* Status and Price */}
                      <div className="flex flex-col items-end gap-1.5">
                        <span 
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                            booking.status?.toLowerCase() === 'confirmado'
                              ? 'bg-green-50 text-green-600 border border-green-150'
                              : booking.status?.toLowerCase() === 'pendente'
                              ? 'bg-amber-50 text-amber-600 border border-amber-150'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          {booking.status || 'Confirmado'}
                        </span>
                        {booking.valor_total && (
                          <span className="font-bold text-gray-900">
                            R$ {parseFloat(booking.valor_total).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
