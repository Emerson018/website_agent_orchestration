import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { proxyFileFromPortal } from '@/lib/portal-proxy';

// Baixa as fotos do dossiê num ZIP, montado pelo backend do portal
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  return proxyFileFromPortal(`/api/leads/${encodeURIComponent(id)}/photos.zip`);
}
