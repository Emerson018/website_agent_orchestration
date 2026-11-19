'use client';

import { useState } from 'react';
import { AlertTriangle, Check, Copy, RefreshCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { StatusChip } from '@/components/contacts/lead-steps-ui';
import type { StepStatus } from '@/lib/contacts/lead-steps';
import {
  MASTER_PROMPT_TYPES,
  masterPromptsOf,
  promptChangesSince,
  promptTabOrder,
  requestedPromptKeys,
  type MasterPromptKey,
} from '@/lib/contacts/master-prompts';

export interface MasterPromptPanelProps {
  leadId: string;
  /** contacts.additional_data do lead. */
  additionalData: Record<string, unknown>;
  /** Tipos de Projeto que o cliente pediu no formulário ("Site", "Agenda", "Dashboard"). */
  tiposProjeto: string[];
  status: StepStatus;
  hasDiagnosis: boolean;
  /** O backend refez um prompt: devolve o additional_data.prompts_mestre atualizado. */
  onPromptsChange: (promptsMestre: Record<string, unknown>) => void;
}

const labelOf = (key: MasterPromptKey) => MASTER_PROMPT_TYPES.find((t) => t.key === key)?.label ?? key;

/** Coluna do Prompt Mestre: uma aba por Tipo de Projeto, cada uma com a sua edição, cópia e atualização. */
export function MasterPromptPanel({ leadId, additionalData, tiposProjeto, status, hasDiagnosis, onPromptsChange }: MasterPromptPanelProps) {
  const saved = masterPromptsOf(additionalData);
  const order = promptTabOrder(tiposProjeto);
  const requested = requestedPromptKeys(tiposProjeto);
  const [active, setActive] = useState<MasterPromptKey>(order[0]);
  const [rebuilding, setRebuilding] = useState<MasterPromptKey | null>(null);
  const [copied, setCopied] = useState(false);

  // Edição de cada aba, reiniciada quando o texto salvo daquela aba muda (gerado de novo)
  const [drafts, setDrafts] = useState<Partial<Record<MasterPromptKey, string>>>({});
  const [synced, setSynced] = useState<Partial<Record<MasterPromptKey, string>>>({});
  const changedTabs = order.filter((key) => (saved[key]?.texto ?? '') !== (synced[key] ?? ''));
  if (changedTabs.length > 0) {
    const nextSynced = { ...synced };
    const nextDrafts = { ...drafts };
    for (const key of changedTabs) {
      nextSynced[key] = saved[key]?.texto ?? '';
      delete nextDrafts[key];
    }
    setSynced(nextSynced);
    setDrafts(nextDrafts);
  }

  const prompt = saved[active];
  const original = prompt?.texto ?? '';
  const text = drafts[active] ?? original;
  const edited = drafts[active] !== undefined && drafts[active] !== original;
  const changed = prompt ? promptChangesSince(additionalData, prompt.geradoEm) : [];

  // Refazer substitui o texto da aba: confirma antes de descartar uma edição do operador
  function redo() {
    if (edited && !window.confirm('Refazer este prompt descarta a sua edição. Continuar?')) return;
    setDrafts((prev) => ({ ...prev, [active]: undefined }));
    void rebuild(active);
  }

  async function rebuild(tipo: MasterPromptKey) {
    setRebuilding(tipo);
    try {
      const res = await fetch(`/api/leads/${leadId}/master-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.prompts_mestre) throw new Error(data.error || 'Não foi possível gerar o Prompt Mestre.');
      onPromptsChange(data.prompts_mestre);
      toast.success(`Prompt Mestre de ${labelOf(tipo)} atualizado.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRebuilding(null);
    }
  }

  function copy() {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Prompt Mestre copiado. Cole na sua IA de preferência.');
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Prompt Mestre</h2>
            <StatusChip status={status} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Um por tipo de projeto. Copie e cole na sua IA para especificar e construir.</p>
        </div>
        {edited && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDrafts((prev) => ({ ...prev, [active]: undefined }))}
            className="h-7 gap-1 text-xs text-muted-foreground"
          >
            <RotateCcw className="size-3" />
            Restaurar
          </Button>
        )}
      </div>

      <div role="tablist" aria-label="Tipo de projeto" className="flex gap-1 rounded-lg bg-muted/60 p-1">
        {order.map((key) => {
          const selected = key === active;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                selected ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {requested.includes(key) && <span aria-label="pedido pelo cliente" className="size-1.5 rounded-full bg-primary" />}
              {labelOf(key)}
            </button>
          );
        })}
      </div>

      {prompt && changed.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-orange-500/10 px-3 py-2 text-xs text-orange-300">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 shrink-0" />
            {changed.join(' e ')} {changed.length > 1 ? 'mudaram' : 'mudou'} depois deste prompt.
          </span>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => rebuild(active)} disabled={rebuilding !== null}>
            <RefreshCw className={`size-3 ${rebuilding === active ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      )}

      {prompt ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setDrafts((prev) => ({ ...prev, [active]: e.target.value }))}
            aria-label={`Prompt Mestre de ${labelOf(active)}`}
            rows={14}
            className="w-full resize-y rounded-xl border border-border bg-background/60 p-3 font-mono text-xs leading-relaxed text-foreground focus:border-primary focus:outline-none"
          />
          <Button onClick={copy} disabled={!text} className="w-full gap-2">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Prompt Mestre copiado' : `Copiar Prompt Mestre de ${labelOf(active)}`}
          </Button>
          <Button variant="outline" onClick={redo} disabled={rebuilding !== null} className="w-full gap-2">
            <RefreshCw className={`size-4 ${rebuilding === active ? 'animate-spin' : ''}`} />
            Refazer prompt
          </Button>
        </>
      ) : (
        <div className="space-y-3 rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
          {hasDiagnosis ? (
            <>
              <p>O prompt de {labelOf(active)} ainda não foi gerado para este lead.</p>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => rebuild(active)} disabled={rebuilding !== null}>
                <RefreshCw className={`size-3.5 ${rebuilding === active ? 'animate-spin' : ''}`} />
                Gerar prompt de {labelOf(active)}
              </Button>
            </>
          ) : (
            <p>Os Prompts Mestre são gerados junto com o diagnóstico.</p>
          )}
        </div>
      )}
    </div>
  );
}
