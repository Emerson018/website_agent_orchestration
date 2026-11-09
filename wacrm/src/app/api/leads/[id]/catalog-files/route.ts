import { NextRequest } from 'next/server';
import { proxyToPortal } from '@/lib/portal-proxy';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPortal(`/api/leads/${encodeURIComponent(id)}/catalog-files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await req.text(),
  });
}
