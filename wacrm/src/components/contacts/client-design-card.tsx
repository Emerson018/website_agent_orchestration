'use client';

import { useState } from 'react';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ClientDesignCardProps {
  /** O DESIGN.md salvo deste cliente, ou vazio. */
  markdown: string;
  salvoEm?: string;
  /** Salva o texto (vazio limpa). Os Prompts Mestre deste cliente ficam Desatualizados. */
  onSave: (markdown: string) => Promise<void>;
}

/**
 * Design do Cliente (GLOSSARY.md): o operador cola aqui o DESIGN.md do primeiro projeto feito para este
 * cliente, e todos os Prompts Mestre dele passam a seguir esse design. Outro cliente nunca o recebe.
 */
export function ClientDesignCard({ markdown, salvoEm, onSave }: ClientDesignCardProps) {
  const [draft, setDraft] = useState(markdown);
  const [synced, setSynced] = useState(markdown);
  const [saving, setSaving] = useState(false);
  if (markdown !== synced) {
    setSynced(markdown);
    setDraft(markdown);
  }
  const dirty = draft.trim() !== markdown.trim();

  async function save(value: string) {
    setSaving(true);
    try {
      await onSave(value);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Palette className="size-4 text-muted-foreground" />
          Design do Cliente
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {markdown
            ? 'Os prompts deste cliente seguem este design, para os projetos combinarem.'
            : 'Cole aqui o DESIGN.md do primeiro projeto deste cliente. Sem ele, cada prompt pede um design novo.'}
        </p>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="# DESIGN.md"
        aria-label="Design do Cliente (DESIGN.md)"
        rows={markdown ? 8 : 4}
        className="w-full resize-y rounded-xl border border-border bg-background/60 p-3 font-mono text-xs leading-relaxed text-foreground focus:border-primary focus:outline-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {markdown && salvoEm ? `Salvo em ${new Date(salvoEm).toLocaleDateString('pt-BR')}` : ''}
        </span>
        <div className="flex gap-2">
          {markdown && (
            <Button size="sm" variant="ghost" className="h-8 text-xs" disabled={saving} onClick={() => save('')}>
              Limpar
            </Button>
          )}
          <Button size="sm" className="h-8 text-xs" disabled={saving || !dirty || !draft.trim()} onClick={() => save(draft)}>
            {saving ? 'Salvando...' : 'Salvar design'}
          </Button>
        </div>
      </div>
    </div>
  );
}
