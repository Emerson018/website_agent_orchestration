import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Encaminha requisição para o backend do Portal Fábrica
    let backendRes: Response;
    try {
      backendRes = await fetch(`http://127.0.0.1:5000/api/projetos/${id}/processar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      backendRes = await fetch(`http://localhost:5000/api/projetos/${id}/processar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao processar projeto' },
      { status: 500 }
    );
  }
}
