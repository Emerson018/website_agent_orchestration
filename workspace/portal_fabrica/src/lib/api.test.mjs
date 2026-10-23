import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { apiFetch } from './api.js';

test('apiFetch recovers from Vite proxy ECONNRESET (500/502) and transient backend restart window', async () => {
  let backendOnline = false;
  let attempts = 0;

  const server = http.createServer((req, res) => {
    attempts += 1;
    if (!backendOnline) {
      // Simulates Vite http-proxy returning 500 on ECONNRESET while backend restarts
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error: read ECONNRESET');
      return;
    }
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 42, project_name: 'Dentista EVL', auto_dispatched: true }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const deadPort = port + 1000;

  // Backend finishes restarting after 450ms
  setTimeout(() => {
    backendOnline = true;
  }, 450);

  try {
    const res = await apiFetch(
      '/projetos',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_name: 'Dentista EVL' })
      },
      {
        primaryBase: `http://127.0.0.1:${port}/api`,
        fallbackBases: [`http://127.0.0.1:${deadPort}/api`, `http://127.0.0.1:${port}/api`],
        retryDelaysMs: [250, 400]
      }
    );

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.project_name, 'Dentista EVL');
    assert.ok(attempts >= 2, `Expected at least 2 attempts, got ${attempts}`);
  } finally {
    server.close();
  }
});

test('apiFetch returns genuine 400 application error immediately without retrying', async () => {
  let attempts = 0;

  const server = http.createServer((req, res) => {
    attempts += 1;
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'O nome do projeto (project_name) é obrigatório.' }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const res = await apiFetch(
      '/projetos',
      { method: 'POST' },
      {
        primaryBase: `http://127.0.0.1:${port}/api`,
        fallbackBases: [],
        retryDelaysMs: [200, 200]
      }
    );

    assert.equal(res.status, 400);
    assert.equal(attempts, 1);
  } finally {
    server.close();
  }
});
