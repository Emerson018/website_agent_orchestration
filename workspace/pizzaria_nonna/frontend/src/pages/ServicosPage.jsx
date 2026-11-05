import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchServicos } from '../services/tenantApi';

export default function ServicosPage() {
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServicos().then((data) => {
      setServicos(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-color,#F5F4F0)]">Nossos Serviços</h1>
          <p className="text-sm text-[var(--muted-color,#A8A29E)] mt-1">Conheça nossos procedimentos e reserve seu horário online</p>
        </div>
        <Link
          to="/agendar"
          className="px-5 py-2.5 rounded-xl font-medium bg-[var(--primary-color,#D4AF37)] text-black hover:opacity-90 transition shadow-lg"
        >
          Agendar Horário 📅
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--muted-color,#A8A29E)]">Carregando serviços...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {servicos.map((servico, idx) => (
            <div
              key={servico.id || idx}
              className="p-5 rounded-2xl bg-[var(--surface-color,#181614)] border border-[var(--border-color,#26221F)] flex justify-between items-center hover:border-[var(--primary-color,#D4AF37)]/40 transition"
            >
              <div>
                <span className="text-xs uppercase font-semibold text-[var(--primary-color,#D4AF37)] tracking-wider">
                  {servico.categoria || 'Geral'}
                </span>
                <h3 className="text-lg font-semibold text-[var(--text-color,#F5F4F0)] mt-0.5">{servico.nome}</h3>
                <p className="text-xs text-[var(--muted-color,#A8A29E)] mt-1">
                  Duração estimada: {servico.duracao_minutos || 30} min
                </p>
                <div className="text-base font-bold text-[var(--text-color,#F5F4F0)] mt-2">
                  R$ {Number(servico.preco).toFixed(2)}
                </div>
              </div>
              <Link
                to="/agendar"
                state={{ servicoSelecionado: servico.nome }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-color,#181614)] border border-[var(--primary-color,#D4AF37)] text-[var(--primary-color,#D4AF37)] hover:bg-[var(--primary-color,#D4AF37)] hover:text-black transition"
              >
                Escolher
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
