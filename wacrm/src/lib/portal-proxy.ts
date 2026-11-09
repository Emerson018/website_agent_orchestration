import { NextResponse } from 'next/server';

/**
 * Repassa uma requisição ao backend do Portal Fábrica e devolve a resposta como JSON.
 * Tenta NEXT_PUBLIC_PORTAL_API_URL (ou localhost:5000) e depois 127.0.0.1:5000.
 */
export async function proxyToPortal(path: string, init: RequestInit): Promise<NextResponse> {
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
    return NextResponse.json(
      {
        error: refused
          ? 'Não foi possível conectar ao servidor backend (porta 5000). Verifique se o serviço do backend está ativo.'
          : String((lastErr as Error)?.message || 'Falha ao comunicar com o servidor backend.'),
      },
      { status: refused ? 503 : 500 }
    );
  }

  if ((backendRes.headers.get('content-type') || '').includes('application/json')) {
    return NextResponse.json(await backendRes.json(), { status: backendRes.status });
  }
  const text = await backendRes.text();
  return NextResponse.json(
    { error: `Servidor retornou resposta inesperada (${backendRes.status}): ${text.slice(0, 150)}` },
    { status: backendRes.status || 500 }
  );
}
