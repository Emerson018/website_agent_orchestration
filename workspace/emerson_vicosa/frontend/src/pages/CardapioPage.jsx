import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchCardapio } from '../services/tenantApi';

export default function CardapioPage() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');
  const [carrinho, setCarrinho] = useState([]);

  useEffect(() => {
    fetchCardapio().then((data) => {
      setItens(data);
      setLoading(false);
    });
  }, []);

  const categorias = ['Todas', ...new Set(itens.map((i) => i.categoria).filter(Boolean))];

  const itensFiltrados = categoriaAtiva === 'Todas'
    ? itens
    : itens.filter((i) => i.categoria === categoriaAtiva);

  const adicionarAoCarrinho = (item) => {
    setCarrinho((prev) => {
      const idx = prev.findIndex((p) => p.nome === item.nome);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantidade += 1;
        return copy;
      }
      return [...prev, { nome: item.nome, preco_unitario: item.preco, quantidade: 1 }];
    });
  };

  const total = carrinho.reduce((acc, curr) => acc + curr.preco_unitario * curr.quantidade, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-color,#F5F4F0)]">Cardápio Digital</h1>
          <p className="text-sm text-[var(--muted-color,#A8A29E)] mt-1">Escolha seus pratos e faça o pedido direto pelo WhatsApp</p>
        </div>
        {carrinho.length > 0 && (
          <Link
            to="/pedidos"
            state={{ carrinho, total }}
            className="px-5 py-2.5 rounded-xl font-medium bg-[var(--primary-color,#D4AF37)] text-black hover:opacity-90 transition shadow-lg flex items-center gap-2"
          >
            <span>Ver Pedido ({carrinho.reduce((a, b) => a + b.quantidade, 0)})</span>
            <span className="font-bold">R$ {total.toFixed(2)}</span>
          </Link>
        )}
      </div>

      {/* Categorias */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaAtiva(cat)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              categoriaAtiva === cat
                ? 'bg-[var(--primary-color,#D4AF37)] text-black'
                : 'bg-[var(--surface-color,#181614)] text-[var(--muted-color,#A8A29E)] border border-[var(--border-color,#26221F)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Itens */}
      {loading ? (
        <div className="text-center py-12 text-[var(--muted-color,#A8A29E)]">Carregando cardápio...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {itensFiltrados.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-5 rounded-2xl bg-[var(--surface-color,#181614)] border border-[var(--border-color,#26221F)] flex justify-between items-center hover:border-[var(--primary-color,#D4AF37)]/40 transition"
            >
              <div>
                <span className="text-xs uppercase font-semibold text-[var(--primary-color,#D4AF37)] tracking-wider">
                  {item.categoria}
                </span>
                <h3 className="text-lg font-semibold text-[var(--text-color,#F5F4F0)] mt-0.5">{item.nome}</h3>
                {item.descricao && (
                  <p className="text-xs text-[var(--muted-color,#A8A29E)] mt-1 line-clamp-2">{item.descricao}</p>
                )}
                <div className="text-base font-bold text-[var(--text-color,#F5F4F0)] mt-2">
                  R$ {Number(item.preco).toFixed(2)}
                </div>
              </div>
              <button
                onClick={() => adicionarAoCarrinho(item)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--primary-color,#D4AF37)] text-black hover:scale-105 active:scale-95 transition"
              >
                + Adicionar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
