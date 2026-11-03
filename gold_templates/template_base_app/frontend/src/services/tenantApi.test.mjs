import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchCardapio,
  sendPedido,
  fetchServicos,
  sendAgendamento,
  fetchProdutos,
  sendCheckoutCarrinho,
} from './tenantApi.js';
import { buildDynamicRouteSpecs } from '../lib/routesHelper.js';

test('Frontend Dynamic Routing - builds routes tailored to Gastronomia', () => {
  const routes = buildDynamicRouteSpecs({
    nicho_detectado: 'gastronomia',
    modules: ['cardapio', 'pedidos'],
  });

  const paths = routes.map((r) => r.path);
  assert.ok(paths.includes('/cardapio'), 'Must include /cardapio');
  assert.ok(paths.includes('/pedidos'), 'Must include /pedidos');
  assert.ok(!paths.includes('/produtos'), 'Should not include retail routes');
  assert.ok(!paths.includes('/agendar'), 'Should not force booking route');
});

test('Frontend Dynamic Routing - builds routes tailored to Varejo', () => {
  const routes = buildDynamicRouteSpecs({
    nicho_detectado: 'varejo',
    modules: ['produtos', 'carrinho'],
  });

  const paths = routes.map((r) => r.path);
  assert.ok(paths.includes('/produtos'), 'Must include /produtos');
  assert.ok(paths.includes('/carrinho'), 'Must include /carrinho');
  assert.ok(!paths.includes('/cardapio'), 'Should not include gastronomy routes');
  assert.ok(!paths.includes('/agendar'), 'Should not force booking route');
});

test('Frontend Dynamic Routing - builds routes tailored to Serviços', () => {
  const routes = buildDynamicRouteSpecs({
    nicho_detectado: 'servicos',
    modules: ['servicos', 'agendar'],
  });

  const paths = routes.map((r) => r.path);
  assert.ok(paths.includes('/servicos'), 'Must include /servicos');
  assert.ok(paths.includes('/agendar'), 'Must include /agendar');
  assert.ok(!paths.includes('/produtos'), 'Should not include retail routes');
});

test('Tenant API - fallback resilience when backend is booting or offline', async () => {
  // fetchCardapio fallback
  const cardapio = await fetchCardapio();
  assert.ok(Array.isArray(cardapio));
  assert.ok(cardapio.length > 0);
  assert.equal(cardapio[0].nome, 'Prato Especial da Casa');

  // fetchServicos fallback
  const servicos = await fetchServicos();
  assert.ok(Array.isArray(servicos));
  assert.ok(servicos.length > 0);
  assert.equal(servicos[0].nome, 'Atendimento Especializado');

  // fetchProdutos fallback
  const produtos = await fetchProdutos();
  assert.ok(Array.isArray(produtos));
  assert.ok(produtos.length > 0);
  assert.equal(produtos[0].nome, 'Produto Destaque');
});
