import React from 'react';

function BookingTable({ bookings }) {
  const formatDateTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return isoString;
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm bg-white mt-6">
      <table className="min-w-full divide-y divide-gray-100 text-left text-sm text-gray-500">
        <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-700 tracking-wider">
          <tr>
            <th className="px-6 py-4">Cliente</th>
            <th className="px-6 py-4">Data/Hora</th>
            <th className="px-6 py-4">Serviço</th>
            <th className="px-6 py-4 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-gray-900 font-medium">
          {bookings && bookings.length > 0 ? (
            bookings.map((booking) => {
              const isConfirmado = booking.status === 'Confirmado';
              return (
                <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">{booking.clienteNome}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-normal">
                    {formatDateTime(booking.dataHora)}
                  </td>
                  <td className="px-6 py-4 text-gray-700">{booking.servicoNome}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                        isConfirmado
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center text-gray-400 font-normal">
                Nenhum agendamento encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default BookingTable;
