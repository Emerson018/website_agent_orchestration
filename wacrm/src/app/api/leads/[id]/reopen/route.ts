import { NextRequest } from 'next/server';
import { proxyToPortal } from '@/lib/portal-proxy';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToPortal(`/api/leads/${encodeURIComponent(id)}/reopen`, { method: 'POST' });
}
