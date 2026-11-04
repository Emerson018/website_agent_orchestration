import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { sendPedido } from '../services/tenantApi';

export default function PedidosPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const stateCarrinho = location.state?.carrinho || [];
  const stateTotal = location.state?.total || 0;

  const [carrinho, setCarrinho] = useState(stateCarrinho);
  const [form, setForm] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    endereco_entrega: '',
    observacoes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [sucesso, setSucesso] = useState(null);
  const [erro, setErro] = useState('');

  const total = carrinho.reduce((acc, curr) => acc + curr.preco_unitario * curr.quantidade, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (carrinho.length === 0) {
      setErro('Seu pedido está vazio.');
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
      observacoes: form.observacoes || undefined,
    };

    try {
      const res = await sendPedido(payload);
      setSucesso(res.pedido || payload);
      setCarrinho([]);
    } catch (err) {
      setErro(err.message || 'Falha ao enviar pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/cardapio" className="text-xs text-[var(--primary-color,#D4AF37)] hover:underline mb-4 inline-block">
        ← Voltar ao cardápio
      </Link>

      <h1 className="text-3xl font-bold tracking-tight text-[var(--text-color,#F5F4F0)] mb-2">Finalizar Pedido</h1>
      <p className="text-sm text-[var(--muted-color,#A8A29E)] mb-6">Confirme os itens e informe seus dados para entrega imediata.</p>

      {sucesso ? (
        <div className="p-6 rounded-2xl bg-[var(--surface-color,#181614)] border border-[var(--primary-color,#D4AF37)]/50 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-xl font-bold text-[var(--text-color,#F5F4F0)]">Pedido Confirmado com Sucesso!</h2>
          <p className="text-sm text-[var(--muted-color,#A8A29E)] mt-2">
            Código do pedido: <strong className="text-[var(--text-color,#F5F4F0)]">{sucesso.id}</strong>
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Olá! Gostaria de acompanhar meu pedido ${sucesso.id} no valor de R$ ${Number(total || stateTotal).toFixed(2)}`)}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition text-center"
            >
              Acompanhar no WhatsApp 💬
            </a>
            <button
              onClick={() => navigate('/cardapio')}
              className="w-full py-2.5 rounded-xl text-sm font-medium border border-[var(--border-color,#26221F)] text-[var(--muted-color,#A8A29E)]"
            >
              Fazer outro pedido
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
            <h3 className="text-sm font-semibold text-[var(--text-color,#F5F4F0)] mb-3 uppercase tracking-wider text-xs">
              Itens do Pedido ({carrinho.length})
            </h3>
            {carrinho.length === 0 ? (
              <p className="text-xs text-[var(--muted-color,#A8A29E)]">Nenhum item selecionado. Volte ao cardápio para adicionar.</p>
            ) : (
              <div className="space-y-2">
                {carrinho.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-[var(--border-color,#26221F)]/50 last:border-0">
                    <span className="text-[var(--text-color,#F5F4F0)]">
                      {item.quantidade}x {item.nome}
                    </span>
                    <span className="font-semibold text-[var(--text-color,#F5F4F0)]">
                      R$ {(item.preco_unitario * item.quantidade).toFixed(2)}
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

          {/* Dados de Entrega */}
          <div className="p-5 rounded-2xl bg-[var(--surface-color,#181614)] border border-[var(--border-color,#26221F)] space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-color,#F5F4F0)]">
              Dados para Entrega
            </h3>
            <div>
              <label className="block text-xs text-[var(--muted-color,#A8A29E)] mb-1">Seu Nome *</label>
              <input
                type="text"
                required
                value={form.cliente_nome}
                onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-[var(--border-color,#26221F)] text-[var(--text-color,#F5F4F0)] text-sm focus:outline-none focus:border-[var(--primary-color,#D4AF37)]"
                placeholder="Ex: Carlos Eduardo"
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
                placeholder="Ex: (11) 98765-4321"
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
                placeholder="Rua, número, complemento e bairro"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted-color,#A8A29E)] mb-1">Observações (opcional)</label>
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-[var(--border-color,#26221F)] text-[var(--text-color,#F5F4F0)] text-sm focus:outline-none focus:border-[var(--primary-color,#D4AF37)]"
                placeholder="Ex: Sem cebola, campainha estragada..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || carrinho.length === 0}
            className="w-full py-3.5 rounded-xl font-bold bg-[var(--primary-color,#D4AF37)] text-black hover:opacity-90 disabled:opacity-40 transition shadow-lg text-sm"
          >
            {submitting ? 'Enviando Pedido...' : `Confirmar Pedido (R$ ${total.toFixed(2)})`}
          </button>
        </form>
      )}
    </div>
  );
}
