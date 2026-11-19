import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInstagram, resolveInstagram } from './instagram.js';

test('parseInstagram reads a @handle or a profile link', () => {
  const url = 'https://www.instagram.com/cafe.aurora';
  assert.equal(parseInstagram('@cafe.aurora'), url);
  assert.equal(parseInstagram('  instagram.com/cafe.aurora/ '), url);
  assert.equal(parseInstagram('https://www.instagram.com/cafe.aurora/?hl=pt-br'), url);
});

test('parseInstagram rejects sites, posts and empty values', () => {
  for (const value of ['cafeaurora.com.br', 'cafe.aurora', 'https://instagram.com/p/Cabc123/', 'https://www.instagram.com/reel/abc/', '', null, undefined]) {
    assert.equal(parseInstagram(value), null, String(value));
  }
});

test('resolveInstagram follows the priority: form, lead links, then the business site', () => {
  const form = 'https://www.instagram.com/do_formulario';
  const lead = { url: 'https://instagram.com/do_lead' };
  const site = { tipo: 'instagram', url: 'https://instagram.com/do_site' };

  assert.equal(resolveInstagram({ instagram: form, links: [lead], resultadosWeb: [site] }), form);
  assert.equal(resolveInstagram({ website: '@antigo', links: [lead], resultadosWeb: [site] }), 'https://www.instagram.com/antigo');
  assert.equal(resolveInstagram({ links: [lead], resultadosWeb: [site] }), 'https://www.instagram.com/do_lead');
  assert.equal(resolveInstagram({ links: [], resultadosWeb: [{ tipo: 'instagram', url: 'https://instagram.com/p/x/' }, site] }), 'https://www.instagram.com/do_site');
  assert.equal(resolveInstagram({ website: 'https://cafeaurora.com.br' }), '');
});
