import { NextResponse } from 'next/server';

/**
 * Chama o backend do Portal Fábrica: tenta NEXT_PUBLIC_PORTAL_API_URL (ou localhost:5000) e depois
 * 127.0.0.1:5000. Sem conexão, devolve a resposta de erro pronta em `failure`.
 */
async function reachPortal(path: string, init: RequestInit): Promise<{ backendRes: Response } | { failure: NextResponse }> {
  const bases = [process.env.NEXT_PUBLIC_PORTAL_API_URL || 'http://localhost:5000', 'http://127.0.0.1:5000'];

  let backendRes: Response | null = null;
  let lastErr: unknown = null;
  for (const base of bases) {
    try {
      backendRes = await fetch(`${base}${path}`, init);
      break;
    } catch (err) {
      lastErr = err;
    }
  }

  if (!backendRes) {
    const cause = (lastErr as { cause?: { code?: string } } | null)?.cause?.code;
    const refused = cause === 'ECONNREFUSED' || cause === 'ENOTFOUND' || String(lastErr).includes('fetch failed');
    return {
      failure: NextResponse.json(
        {
          error: refused
            ? 'Não foi possível conectar ao servidor backend (porta 5000). Verifique se o serviço do backend está ativo.'
            : String((lastErr as Error)?.message || 'Falha ao comunicar com o servidor backend.'),
        },
        { status: refused ? 503 : 500 }
      ),
    };
  }

  return { backendRes };
}

/** Repassa uma requisição ao backend do Portal Fábrica e devolve a resposta como JSON. */
export async function proxyToPortal(path: string, init: RequestInit): Promise<NextResponse> {
  const reached = await reachPortal(path, init);
  if ('failure' in reached) return reached.failure;
  const { backendRes } = reached;

  if ((backendRes.headers.get('content-type') || '').includes('application/json')) {
    return NextResponse.json(await backendRes.json(), { status: backendRes.status });
  }
  const text = await backendRes.text();
  return NextResponse.json(
    { error: `Servidor retornou resposta inesperada (${backendRes.status}): ${text.slice(0, 150)}` },
    { status: backendRes.status || 500 }
  );
}

/** Repassa um arquivo do backend do Portal Fábrica; respostas de erro continuam vindo em JSON. */
export async function proxyFileFromPortal(path: string): Promise<NextResponse> {
  const reached = await reachPortal(path, { method: 'GET' });
  if ('failure' in reached) return reached.failure;
  const { backendRes } = reached;

  if (!backendRes.ok) {
    const data = await backendRes.json().catch(() => ({ error: 'Falha ao baixar o arquivo.' }));
    return NextResponse.json(data, { status: backendRes.status });
  }

  const headers = new Headers();
  for (const name of ['content-type', 'content-disposition', 'cache-control', 'x-fotos-ignoradas']) {
    const value = backendRes.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new NextResponse(backendRes.body, { status: 200, headers });
}
