'use client';

// PROTÓTIPO — barra flutuante para alternar variantes de um protótipo de UI via ?variant=.
// Some em builds de produção.

import React, { useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface Option {
  key: string;
  name: string;
}

interface PrototypeSwitcherProps {
  variants: readonly Option[];
  /** Um segundo eixo opcional (ex.: ?lead=), mostrado como seletor. */
  extra?: { param: string; label: string; options: readonly Option[] };
}

export function PrototypeSwitcher({ variants, extra }: PrototypeSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get('variant') ?? variants[0].key;
  const index = Math.max(0, variants.findIndex((v) => v.key === current));

  const setParam = useCallback(
    (name: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      next.set(name, value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  const step = useCallback(
    (delta: number) => setParam('variant', variants[(index + delta + variants.length) % variants.length].key),
    [index, setParam, variants]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.closest('input, textarea, select, [contenteditable]') || t.isContentEditable)) return;
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  if (process.env.NODE_ENV === 'production') return null;

  const v = variants[index];
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-[0_10px_30px_-6px_rgb(0_0_0/0.6)] ring-1 ring-black/10">
      <button type="button" onClick={() => step(-1)} className="rounded-full p-1.5 hover:bg-zinc-100" aria-label="Variante anterior">
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-44 px-1 text-center font-medium">
        {v.key} <span className="text-zinc-500">({v.name})</span>
      </span>
      <button type="button" onClick={() => step(1)} className="rounded-full p-1.5 hover:bg-zinc-100" aria-label="Próxima variante">
        <ChevronRight className="size-4" />
      </button>
      {extra && (
        <label className="ml-1 flex items-center gap-1.5 border-l border-zinc-200 pl-3 pr-1">
          <span className="text-zinc-500">{extra.label}</span>
          <select
            value={params.get(extra.param) ?? extra.options[0].key}
            onChange={(e) => setParam(extra.param, e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-1.5 py-0.5 text-sm"
          >
            {extra.options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
