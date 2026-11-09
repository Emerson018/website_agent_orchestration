'use client';

import React, { useRef, useState } from 'react';
import { BookOpen, FileText, ImageIcon, Loader2, Sparkles, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  CATALOG_ACCEPT,
  formatFileSize,
  validateCatalogSelection,
  type CatalogFile,
  type ExtractedCatalog,
} from '@/lib/contacts/extracted-catalog';

export interface ExtractedCatalogCardProps {
  leadId: string;
  files: CatalogFile[];
  catalog: ExtractedCatalog | null;
  onFilesChange: (files: CatalogFile[]) => void;
  onCatalogChange: (catalog: ExtractedCatalog) => void;
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function readJson(
  res: Response
): Promise<{ error?: string; files?: CatalogFile[]; catalogo_extraido?: ExtractedCatalog }> {
  try {
    return await res.json();
  } catch {
    return { error: `Resposta inesperada do servidor (${res.status}).` };
  }
}

export function ExtractedCatalogCard({ leadId, files, catalog, onFilesChange, onCatalogChange }: ExtractedCatalogCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  async function handleExtract() {
    setIsExtracting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/extract-catalog`, { method: 'POST' });
      const data = await readJson(res);
      if (!res.ok || !data.catalogo_extraido) throw new Error(data.error || 'Falha ao extrair o catálogo.');
      onCatalogChange(data.catalogo_extraido);
      toast.success('Catálogo extraído com sucesso.');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (selected.length === 0) return;

    const problem = validateCatalogSelection(selected);
    if (problem) {
      toast.error(problem);
      return;
    }

    setIsUploading(true);
    try {
      const payload = await Promise.all(
        selected.map(async (f) => ({ fileName: f.name, mimeType: f.type, base64Data: await readAsBase64(f) }))
      );
      const res = await fetch(`/api/leads/${leadId}/catalog-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: payload }),
      });
      const data = await readJson(res);
      if (!res.ok || !data.files) throw new Error(data.error || 'Falha ao enviar os arquivos.');
      onFilesChange(data.files);
      toast.success(selected.length === 1 ? 'Arquivo enviado.' : `${selected.length} arquivos enviados.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemove(file: CatalogFile) {
    setRemovingId(file.id);
    try {
      const res = await fetch(`/api/leads/${leadId}/catalog-files/${file.id}`, { method: 'DELETE' });
      const data = await readJson(res);
      if (!res.ok || !data.files) throw new Error(data.error || 'Falha ao remover o arquivo.');
      onFilesChange(data.files);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            Catálogo Extraído
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Envie fotos ou PDFs de cardápios, tabelas de preço ou catálogos. JPG, PNG, WEBP ou PDF, até 15 MB por envio.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={CATALOG_ACCEPT}
          className="hidden"
          onChange={handleSelect}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs shrink-0"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          {isUploading ? 'Enviando...' : 'Enviar arquivos'}
        </Button>
      </div>

      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum arquivo enviado para este lead.</p>
      ) : (
        <ul className="space-y-1.5">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border text-xs"
            >
              {file.mime_type === 'application/pdf' ? (
                <FileText className="size-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ImageIcon className="size-3.5 text-muted-foreground shrink-0" />
              )}
              <a href={file.url} target="_blank" rel="noreferrer" className="flex-1 truncate hover:underline">
                {file.name}
              </a>
              <span className="text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
              <button
                type="button"
                onClick={() => handleRemove(file)}
                disabled={removingId === file.id}
                className="text-muted-foreground hover:text-destructive transition p-0.5 rounded"
                title="Remover arquivo"
                aria-label={`Remover ${file.name}`}
              >
                {removingId === file.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2 border-t border-border/50 pt-3">
        <Button
          type="button"
          size="sm"
          className="w-full gap-1.5 text-xs"
          disabled={files.length === 0 || isExtracting || isUploading}
          onClick={handleExtract}
          title={files.length === 0 ? 'Envie ao menos um arquivo para extrair o catálogo' : undefined}
        >
          {isExtracting ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {isExtracting ? 'Extraindo com IA...' : 'Extrair com IA'}
        </Button>

        {catalog?.markdown ? (
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">
              {catalog.gerado_em ? `Gerado em ${new Date(catalog.gerado_em).toLocaleString('pt-BR')}` : 'Catálogo salvo'}
              {catalog.arquivos_processados ? ` a partir de ${catalog.arquivos_processados} arquivo(s)` : ''}
            </p>
            <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground">
              {catalog.markdown}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
