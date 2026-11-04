import test from 'node:test';
import assert from 'node:assert/strict';

test('Intake de Lead sem campo Empresa (obtido posteriormente via Maps)', async (t) => {
  const testPort = '5098';
  process.env.PORT = testPort;
  const { server } = await import(`./server.js?v=${Date.now()}`);
  await new Promise((r) => setTimeout(r, 400));
  const baseUrl = `http://localhost:${testPort}`;

  try {
    // Lead enviado da LandingPage sem campo company
    const testPayload = {
      name: 'Roberto Alencar',
      email: `roberto_${Date.now()}@exemplo.com`,
      phone: '(11) 98888-1234',
      website: 'https://barbeariamodelo.com.br',
    };

    const res = await fetch(`${baseUrl}/api/projetos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    assert.equal(res.status, 201, 'Deve aceitar submissão mesmo sem o campo empresa');
    const data = await res.json();
    assert.ok(data.id, 'Deve retornar o ID do projeto/lead registrado');
  } finally {
    if (server && server.close) {
      server.close();
    }
  }
});
