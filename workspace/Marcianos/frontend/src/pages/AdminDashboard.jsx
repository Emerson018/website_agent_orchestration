import React, { useEffect, useState } from 'react';
import { getAgendamentos } from '../services/api';
import BookingTable from '../components/BookingTable';

function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getAgendamentos();
        setBookings(data);
      } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Cálculos dinâmicos para os KPIs
  const totalAgendamentos = bookings.length;
  const totalConfirmados = bookings.filter((b) => b.status === 'Confirmado').length;
  const totalPendentes = bookings.filter((b) => b.status === 'Pendente').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 font-medium animate-pulse">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Painel de Controle e KPIs</h2>
        <p className="mt-1 text-sm text-gray-550">Monitore os agendamentos e analise métricas em tempo real.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* Total Card */}
        <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 p-6 flex flex-col justify-between">
          <span className="text-sm font-semibold text-gray-500">Total de Agendamentos</span>
          <span className="mt-2 text-4xl font-extrabold text-gray-900 tracking-tight">{totalAgendamentos}</span>
        </div>

        {/* Confirmados Card */}
        <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 p-6 flex flex-col justify-between">
          <span className="text-sm font-semibold text-gray-500">Confirmados</span>
          <span className="mt-2 text-4xl font-extrabold text-green-600 tracking-tight">{totalConfirmados}</span>
        </div>

        {/* Pendentes Card */}
        <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 p-6 flex flex-col justify-between">
          <span className="text-sm font-semibold text-gray-500">Pendentes</span>
          <span className="mt-2 text-4xl font-extrabold text-yellow-600 tracking-tight">{totalPendentes}</span>
        </div>
      </div>

      {/* Booking Table Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900">Fila de Agendamentos</h3>
        <BookingTable bookings={bookings} />
      </div>
    </div>
  );
}

export default AdminDashboard;
