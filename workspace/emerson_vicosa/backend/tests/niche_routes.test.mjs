import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { globalErrorHandler } from '../errorHandler.js';
import { z } from 'zod';
import { validateRequest } from '../validate.js';

test('Niche Backend Routes - Gastronomia (/api/cardapio & /api/pedidos)', async () => {
  const app = express();
  app.use(express.json());

  // Cardapio route validation logic
  const itemSchema = z.object({
    nome: z.string().min(2, 'Nome do prato deve ter ao menos 2 caracteres'),
    preco: z.number().positive('Preço deve ser maior que zero'),
    categoria: z.string().min(2, 'Categoria obrigatória'),
  });

  app.post('/api/cardapio', validateRequest({ body: itemSchema }), (req, res) => {
    res.status(201).json({ success: true, item: { id: 101, ...req.body } });
  });

  // Pedidos route validation logic
  const pedidoSchema = z.object({
    cliente_nome: z.string().min(2),
    cliente_telefone: z.string().min(8),
    itens: z.array(z.object({
      nome: z.string(),
      quantidade: z.number().int().positive(),
      preco_unitario: z.number().positive(),
    })).min(1),
    total: z.number().positive(),
    endereco_entrega: z.string().min(5),
  });

  app.post('/api/pedidos', validateRequest({ body: pedidoSchema }), (req, res) => {
    res.status(201).json({ success: true, pedido: { id: 'PED-123', ...req.body } });
  });

  app.use(globalErrorHandler);

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // 1. Valid cardapio item
    const goodItemRes = await fetch(`http://localhost:${port}/api/cardapio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Pizza Margherita', preco: 45.0, categoria: 'Pizzas' }),
    });
    assert.equal(goodItemRes.status, 201);
    const goodItem = await goodItemRes.json();
    assert.equal(goodItem.success, true);
    assert.equal(goodItem.item.nome, 'Pizza Margherita');

    // 2. Malformed cardapio item (preco negativo, sem categoria)
    const badItemRes = await fetch(`http://localhost:${port}/api/cardapio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'X', preco: -10 }),
    });
    assert.equal(badItemRes.status, 400);
    const badItem = await badItemRes.json();
    assert.equal(badItem.error, 'VALIDATION_ERROR');

    // 3. Valid pedido
    const goodPedidoRes = await fetch(`http://localhost:${port}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_nome: 'João Silva',
        cliente_telefone: '11999998888',
        itens: [{ nome: 'Pizza Margherita', quantidade: 1, preco_unitario: 45.0 }],
        total: 45.0,
        endereco_entrega: 'Rua das Flores, 123',
      }),
    });
    assert.equal(goodPedidoRes.status, 201);
    const goodPedido = await goodPedidoRes.json();
    assert.equal(goodPedido.success, true);

    // 4. Malformed pedido (itens vazios)
    const badPedidoRes = await fetch(`http://localhost:${port}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_nome: 'João',
        cliente_telefone: '11999998888',
        itens: [],
        total: 0,
        endereco_entrega: 'Rua',
      }),
    });
    assert.equal(badPedidoRes.status, 400);
  } finally {
    server.close();
  }
});

test('Niche Backend Routes - Serviços (/api/servicos & /api/agendamentos)', async () => {
  const app = express();
  app.use(express.json());

  const agendamentoSchema = z.object({
    cliente_nome: z.string().min(2),
    cliente_telefone: z.string().min(8),
    servico_nome: z.string().min(2),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    horario: z.string().regex(/^\d{2}:\d{2}$/),
  });

  app.post('/api/agendamentos', validateRequest({ body: agendamentoSchema }), (req, res) => {
    res.status(201).json({ success: true, agendamento: { id: 'AG-99', ...req.body } });
  });

  app.use(globalErrorHandler);

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // Valid agendamento
    const goodRes = await fetch(`http://localhost:${port}/api/agendamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_nome: 'Mariana Lima',
        cliente_telefone: '11988887777',
        servico_nome: 'Corte e Barba',
        data: '2026-11-10',
        horario: '14:30',
      }),
    });
    assert.equal(goodRes.status, 201);

    // Invalid agendamento (invalid date format)
    const badRes = await fetch(`http://localhost:${port}/api/agendamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_nome: 'Mariana',
        cliente_telefone: '11988887777',
        servico_nome: 'Corte',
        data: '10/11/2026',
        horario: '14:30',
      }),
    });
    assert.equal(badRes.status, 400);
  } finally {
    server.close();
  }
});
