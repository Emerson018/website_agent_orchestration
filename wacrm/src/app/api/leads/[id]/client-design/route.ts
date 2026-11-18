import { NextRequest } from 'next/server';
import { proxyToPortal } from '@/lib/portal-proxy';

// Salva o Design do Cliente no backend do portal (que guarda todos os dados do Prompt Mestre)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPortal(`/api/leads/${encodeURIComponent(id)}/client-design`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: await req.text(),
  });
}
