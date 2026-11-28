import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteProject } from './pricing.js';

// Valores esperados copiados das tabelas da ADR 0013, nunca recalculados aqui.

test('a Site alone costs its own Implantação and Mensalidade', () => {
  assert.deepEqual(quoteProject({ tipos: ['site'] }), {
    tipos: ['site'],
    implantacao: 1490,
    mensalidade: 59,
    economia: 0,
    prazo_dias_uteis: 7,
    mensalidade_a_partir_de: false,
    parcelas: 10,
    parcela_10x: 149,
    pix: 1415.5,
  });
});

test("the Agenda's Mensalidade follows the number of professionals", () => {
  const agenda = (profissionais) => quoteProject({ tipos: ['agenda'], profissionais });
  assert.deepEqual(agenda(1), {
    tipos: ['agenda'],
    implantacao: 1990,
    mensalidade: 89,
    economia: 0,
    prazo_dias_uteis: 10,
    mensalidade_a_partir_de: true,
    parcelas: 10,
    parcela_10x: 199,
    pix: 1890.5,
  });
  assert.equal(agenda(2).mensalidade, 129);
  assert.equal(agenda(5).mensalidade, 129);
  assert.equal(agenda(6).mensalidade, 179);
  assert.equal(agenda(12).mensalidade, 179);
});

test('without a number of professionals the Agenda is quoted for one', () => {
  assert.equal(quoteProject({ tipos: ['agenda'] }).mensalidade, 89);
});

test('Site + Agenda is a Combinação with a fixed price and the saving in reais', () => {
  assert.deepEqual(quoteProject({ tipos: ['agenda', 'site'] }), {
    tipos: ['site', 'agenda'],
    implantacao: 2990,
    mensalidade: 148,
    economia: 490,
    prazo_dias_uteis: 15,
    mensalidade_a_partir_de: true,
    parcelas: 10,
    parcela_10x: 299,
    pix: 2840.5,
  });
});

test('Agenda + Dashboard is a Combinação', () => {
  assert.deepEqual(quoteProject({ tipos: ['dashboard', 'agenda'] }), {
    tipos: ['agenda', 'dashboard'],
    implantacao: 2590,
    mensalidade: 138,
    economia: 390,
    prazo_dias_uteis: 15,
    mensalidade_a_partir_de: true,
    parcelas: 10,
    parcela_10x: 259,
    pix: 2460.5,
  });
});

test('Site + Agenda + Dashboard is a Combinação, with the Agenda tier in the Mensalidade', () => {
  assert.deepEqual(quoteProject({ tipos: ['site', 'agenda', 'dashboard'], profissionais: 3 }), {
    tipos: ['site', 'agenda', 'dashboard'],
    implantacao: 3690,
    mensalidade: 237,
    economia: 780,
    prazo_dias_uteis: 20,
    mensalidade_a_partir_de: true,
    parcelas: 10,
    parcela_10x: 369,
    pix: 3505.5,
  });
});

test('a Dashboard without the Agenda has no price', () => {
  assert.equal(quoteProject({ tipos: ['dashboard'] }), null);
  assert.equal(quoteProject({ tipos: ['site', 'dashboard'] }), null);
});

test('an order with no known Tipo de Projeto has no price', () => {
  assert.equal(quoteProject({ tipos: [] }), null);
  assert.equal(quoteProject({ tipos: ['app_mobile'] }), null);
  assert.equal(quoteProject({}), null);
});

test('repeated and unknown types are ignored', () => {
  assert.equal(quoteProject({ tipos: ['site', 'site', 'app_mobile'] }).implantacao, 1490);
});

test('the quote says when the Mensalidade is "a partir de" and how many installments the card takes', () => {
  const site = quoteProject({ tipos: ['site'] });
  assert.equal(site.mensalidade_a_partir_de, false);
  assert.equal(site.parcelas, 10);
  assert.equal(quoteProject({ tipos: ['agenda'] }).mensalidade_a_partir_de, true);
  assert.equal(quoteProject({ tipos: ['site', 'agenda'] }).mensalidade_a_partir_de, true);
});
