'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/** Endereço de uma foto do dossiê, servida pelo backend: o navegador nunca recebe a chave do Google. */
export const dossierPhotoUrl = (leadId: string | number, index: number) => `/api/leads/${leadId}/photos/${index}`;

/** Baixa todas as fotos do dossiê do lead num arquivo ZIP. */
export function DownloadPhotosButton({ leadId }: { leadId: string | number }) {
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/photos`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Não foi possível baixar as fotos.');
      }

      const fileName = res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] || 'fotos-do-lead.zip';
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

      const skipped = Number(res.headers.get('x-fotos-ignoradas') || 0);
      if (skipped > 0) {
        toast.warning(`${skipped === 1 ? '1 foto não pôde ser baixada' : `${skipped} fotos não puderam ser baixadas`}. As demais estão no arquivo.`);
      } else {
        toast.success('Fotos baixadas.');
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={download} disabled={downloading}>
      {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
      {downloading ? 'Preparando...' : 'Baixar fotos (ZIP)'}
    </Button>
  );
}
