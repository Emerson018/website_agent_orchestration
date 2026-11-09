import { NextRequest } from 'next/server';
import { proxyToPortal } from '@/lib/portal-proxy';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPortal(`/api/leads/${encodeURIComponent(id)}/extracted-catalog`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: await req.text(),
  });
}
