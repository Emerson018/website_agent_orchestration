'use client';

// PROTÓTIPO DESCARTÁVEL — três disposições do novo perfil do lead (/contacts/[id]),
// alternáveis por ?variant=A|B|C, com quatro leads fictícios via ?lead=.
// Dados em memória; nada é gravado. Fica só na branch prototype/lead-profile-layout.

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PrototypeSwitcher } from '@/components/prototype-switcher';
import { FAKE_LEADS } from './fake-leads';
import { VARIANTS } from './variants';

function Prototype() {
  const params = useSearchParams();
  const variant = VARIANTS.find((v) => v.key === params.get('variant')) ?? VARIANTS[0];
  const lead = FAKE_LEADS.find((l) => l.key === params.get('lead')) ?? FAKE_LEADS[2];
  const Component = variant.Component;

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      {/* key força o reset do estado interno ao trocar de lead */}
      <Component key={`${variant.key}-${lead.key}`} lead={lead} />
      <PrototypeSwitcher
        variants={VARIANTS.map(({ key, name }) => ({ key, name }))}
        extra={{ param: 'lead', label: 'Lead', options: FAKE_LEADS.map((l) => ({ key: l.key, name: l.label })) }}
      />
    </div>
  );
}

export default function LeadProfilePrototypePage() {
  return (
    <Suspense>
      <Prototype />
    </Suspense>
  );
}
