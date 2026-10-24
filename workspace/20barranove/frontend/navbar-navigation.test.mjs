import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainLayoutPath = path.join(__dirname, 'src', 'layouts', 'MainLayout.jsx');
const landingPagePath = path.join(__dirname, 'src', 'pages', 'LandingPage.jsx');

test('Navbar buttons must follow the visual sequence of the page: Início -> A Casa -> Cortes & Cardápio -> Contato', () => {
  const content = fs.readFileSync(mainLayoutPath, 'utf-8');

  // Find desktop nav links block
  const navMatch = content.match(/<nav[^>]*>([\s\S]*?)<\/nav>/);
  assert.ok(navMatch, 'Desktop nav must exist');
  const navHtml = navMatch[1];

  // Check positions of links
  const inicioPos = navHtml.indexOf('Início');
  const aCasaPos = navHtml.indexOf('A Casa');
  const cardapioPos = navHtml.indexOf('Cortes & Cardápio');
  const contatoPos = navHtml.indexOf('Contato');

  assert.ok(inicioPos !== -1, 'Início link must exist in navbar');
  assert.ok(aCasaPos !== -1, 'A Casa link must exist in navbar');
  assert.ok(cardapioPos !== -1, 'Cortes & Cardápio link must exist in navbar');
  assert.ok(contatoPos !== -1, 'Contato link must exist in navbar');

  // Assert correct order: Início -> A Casa -> Cortes & Cardápio -> Contato
  assert.ok(inicioPos < aCasaPos, 'Início must appear before A Casa');
  assert.ok(aCasaPos < cardapioPos, 'A Casa (#experiencia) must appear BEFORE Cortes & Cardápio (#cardapio)');
  assert.ok(cardapioPos < contatoPos, 'Cortes & Cardápio must appear before Contato');
});

test('Início button must handle scroll to top when already on home page', () => {
  const content = fs.readFileSync(mainLayoutPath, 'utf-8');
  // Check if Início link/button has an explicit click handler or scroll to top mechanism
  const hasScrollToTop = content.includes('window.scrollTo') || content.includes('scrollToTop');
  assert.equal(hasScrollToTop, true, 'MainLayout must have an explicit scroll-to-top handler for Início');
});

test('LandingPage sections must have scroll margin top (scroll-mt) to prevent sticky header overlap', () => {
  const content = fs.readFileSync(landingPagePath, 'utf-8');
  assert.ok(content.includes('id="inicio"'), 'LandingPage must have section id="inicio"');
  assert.ok(content.includes('id="experiencia"') && content.includes('scroll-mt-'), 'Section #experiencia must have scroll-mt-');
  assert.ok(content.includes('id="cardapio"') && content.includes('scroll-mt-'), 'Section #cardapio must have scroll-mt-');
  assert.ok(content.includes('id="contato"') && content.includes('scroll-mt-'), 'Section #contato must have scroll-mt-');
});

test('Mobile drawer anchor links must close the drawer on click', () => {
  const content = fs.readFileSync(mainLayoutPath, 'utf-8');
  const drawerMatch = content.match(/\{\/\* MOBILE DRAWER \*\/\}[\s\S]*?\{mobileMenuOpen && \(([\s\S]*?)\n\s*\)\}/);
  assert.ok(drawerMatch, 'Mobile drawer must exist');
  const drawerHtml = drawerMatch[1];

  // Each link inside mobile drawer must close mobileMenuOpen
  const linesWithAnchors = drawerHtml.split('\n').filter(l => l.includes('href=') || (l.includes('<Link') && !l.includes('/admin')));
  for (const line of linesWithAnchors) {
    assert.ok(drawerHtml.includes('setMobileMenuOpen(false)'), 'Mobile links must close the menu drawer');
  }
});
