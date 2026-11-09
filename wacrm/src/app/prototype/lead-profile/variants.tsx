'use client';

// PROTÓTIPO DESCARTÁVEL — três disposições estruturalmente diferentes do novo perfil do lead.
// A: Coluna contínua · B: Trilho de etapas · C: Etapa em foco

import React, { useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeChecklist, computeSteps, nextStep, type FakeLead, type StepKey } from './fake-leads';
import {
  DisqualifiedBanner,
  DisqualifyButton,
  LeadTitle,
  NextStepButton,
  PromptPanel,
  SiteChecklist,
  StatusChip,
  StepBody,
  StepIcon,
} from './parts';

interface VariantProps {
  lead: FakeLead;
}

function BackLink() {
  return (
    <a href="#" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-3.5" /> Contatos
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* A — Coluna contínua: painel de progresso horizontal, etapas empilhadas */
/* ------------------------------------------------------------------ */
export function VariantA({ lead }: VariantProps) {
  const steps = computeSteps(lead);
  const next = lead.desqualificacao ? null : nextStep(steps);
  const promptStatus = steps.find((s) => s.key === 'prompt')!.status;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-6 py-6">
      <BackLink />
      <header className="flex flex-wrap items-center justify-between gap-4">
        <LeadTitle lead={lead} />
        {!lead.desqualificacao && <DisqualifyButton />}
      </header>
      <DisqualifiedBanner lead={lead} />

      {/* Painel de Progresso */}
      <section aria-label="Progresso do lead" className="rounded-xl border border-border bg-card p-4">
        <ol className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-6">
          {steps.map((s, i) => (
            <li key={s.key}>
              <a href={`#etapa-${s.key}`} className="group flex items-start gap-2.5">
                <StepIcon status={s.status} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium group-hover:underline">
                    {i + 1}. {s.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{s.summary}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
        {!lead.desqualificacao && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
            <p className="text-sm text-muted-foreground">
              {next ? (
                <>
                  Próximo passo: <span className="font-medium text-foreground">{next.label}</span>
                </>
              ) : (
                'Todas as etapas obrigatórias estão prontas.'
              )}
            </p>
            <NextStepButton step={next} />
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          {steps.map((s, i) => (
            <section key={s.key} id={`etapa-${s.key}`} className="scroll-mt-6 rounded-xl border border-border bg-card">
              <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
                <h2 className="text-sm font-semibold">
                  {i + 1}. {s.label}
                </h2>
                <StatusChip status={s.status} />
              </header>
              <div className="px-5 py-4">
                <StepBody stepKey={s.key} lead={lead} />
              </div>
            </section>
          ))}
        </div>
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-4">
            <SiteChecklist items={computeChecklist(lead)} />
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <PromptPanel lead={lead} status={promptStatus} />
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* B — Trilho de etapas: navegação vertical fixa à esquerda           */
/* ------------------------------------------------------------------ */
export function VariantB({ lead }: VariantProps) {
  const steps = computeSteps(lead);
  const next = lead.desqualificacao ? null : nextStep(steps);
  const promptStatus = steps.find((s) => s.key === 'prompt')!.status;
  const done = steps.filter((s) => s.status === 'feito').length;

  return (
    <div className="mx-auto grid max-w-[1500px] gap-0 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
      {/* Trilho = Painel de Progresso */}
      <nav aria-label="Etapas do lead" className="border-border px-5 py-6 lg:sticky lg:top-0 lg:h-screen lg:border-r">
        <BackLink />
        <div className="mt-4">
          <LeadTitle lead={lead} />
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          {done} de {steps.length} etapas feitas
        </p>
        <ol className="relative mt-3 space-y-1">
          {steps.map((s) => (
            <li key={s.key}>
              <a
                href={`#b-etapa-${s.key}`}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted/60',
                  next?.key === s.key && 'bg-muted'
                )}
              >
                <StepIcon status={s.status} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{s.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{s.summary}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
        {!lead.desqualificacao && (
          <div className="mt-5 space-y-2">
            <NextStepButton step={next} />
            <div>
              <DisqualifyButton />
            </div>
          </div>
        )}
      </nav>

      {/* Conteúdo das etapas, sem caixas: separação por espaço e régua */}
      <main className="min-w-0 px-8 py-6">
        <DisqualifiedBanner lead={lead} />
        <div className="divide-y divide-border">
          {steps.map((s) => (
            <section key={s.key} id={`b-etapa-${s.key}`} className="scroll-mt-4 py-7 first:pt-2">
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-base font-semibold">{s.label}</h2>
                <StatusChip status={s.status} />
              </div>
              <StepBody stepKey={s.key} lead={lead} />
            </section>
          ))}
        </div>
      </main>

      <aside className="space-y-8 border-border bg-card/40 px-5 py-6 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-l">
        <SiteChecklist items={computeChecklist(lead)} />
        <PromptPanel lead={lead} status={promptStatus} />
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* C — Etapa em foco: só uma etapa aberta, as demais em linhas resumo   */
/* ------------------------------------------------------------------ */
export function VariantC({ lead }: VariantProps) {
  const steps = computeSteps(lead);
  const next = lead.desqualificacao ? null : nextStep(steps);
  const promptStatus = steps.find((s) => s.key === 'prompt')!.status;
  const [open, setOpen] = useState<StepKey>(next?.key || 'dossie');

  return (
    <div className="mx-auto max-w-[1300px] space-y-5 px-6 py-6">
      <BackLink />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <LeadTitle lead={lead} />
        <div className="flex items-center gap-2">
          {!lead.desqualificacao && <DisqualifyButton />}
          {!lead.desqualificacao && <NextStepButton step={next} />}
        </div>
      </header>
      <DisqualifiedBanner lead={lead} />

      {/* Painel de Progresso: barra segmentada clicável */}
      <nav aria-label="Etapas do lead" className="flex gap-1">
        {steps.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setOpen(s.key)}
            aria-current={open === s.key ? 'step' : undefined}
            className={cn(
              'flex-1 rounded-md px-2 pb-2 pt-1.5 text-left transition-colors',
              open === s.key ? 'bg-muted' : 'hover:bg-muted/50'
            )}
          >
            <span
              className={cn(
                'mb-1.5 block h-1 rounded-full',
                { feito: 'bg-emerald-500', faltando: 'bg-amber-400', opcional: 'bg-border', desatualizado: 'bg-orange-400' }[s.status]
              )}
            />
            <span className="block truncate text-xs font-medium">{s.label}</span>
          </button>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {steps.map((s) => {
            const isOpen = open === s.key;
            return (
              <section key={s.key} className="border-b border-border/60 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpen(s.key)}
                  aria-expanded={isOpen}
                  className={cn('flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-muted/40', isOpen && 'bg-muted/30')}
                >
                  <StepIcon status={s.status} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{s.label}</span>
                    {!isOpen && <span className="block truncate text-xs text-muted-foreground">{s.summary}</span>}
                  </span>
                  <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1">
                    <StepBody stepKey={s.key} lead={lead} />
                  </div>
                )}
              </section>
            );
          })}
        </div>
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-4">
            <PromptPanel lead={lead} status={promptStatus} />
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <SiteChecklist items={computeChecklist(lead)} />
          </div>
        </aside>
      </div>
    </div>
  );
}

export const VARIANTS = [
  { key: 'A', name: 'Coluna contínua', Component: VariantA },
  { key: 'B', name: 'Trilho de etapas', Component: VariantB },
  { key: 'C', name: 'Etapa em foco', Component: VariantC },
] as const;
