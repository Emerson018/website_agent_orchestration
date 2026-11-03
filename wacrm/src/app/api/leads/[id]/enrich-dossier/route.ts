import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_API_URL || 'http://localhost:5000';

    let backendRes: Response;
    try {
      backendRes = await fetch(`${portalUrl}/api/leads/${id}/enrich-dossier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      backendRes = await fetch(`http://127.0.0.1:5000/api/leads/${id}/enrich-dossier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    const contentType = backendRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    }

    const text = await backendRes.text();
    return NextResponse.json(
      { error: `Servidor retornou erro (${backendRes.status}): ${text.slice(0, 150)}` },
      { status: backendRes.status || 500 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao conectar à API do Google Maps.' },
      { status: 500 }
    );
  }
}
