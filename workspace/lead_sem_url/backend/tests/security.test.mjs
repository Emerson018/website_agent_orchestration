import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { setupSecurityGuardrails } from '../security.js';
import { validateRequest } from '../validate.js';
import { globalErrorHandler } from '../errorHandler.js';
import { z } from 'zod';

test('Security Guardrails - Helmet sets CSP and security headers', async () => {
  const app = express();
  setupSecurityGuardrails(app);
  app.get('/test-sec', (req, res) => res.json({ ok: true }));

  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/test-sec`);
    assert.equal(res.status, 200);

    // Verify Helmet headers
    assert.ok(res.headers.get('content-security-policy'), 'CSP header should be present');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  } finally {
    server.close();
  }
});

test('Security Guardrails - validateRequest rejects malformed payloads with 400', async () => {
  const app = express();
  app.use(express.json());

  const userSchema = z.object({
    nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
    email: z.string().email('Email inválido'),
    idade: z.number().int().positive(),
  });

  app.post('/test-val', validateRequest({ body: userSchema }), (req, res) => {
    res.json({ success: true, user: req.body });
  });
  app.use(globalErrorHandler);

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // 1. Invalid payload
    const badRes = await fetch(`http://localhost:${port}/test-val`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'A', email: 'nao-e-email', idade: -5 }),
    });

    assert.equal(badRes.status, 400);
    const badData = await badRes.json();
    assert.equal(badData.error, 'VALIDATION_ERROR');
    assert.equal(badData.detalhes.length, 3);

    // 2. Valid payload
    const goodRes = await fetch(`http://localhost:${port}/test-val`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Carlos Silva', email: 'carlos@empresa.com', idade: 28 }),
    });

    assert.equal(goodRes.status, 200);
    const goodData = await goodRes.json();
    assert.equal(goodData.success, true);
    assert.equal(goodData.user.nome, 'Carlos Silva');
  } finally {
    server.close();
  }
});

test('Security Guardrails - Rate Limiting prevents request flooding', async () => {
  const app = express();
  // Tight limiter for testing (max 3 requests)
  setupSecurityGuardrails(app, { windowMs: 60000, maxRequests: 3 });
  app.get('/api/test-limit', (req, res) => res.json({ ok: true }));

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // Make 3 allowed requests
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`http://localhost:${port}/api/test-limit`);
      assert.equal(res.status, 200);
    }

    // 4th request must be blocked by rate limit
    const blockedRes = await fetch(`http://localhost:${port}/api/test-limit`);
    assert.equal(blockedRes.status, 429);
    const blockedData = await blockedRes.json();
    assert.equal(blockedData.error, 'TOO_MANY_REQUESTS');
  } finally {
    server.close();
  }
});
