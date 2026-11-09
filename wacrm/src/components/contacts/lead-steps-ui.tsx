'use client';

// Peças visuais das Etapas do Lead: selo de status, ícone e Painel de Progresso.

import React from 'react';
import { Check, CircleDashed, Clock, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LeadStep, StepKey, StepStatus } from '@/lib/contacts/lead-steps';

export const STATUS_META: Record<StepStatus, { label: string; tone: string; bar: string; icon: React.ElementType }> = {
  feito: { label: 'Feito', tone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', bar: 'bg-emerald-500', icon: Check },
  faltando: { label: 'Faltando', tone: 'text-amber-300 bg-amber-500/10 border-amber-500/30', bar: 'bg-amber-400', icon: CircleDashed },
  opcional: { label: 'Opcional', tone: 'text-muted-foreground bg-muted/60 border-border', bar: 'bg-border', icon: CircleDashed },
  desatualizado: { label: 'Desatualizado', tone: 'text-orange-300 bg-orange-500/10 border-orange-500/30', bar: 'bg-orange-400', icon: Clock },
};

export function StatusChip({ status }: { status: StepStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium', meta.tone)}>
      <Icon className="size-3" aria-hidden />
      {meta.label}
    </span>
  );
}

export function StepIcon({ status }: { status: StepStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={cn('grid size-6 shrink-0 place-items-center rounded-full border', meta.tone)}>
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}

const NEXT_ACTION: Record<StepKey, string> = {
  briefing: 'Completar briefing',
  dossie: 'Consultar Google Maps',
  raspagem: 'Raspar site',
  catalogo: 'Enviar arquivos',
  diagnostico: 'Gerar Diagnóstico',
  prompt: 'Gerar Prompt Mestre',
};

export function nextStepActionLabel(step: LeadStep): string {
  return step.key === 'prompt' && step.status === 'desatualizado' ? 'Atualizar Prompt Mestre' : NEXT_ACTION[step.key];
}

interface NextStepButtonProps {
  step: LeadStep | null;
  busy?: boolean;
  onRun: (step: LeadStep) => void;
}

export function NextStepButton({ step, busy, onRun }: NextStepButtonProps) {
  if (!step) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400">
        <Check className="size-4" aria-hidden /> Tudo pronto
      </span>
    );
  }
  return (
    <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => onRun(step)}>
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
      {nextStepActionLabel(step)}
    </Button>
  );
}

interface LeadProgressPanelProps {
  steps: LeadStep[];
  active?: StepKey | null;
  onSelect: (key: StepKey) => void;
}

/** Painel de Progresso: barra segmentada clicável com o status de cada Etapa do Lead. */
export function LeadProgressPanel({ steps, active, onSelect }: LeadProgressPanelProps) {
  return (
    <nav aria-label="Etapas do lead">
      <ol className="flex gap-1">
        {steps.map((s) => (
          <li key={s.key} className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onSelect(s.key)}
              aria-current={active === s.key ? 'step' : undefined}
              title={`${s.label}: ${STATUS_META[s.status].label} · ${s.summary}`}
              className={cn(
                'w-full rounded-md px-2 pb-2 pt-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active === s.key ? 'bg-muted' : 'hover:bg-muted/50'
              )}
            >
              <span className={cn('mb-1.5 block h-1 rounded-full', STATUS_META[s.status].bar)} aria-hidden />
              <span className="block truncate text-xs font-medium">{s.label}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                <span className="sr-only">{STATUS_META[s.status].label}: </span>
                {s.summary}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
