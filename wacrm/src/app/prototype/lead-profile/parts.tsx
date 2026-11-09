'use client';

// PROTÓTIPO DESCARTÁVEL — peças compartilhadas entre as variantes do novo perfil do lead.

import React, { useState } from 'react';
import { AlertTriangle, Check, CircleDashed, Clock, Copy, RotateCcw, Sparkles, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  STEP_ACTIONS,
  type ChecklistItem,
  type FakeLead,
  type StepKey,
  type StepState,
  type StepStatus,
} from './fake-leads';

export const STATUS_META: Record<StepStatus, { label: string; className: string; icon: React.ElementType }> = {
  feito: { label: 'Feito', className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', icon: Check },
  faltando: { label: 'Faltando', className: 'text-amber-300 bg-amber-500/10 border-amber-500/30', icon: CircleDashed },
  opcional: { label: 'Opcional', className: 'text-muted-foreground bg-muted/60 border-border', icon: CircleDashed },
  desatualizado: { label: 'Desatualizado', className: 'text-orange-300 bg-orange-500/10 border-orange-500/30', icon: Clock },
};

export function StatusChip({ status, compact = false }: { status: StepStatus; compact?: boolean }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium', meta.className)}>
      <Icon className="size-3" aria-hidden />
      {!compact && meta.label}
      {compact && <span className="sr-only">{meta.label}</span>}
    </span>
  );
}

export function StepIcon({ status }: { status: StepStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={cn('grid size-6 shrink-0 place-items-center rounded-full border', meta.className)}>
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}

export function NextStepButton({ step, disabled }: { step: StepState | null; disabled?: boolean }) {
  if (!step) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400">
        <Check className="size-4" /> Tudo pronto
      </span>
    );
  }
  return (
    <Button size="sm" className="gap-1.5" disabled={disabled}>
      <Sparkles className="size-3.5" />
      {step.status === 'desatualizado' ? 'Atualizar Prompt Mestre' : STEP_ACTIONS[step.key]}
    </Button>
  );
}

const Row = ({ k, v }: { k: string; v?: React.ReactNode }) => (
  <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-1 text-sm">
    <dt className="text-muted-foreground">{k}</dt>
    <dd className={cn(!v && 'text-muted-foreground/70 italic')}>{v || 'Não informado'}</dd>
  </div>
);

function EmptyStep({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

/** Conteúdo de cada etapa; as variantes decidem onde e como ele aparece. */
export function StepBody({ stepKey, lead }: { stepKey: StepKey; lead: FakeLead }) {
  const d = lead.dossie;
  switch (stepKey) {
    case 'briefing':
      return (
        <dl>
          <Row k="Responsável" v={lead.contact.name} />
          <Row k="Empresa" v={lead.contact.company} />
          <Row k="WhatsApp" v={lead.contact.phone} />
          <Row k="E-mail" v={lead.contact.email} />
          <Row k="Site" v={lead.contact.website} />
        </dl>
      );
    case 'dossie':
      if (!d) return <EmptyStep text="Nenhum dossiê ainda. Consulte o Google Maps para trazer fotos, avaliações, horários e endereço." />;
      return (
        <div className="space-y-4">
          <dl>
            <Row k="Nome verificado" v={d.nome_verificado} />
            <Row k="Reputação" v={`${d.nota}★ em ${d.total_avaliacoes} avaliações`} />
            <Row k="Endereço" v={d.endereco} />
            <Row k="Telefone do local" v={d.telefone} />
            <Row k="Horários" v={d.horarios.join(' · ')} />
            <Row k="Atendimento" v={d.modalidades.join(' · ')} />
          </dl>
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: d.fotos }).map((_, i) => (
              <div key={i} className="aspect-square rounded-md bg-muted" aria-label={`Foto ${i + 1}`} />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <h4 className="mb-1 text-xs font-semibold text-emerald-400">Avaliações 5 estrelas</h4>
              <ul className="space-y-1 text-sm text-foreground/90">
                {d.avaliacoes5.map((t) => (
                  <li key={t}>“{t}”</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold text-amber-300">Dores de atendimento</h4>
              {d.dores.length ? (
                <ul className="space-y-1 text-sm text-foreground/90">
                  {d.dores.map((t) => (
                    <li key={t}>“{t}”</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Sem avaliações negativas.</p>
              )}
            </div>
          </div>
          <details className="rounded-lg border border-border px-3 py-2 text-sm">
            <summary className="cursor-pointer font-medium">Pitch comercial para WhatsApp</summary>
            <p className="mt-2 text-muted-foreground">{d.pitch}</p>
          </details>
        </div>
      );
    case 'raspagem':
      if (!lead.raspagem)
        return (
          <EmptyStep
            text={
              lead.hasSite
                ? 'O site ainda não foi raspado. Raspe para trazer cardápio, preços e textos institucionais.'
                : 'Este lead não tem site nem URL cadastrada. A raspagem é opcional.'
            }
          />
        );
      return (
        <dl>
          <Row k="URLs" v={lead.raspagem.urls.join(', ')} />
          <Row k="Itens encontrados" v={String(lead.raspagem.itens)} />
          <Row k="Sobre" v={lead.raspagem.sobre} />
        </dl>
      );
    case 'catalogo':
      if (!lead.catalogo)
        return <EmptyStep text="Opcional. Envie fotos ou PDFs do cardápio, tabela de preços ou catálogo para a IA organizar os itens." />;
      return (
        <dl>
          <Row k="Arquivos" v={`${lead.catalogo.arquivos} enviados`} />
          <Row k="Itens" v={String(lead.catalogo.itens)} />
          <Row k="Categorias" v={lead.catalogo.categorias.join(' · ')} />
          <Row k="Pagamento" v={lead.catalogo.pagamento} />
        </dl>
      );
    case 'diagnostico':
      if (!lead.diagnostico)
        return <EmptyStep text={d ? 'Gere o diagnóstico para a IA descrever a empresa, o estilo visual e o público.' : 'Depende do dossiê. Consulte o Google Maps primeiro.'} />;
      return (
        <dl>
          <Row k="Resumo" v={lead.diagnostico.resumo} />
          <Row k="Estilo visual" v={lead.diagnostico.vibe} />
          <Row k="Público" v={lead.diagnostico.publico} />
        </dl>
      );
    case 'prompt':
      return lead.prompt ? (
        <p className="text-sm text-muted-foreground">O Prompt Mestre fica sempre visível na coluna ao lado.</p>
      ) : (
        <EmptyStep text="O Prompt Mestre é gerado junto com o diagnóstico." />
      );
  }
}

export function SiteChecklist({ items }: { items: ChecklistItem[] }) {
  const missing = items.filter((i) => !i.present).length;
  return (
    <section aria-labelledby="checklist-title" className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 id="checklist-title" className="text-sm font-semibold">
          Dados do site
        </h3>
        <span className={cn('text-xs', missing ? 'text-amber-300' : 'text-emerald-400')}>
          {missing ? `${missing} faltando` : 'Completo'}
        </span>
      </div>
      <ul className="divide-y divide-border/60">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 py-1.5 text-sm">
            {item.present ? (
              <Check className="size-3.5 shrink-0 text-emerald-400" aria-label="Presente" />
            ) : (
              <X className="size-3.5 shrink-0 text-amber-300" aria-label="Faltando" />
            )}
            <span className={cn('flex-1', !item.present && 'text-muted-foreground')}>{item.label}</span>
            <span className="text-[11px] text-muted-foreground">{item.source || '—'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PromptPanel({ lead, status }: { lead: FakeLead; status: StepStatus }) {
  return (
    <section aria-labelledby="prompt-title" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 id="prompt-title" className="text-sm font-semibold">
          Prompt Mestre
        </h3>
        <StatusChip status={status} />
      </div>
      {status === 'desatualizado' && (
        <p className="flex items-start gap-1.5 text-xs text-orange-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          O Catálogo Extraído mudou depois que este prompt foi gerado.
        </p>
      )}
      {lead.prompt ? (
        <>
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-background/60 p-3 text-xs leading-relaxed text-foreground/85">
            {lead.prompt.texto}
          </pre>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 gap-1.5">
              <Copy className="size-3.5" /> Copiar Prompt Mestre
            </Button>
            {status === 'desatualizado' && (
              <Button size="sm" variant="outline" className="gap-1.5">
                <RotateCcw className="size-3.5" /> Atualizar
              </Button>
            )}
          </div>
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
          Ainda não gerado. Ele aparece aqui depois do diagnóstico.
        </p>
      )}
    </section>
  );
}

export function DisqualifyButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground hover:text-destructive" onClick={() => setOpen((o) => !o)}>
        <XCircle className="size-3.5" /> Desqualificar
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-64 space-y-2 rounded-lg border border-border bg-popover p-3 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.5)]">
          <p className="text-xs font-semibold">Motivo</p>
          {['Já tem site', 'Sem perfil para o serviço', 'Sem resposta', 'Fora da região', 'Outro'].map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm">
              <input type="radio" name="motivo" className="accent-[var(--primary)]" /> {m}
            </label>
          ))}
          <textarea placeholder="Detalhe (opcional)" className="h-14 w-full rounded-md border border-border bg-background p-2 text-xs" />
          <Button size="sm" variant="destructive" className="w-full" onClick={() => setOpen(false)}>
            Desqualificar lead
          </Button>
        </div>
      )}
    </div>
  );
}

export function DisqualifiedBanner({ lead }: { lead: FakeLead }) {
  if (!lead.desqualificacao) return null;
  const q = lead.desqualificacao;
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
      <XCircle className="size-4 text-destructive" />
      <span className="flex-1">
        <strong className="font-semibold">Desqualificado em {new Date(q.em).toLocaleDateString('pt-BR')}</strong>
        <span className="text-muted-foreground"> · {q.motivo}{q.detalhe ? ` — ${q.detalhe}` : ''}</span>
      </span>
      <Button size="sm" variant="outline" className="gap-1.5">
        <RotateCcw className="size-3.5" /> Reabrir
      </Button>
    </div>
  );
}

export function LeadTitle({ lead }: { lead: FakeLead }) {
  return (
    <div className="min-w-0">
      <h1 className="truncate text-xl font-semibold tracking-tight">{lead.contact.company || lead.contact.name || 'Lead sem nome'}</h1>
      <p className="truncate text-sm text-muted-foreground">
        {[lead.contact.name, lead.contact.phone].filter(Boolean).join(' · ')}
      </p>
    </div>
  );
}
