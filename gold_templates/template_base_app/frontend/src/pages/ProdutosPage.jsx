import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchProdutos } from '../services/tenantApi';

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carrinho, setCarrinho] = useState([]);

  useEffect(() => {
    fetchProdutos().then((data) => {
      setProdutos(data);
      setLoading(false);
    });
  }, []);

  const adicionarAoCarrinho = (produto) => {
    setCarrinho((prev) => {
      const idx = prev.findIndex((p) => p.produto_id === (produto.id || produto.nome));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantidade += 1;
        return copy;
      }
      return [
        ...prev,
        {
          produto_id: produto.id || produto.nome,
          nome: produto.nome,
          preco: produto.preco,
          quantidade: 1,
        },
      ];
    });
  };

  const total = carrinho.reduce((acc, curr) => acc + curr.preco * curr.quantidade, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-color,#F5F4F0)]">Catálogo de Produtos</h1>
          <p className="text-sm text-[var(--muted-color,#A8A29E)] mt-1">Produtos selecionados para pronta-entrega ou retirada</p>
        </div>
        {carrinho.length > 0 && (
          <Link
            to="/carrinho"
            state={{ carrinho, total }}
            className="px-5 py-2.5 rounded-xl font-medium bg-[var(--primary-color,#D4AF37)] text-black hover:opacity-90 transition shadow-lg flex items-center gap-2"
          >
            <span>Carrinho ({carrinho.reduce((a, b) => a + b.quantidade, 0)})</span>
            <span className="font-bold">R$ {total.toFixed(2)}</span>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--muted-color,#A8A29E)]">Carregando catálogo...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {produtos.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-5 rounded-2xl bg-[var(--surface-color,#181614)] border border-[var(--border-color,#26221F)] flex flex-col justify-between hover:border-[var(--primary-color,#D4AF37)]/40 transition"
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--primary-color,#D4AF37)] tracking-wider">
                  {item.categoria || 'Geral'}
                </span>
                <h3 className="text-base font-semibold text-[var(--text-color,#F5F4F0)] mt-1">{item.nome}</h3>
                {item.descricao && (
                  <p className="text-xs text-[var(--muted-color,#A8A29E)] mt-1 line-clamp-2">{item.descricao}</p>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border-color,#26221F)] flex justify-between items-center">
                <span className="text-base font-bold text-[var(--text-color,#F5F4F0)]">
                  R$ {Number(item.preco).toFixed(2)}
                </span>
                <button
                  onClick={() => adicionarAoCarrinho(item)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--primary-color,#D4AF37)] text-black hover:scale-105 active:scale-95 transition"
                >
                  Comprar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
