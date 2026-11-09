import { NextRequest } from 'next/server';
import { proxyToPortal } from '@/lib/portal-proxy';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const { id, fileId } = await params;
  return proxyToPortal(`/api/leads/${encodeURIComponent(id)}/catalog-files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
  });
}
