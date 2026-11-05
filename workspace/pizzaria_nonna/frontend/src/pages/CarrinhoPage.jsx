import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { sendCheckoutCarrinho } from '../services/tenantApi';

export default function CarrinhoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const stateCarrinho = location.state?.carrinho || [];
  const stateTotal = location.state?.total || 0;

  const [carrinho, setCarrinho] = useState(stateCarrinho);
  const [form, setForm] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    endereco_entrega: '',
    metodo_pagamento: 'pix',
  });
  const [submitting, setSubmitting] = useState(false);
  const [sucesso, setSucesso] = useState(null);
  const [erro, setErro] = useState('');

  const total = carrinho.reduce((acc, curr) => acc + curr.preco * curr.quantidade, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (carrinho.length === 0) {
      setErro('Seu carrinho está vazio.');
      return;
    }
    setSubmitting(true);
    setErro('');

    const payload = {
      cliente_nome: form.cliente_nome,
      cliente_telefone: form.cliente_telefone,
      itens: carrinho,
      total,
      endereco_entrega: form.endereco_entrega,
      metodo_pagamento: form.metodo_pagamento,
    };

    try {
      const res = await sendCheckoutCarrinho(payload);
      setSucesso(res.pedido || payload);
      setCarrinho([]);
    } catch (err) {
      setErro(err.message || 'Falha ao processar checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/produtos" className="text-xs text-[var(--primary-color,#D4AF37)] hover:underline mb-4 inline-block">
        ← Voltar aos produtos
      </Link>

      <h1 className="text-3xl font-bold tracking-tight text-[var(--text-color,#F5F4F0)] mb-2">Finalizar Compra</h1>
      <p className="text-sm text-[var(--muted-color,#A8A29E)] mb-6">Revise seu pedido e escolha a forma de pagamento.</p>

      {sucesso ? (
        <div className="p-6 rounded-2xl bg-[var(--surface-color,#181614)] border border-[var(--primary-color,#D4AF37)]/50 text-center">
          <div className="text-4xl mb-3">🛍️</div>
          <h2 className="text-xl font-bold text-[var(--text-color,#F5F4F0)]">Compra Realizada com Sucesso!</h2>
          <p className="text-sm text-[var(--muted-color,#A8A29E)] mt-2">
            Identificador do pedido: <strong className="text-[var(--text-color,#F5F4F0)]">{sucesso.id}</strong>
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Olá! Realizei o pedido ${sucesso.id} no valor de R$ ${Number(total || stateTotal).toFixed(2)}. Gostaria do código PIX/confirmação.`)}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition text-center"
            >
              Confirmar no WhatsApp 💬
            </a>
            <button
              onClick={() => navigate('/produtos')}
              className="w-full py-2.5 rounded-xl text-sm font-medium border border-[var(--border-color,#26221F)] text-[var(--muted-color,#A8A29E)]"
            >
              Continuar comprando
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {erro && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 text-red-200 text-xs">
              {erro}
            </div>
          )}

          {/* Resumo Itens */}
          <div className="p-5 rounded-2xl bg-[var(--surface-color,#181614)] border border-[var(--border-color,#26221F)]">
            <h3 className="text-xs font-semibold text-[var(--text-color,#F5F4F0)] mb-3 uppercase tracking-wider">
              Produtos ({carrinho.length})
            </h3>
            {carrinho.length === 0 ? (
              <p className="text-xs text-[var(--muted-color,#A8A29E)]">Carrinho vazio.</p>
            ) : (
              <div className="space-y-2">
                {carrinho.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-[var(--border-color,#26221F)]/50 last:border-0">
                    <span className="text-[var(--text-color,#F5F4F0)]">
                      {item.quantidade}x {item.nome}
                    </span>
                    <span className="font-semibold text-[var(--text-color,#F5F4F0)]">
                      R$ {(item.preco * item.quantidade).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center text-base font-bold pt-3 text-[var(--primary-color,#D4AF37)]">
                  <span>Total</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Dados e Pagamento */}
          <div className="p-5 rounded-2xl bg-[var(--surface-color,#181614)] border border-[var(--border-color,#26221F)] space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-color,#F5F4F0)]">
              Entrega & Pagamento
            </h3>
            <div>
              <label className="block text-xs text-[var(--muted-color,#A8A29E)] mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={form.cliente_nome}
                onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-[var(--border-color,#26221F)] text-[var(--text-color,#F5F4F0)] text-sm focus:outline-none focus:border-[var(--primary-color,#D4AF37)]"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted-color,#A8A29E)] mb-1">Telefone WhatsApp *</label>
              <input
                type="tel"
                required
                value={form.cliente_telefone}
                onChange={(e) => setForm({ ...form, cliente_telefone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-[var(--border-color,#26221F)] text-[var(--text-color,#F5F4F0)] text-sm focus:outline-none focus:border-[var(--primary-color,#D4AF37)]"
                placeholder="(11) 99999-8888"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted-color,#A8A29E)] mb-1">Endereço de Entrega *</label>
              <input
                type="text"
                required
                value={form.endereco_entrega}
                onChange={(e) => setForm({ ...form, endereco_entrega: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-[var(--border-color,#26221F)] text-[var(--text-color,#F5F4F0)] text-sm focus:outline-none focus:border-[var(--primary-color,#D4AF37)]"
                placeholder="Rua, número, complemento e CEP"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted-color,#A8A29E)] mb-1">Forma de Pagamento</label>
              <select
                value={form.metodo_pagamento}
                onChange={(e) => setForm({ ...form, metodo_pagamento: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-[var(--border-color,#26221F)] text-[var(--text-color,#F5F4F0)] text-sm focus:outline-none focus:border-[var(--primary-color,#D4AF37)]"
              >
                <option value="pix">PIX (Chave Automática)</option>
                <option value="cartao">Cartão de Crédito / Débito na Entrega</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || carrinho.length === 0}
            className="w-full py-3.5 rounded-xl font-bold bg-[var(--primary-color,#D4AF37)] text-black hover:opacity-90 disabled:opacity-40 transition shadow-lg text-sm"
          >
            {submitting ? 'Finalizando...' : `Concluir Pedido (R$ ${total.toFixed(2)})`}
          </button>
        </form>
      )}
    </div>
  );
}
