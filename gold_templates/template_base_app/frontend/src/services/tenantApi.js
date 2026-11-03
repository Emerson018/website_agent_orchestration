/**
 * Tenant API Service: Client REST para consumo do backend composable local (/api/...)
 */

const BASE_URL = import.meta.env?.VITE_BACKEND_URL || '/api';

export async function fetchCardapio() {
  try {
    const res = await fetch(`${BASE_URL}/cardapio`);
    if (res.ok) {
      const data = await res.json();
      return data.itens || [];
    }
  } catch (err) {
    console.warn('[TenantApi] Backend indisponível, usando fallback de cardápio:', err.message);
  }
  return [
    { id: 1, nome: 'Prato Especial da Casa', preco: 48.0, categoria: 'Principais', disponivel: true },
    { id: 2, nome: 'Bebida Artesanal', preco: 14.0, categoria: 'Bebidas', disponivel: true },
  ];
}

export async function sendPedido(pedidoPayload) {
  const res = await fetch(`${BASE_URL}/pedidos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pedidoPayload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Falha ao processar pedido.');
  }
  return res.json();
}

export async function fetchServicos() {
  try {
    const res = await fetch(`${BASE_URL}/servicos`);
    if (res.ok) {
      const data = await res.json();
      return data.servicos || [];
    }
  } catch (err) {
    console.warn('[TenantApi] Backend indisponível, usando fallback de serviços:', err.message);
  }
  return [
    { id: 1, nome: 'Atendimento Especializado', duracao_minutos: 45, preco: 90.0, categoria: 'Geral' },
    { id: 2, nome: 'Consulta / Avaliação', duracao_minutos: 30, preco: 60.0, categoria: 'Avaliações' },
  ];
}

export async function sendAgendamento(agendamentoPayload) {
  const res = await fetch(`${BASE_URL}/agendamentos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agendamentoPayload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Falha ao realizar agendamento.');
  }
  return res.json();
}

export async function fetchProdutos() {
  try {
    const res = await fetch(`${BASE_URL}/produtos`);
    if (res.ok) {
      const data = await res.json();
      return data.produtos || [];
    }
  } catch (err) {
    console.warn('[TenantApi] Backend indisponível, usando fallback de produtos:', err.message);
  }
  return [
    { id: 1, nome: 'Produto Destaque', preco: 79.9, estoque: 15, categoria: 'Novidades' },
    { id: 2, nome: 'Item Premium', preco: 129.0, estoque: 8, categoria: 'Coleção' },
  ];
}

export async function sendCheckoutCarrinho(checkoutPayload) {
  const res = await fetch(`${BASE_URL}/carrinho/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checkoutPayload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Falha ao finalizar compra.');
  }
  return res.json();
}
