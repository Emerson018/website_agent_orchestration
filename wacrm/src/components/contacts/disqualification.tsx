'use client';

// Decision Gate: desqualificar um lead e reabri-lo.

import React, { useState } from 'react';
import { Loader2, RotateCcw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DISQUALIFY_REASONS, type Disqualification, type DisqualifyReason } from '@/lib/contacts/disqualification';

async function readJson(res: Response): Promise<{ error?: string; desqualificacao?: Disqualification }> {
  try {
    return await res.json();
  } catch {
    return { error: `Resposta inesperada do servidor (${res.status}).` };
  }
}

export function DisqualifyButton({ leadId, onDisqualified }: { leadId: string; onDisqualified: (record: Disqualification) => void }) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState<DisqualifyReason | null>(null);
  const [detalhe, setDetalhe] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    if (!motivo) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/disqualify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo, detalhe }),
      });
      const data = await readJson(res);
      if (!res.ok || !data.desqualificacao) throw new Error(data.error || 'Falha ao desqualificar o lead.');
      onDisqualified(data.desqualificacao);
      setOpen(false);
      toast.success('Lead desqualificado.');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
        <XCircle className="size-3.5" />
        Desqualificar
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 p-4">
        <fieldset className="space-y-1.5">
          <legend className="mb-1 text-sm font-semibold">Por que desqualificar?</legend>
          {DISQUALIFY_REASONS.map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="motivo-desqualificacao"
                value={r}
                checked={motivo === r}
                onChange={() => setMotivo(r)}
                className="accent-[var(--primary)]"
              />
              {r}
            </label>
          ))}
        </fieldset>
        <textarea
          value={detalhe}
          onChange={(e) => setDetalhe(e.target.value)}
          placeholder="Detalhe (opcional)"
          aria-label="Detalhe da desqualificação"
          rows={2}
          className="w-full resize-none rounded-md border border-border bg-background p-2 text-xs"
        />
        <Button size="sm" variant="destructive" className="w-full" disabled={!motivo || saving} onClick={handleConfirm}>
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          Desqualificar lead
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function DisqualifiedBanner({
  leadId,
  record,
  onReopened,
}: {
  leadId: string;
  record: Disqualification;
  onReopened: () => void;
}) {
  const [reopening, setReopening] = useState(false);

  async function handleReopen() {
    setReopening(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/reopen`, { method: 'POST' });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || 'Falha ao reabrir o lead.');
      onReopened();
      toast.success('Lead reaberto.');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setReopening(false);
    }
  }

  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
      <XCircle className="size-4 shrink-0 text-destructive" />
      <p className="flex-1">
        <strong className="font-semibold">Desqualificado em {new Date(record.em).toLocaleDateString('pt-BR')}</strong>
        <span className="text-muted-foreground">
          {' '}
          · {record.motivo}
          {record.detalhe ? `: ${record.detalhe}` : ''}
        </span>
      </p>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={handleReopen} disabled={reopening}>
        {reopening ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
        Reabrir
      </Button>
    </div>
  );
}
