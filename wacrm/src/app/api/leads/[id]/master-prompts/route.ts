import { NextRequest } from 'next/server';
import { proxyToPortal } from '@/lib/portal-proxy';

// Refaz o Prompt Mestre de um Tipo de Projeto no backend do portal (sem chamar o Gemini)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPortal(`/api/leads/${encodeURIComponent(id)}/master-prompts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await req.text(),
  });
}
