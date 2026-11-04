import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_API_URL || 'http://localhost:5000';

    let backendRes: Response | null = null;
    let lastNetworkErr: any = null;

    try {
      backendRes = await fetch(`${portalUrl}/api/leads/${id}/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      lastNetworkErr = err;
      try {
        backendRes = await fetch(`http://127.0.0.1:5000/api/leads/${id}/diagnose`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err2) {
        lastNetworkErr = err2;
      }
    }

    if (!backendRes) {
      throw lastNetworkErr || new Error('Falha ao comunicar com o servidor backend.');
    }

    const contentType = backendRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    }

    const text = await backendRes.text();
    return NextResponse.json(
      { error: `Servidor retornou resposta inesperada (${backendRes.status}): ${text.slice(0, 150)}` },
      { status: backendRes.status || 500 }
    );
  } catch (err: any) {
    const isConnRefused =
      err?.message?.includes('fetch failed') ||
      err?.cause?.code === 'ECONNREFUSED' ||
      err?.cause?.code === 'ENOTFOUND';

    const errorMessage = isConnRefused
      ? 'Não foi possível conectar ao servidor backend (porta 5000). Verifique se o serviço do backend está ativo.'
      : err?.message || 'Erro ao conectar à API de diagnóstico da IA.';

    return NextResponse.json(
      { error: errorMessage },
      { status: isConnRefused ? 503 : 500 }
    );
  }
}
