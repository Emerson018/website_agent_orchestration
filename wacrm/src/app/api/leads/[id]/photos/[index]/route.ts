import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { proxyFileFromPortal } from '@/lib/portal-proxy';

// Uma foto do dossiê, servida pelo backend do portal: o navegador nunca recebe a chave do Google
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; index: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, index } = await params;
  return proxyFileFromPortal(`/api/leads/${encodeURIComponent(id)}/photos/${encodeURIComponent(index)}`);
}
