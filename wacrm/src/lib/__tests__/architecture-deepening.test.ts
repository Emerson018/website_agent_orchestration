import { describe, it, expect, vi } from 'vitest';
import {
  sanitizeWorkspaceSlug,
  resolveWorkspaceFolder,
  validateAndSanitizeSql,
  deployTenantSchemas,
  EXEC_SQL_SETUP_FUNCTION,
} from '../workspace-provisioner';
import {
  normalizeTenantSupabaseUrl,
  enqueueAndTriggerBuild,
  filterProjectsForContact,
  extractProjectBrandName,
} from '../project-queue';
import {
  listContactsWithTags,
  getContactById,
  listConversationsWithContacts,
} from '../crm-repository';
import {
  DEFAULT_AGENDA_CONFIG,
  deriveBookingLifecycleStatus,
  computeSlotAvailability,
  generateTimeSlots,
  hasUnsavedConfigChanges,
  formatPhoneMask,
  formatWahaChatId,
} from '../../../../gold_templates/template_base_app/frontend/src/services/api.js';

describe('Candidate 3: Workspace Provisioner & Tenant SQL Deployer', () => {
  it('sanitizes workspace slugs consistently with Python provisioner', () => {
    expect(sanitizeWorkspaceSlug('Barbearia Viking & Cia!')).toBe('Barbearia_Viking__Cia');
    expect(sanitizeWorkspaceSlug('   ')).toBe('AppCustomizado');
  });

  it('resolves workspace folder by sanitized, exact, or case-insensitive directory entry', async () => {
    const fakeFs = {
      stat: async (p: string) => {
        if (p.endsWith('barbearia_viking')) {
          return { isDirectory: () => true };
        }
        throw new Error('ENOENT');
      },
      readdir: async () => [
        { name: 'barbearia_viking', isDirectory: () => true },
        { name: 'README.md', isDirectory: () => false },
      ],
      readFile: async () => '',
    };

    const resolved = await resolveWorkspaceFolder('Barbearia Viking', '/workspace', fakeFs);
    expect(resolved).toContain('barbearia_viking');
  });

  it('validates and sanitizes SQL, stripping markdown fences and rejecting prose', () => {
    const raw = '```sql\nCREATE TABLE IF NOT EXISTS servicos (id serial primary key);\n```';
    expect(validateAndSanitizeSql(raw)).toBe(
      'CREATE TABLE IF NOT EXISTS servicos (id serial primary key);'
    );
    expect(() => validateAndSanitizeSql('Desculpe, não consegui gerar o SQL.')).toThrow();
  });

  it('deploys base and extension schemas via injectable RPC runner and detects missing exec_sql', async () => {
    const calls: Array<{ fn: string; args: Record<string, string> }> = [];
    const okRunner = async (fn: string, args: Record<string, string>) => {
      calls.push({ fn, args });
      return { error: null };
    };

    const res = await deployTenantSchemas(
      {
        baseSchema: 'CREATE TABLE t1 (id int);',
        aiSchema: 'CREATE TABLE t2 (id int);',
      },
      okRunner
    );

    expect(res.success).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({ fn: 'exec_sql', args: { sql: 'CREATE TABLE t1 (id int);' } });
    expect(calls[1]).toEqual({ fn: 'exec_sql', args: { sql: 'CREATE TABLE t2 (id int);' } });

    const missingFnRunner = async () => ({
      error: { code: 'PGRST104', message: 'function exec_sql(sql) does not exist' },
    });

    const failRes = await deployTenantSchemas(
      { baseSchema: 'CREATE TABLE t1 (id int);', aiSchema: null },
      missingFnRunner
    );

    expect(failRes.success).toBe(false);
    expect(failRes.isFunctionMissing).toBe(true);
    expect(failRes.setup_sql).toBe(EXEC_SQL_SETUP_FUNCTION);
  });
});

describe('Candidate 2: Project Queue & Build Dispatch', () => {
  it('normalizes tenant Supabase URLs across bare project refs and full URLs', () => {
    expect(normalizeTenantSupabaseUrl('xyzcompany')).toBe('https://xyzcompany.supabase.co');
    expect(normalizeTenantSupabaseUrl('https://xyzcompany.supabase.co/')).toBe(
      'https://xyzcompany.supabase.co'
    );
    expect(normalizeTenantSupabaseUrl('   ')).toBe('');
  });

  it('enqueues and triggers build in a single flow with fallback to /processar when needed', async () => {
    const fetchCalls: Array<{ url: string; body?: any }> = [];
    const fakeFetch = vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      fetchCalls.push({ url, body });
      if (url.endsWith('/api/projetos')) {
        return {
          ok: true,
          json: async () => ({ id: 42, status: 'processando', auto_dispatched: true }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ status: 'processando' }),
      } as Response;
    });

    const result = await enqueueAndTriggerBuild(
      {
        project_name: 'Studio Belle',
        contact_id: 'contact-uuid-1',
        supabase_url: 'studiobelle',
      },
      fakeFetch as unknown as typeof fetch
    );

    expect(result.projectId).toBe(42);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].body.auto_process).toBe(true);
    expect(fetchCalls[0].body.contact_id).toBe('contact-uuid-1');
    expect(fetchCalls[0].body.supabase_url).toBe('https://studiobelle.supabase.co');
  });

  it('filters projects for a contact using exact contact_id first and legacy heuristics as fallback', () => {
    const queueItems = [
      {
        id: 1,
        created_at: '2026-10-19T00:00:00Z',
        mensagem_lead: "### BRIEFING\n- **Nome do Estabelecimento / Marca**: 'Nome Antigo'",
        status: 'concluido' as const,
        resultado_json: {
          contact_id: 'contact-123',
          project_name: 'Nome Antigo',
          target_project_path: '/workspace/Nome_Antigo',
        },
        supabase_url: null,
        supabase_anon_key: null,
      },
      {
        id: 2,
        created_at: '2026-10-19T00:00:00Z',
        mensagem_lead: "### BRIEFING\n- **Nome do Estabelecimento / Marca**: 'Outro Cliente'",
        status: 'pendente' as const,
        resultado_json: {
          contact_id: 'contact-999',
          project_name: 'Outro Cliente',
        },
        supabase_url: null,
        supabase_anon_key: null,
      },
      {
        id: 3,
        created_at: '2026-10-19T00:00:00Z',
        mensagem_lead: 'Contato: 51999887766',
        status: 'pendente' as const,
        resultado_json: {
          project_name: 'Projeto Legado Sem Contact ID',
        },
        supabase_url: null,
        supabase_anon_key: null,
      },
    ];

    const matched = filterProjectsForContact(queueItems, {
      id: 'contact-123',
      name: 'Nome Novo Diferente',
      phone: '(51) 99988-7766',
      email: 'novo@cliente.com',
    });

    expect(matched.map((p) => p.id)).toEqual([1, 3]);
    expect(extractProjectBrandName(queueItems[0])).toBe('Nome Antigo');
  });
});

describe('Candidate 5: CRM Contact & Conversation Repository', () => {
  it('enriches contacts with tags from API fallback when browser Supabase returns empty due to RLS', async () => {
    const emptyBrowserClient = {
      from: (table: string) => {
        if (table === 'contacts') {
          return {
            select: () => ({
              order: () => ({
                range: async () => ({ data: [], count: 0, error: null }),
              }),
            }),
          };
        }
        if (table === 'contact_tags') {
          return {
            select: () => ({
              in: async () => ({ data: [], error: null }),
            }),
          };
        }
        return {};
      },
    };

    const fakeFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        contacts: [
          {
            id: 'c1',
            name: 'Cliente Fallback',
            phone: '5551999999999',
            contact_tags: [
              {
                tag_id: 't1',
                tags: { id: 't1', name: 'VIP', color: '#10b981' },
              },
            ],
          },
        ],
        count: 1,
      }),
    }));

    const result = await listContactsWithTags({
      supabase: emptyBrowserClient as any,
      page: 0,
      pageSize: 25,
      search: '',
      tagsMap: {},
      fetchFn: fakeFetch as unknown as typeof fetch,
    });

    expect(result.error).toBeNull();
    expect(result.count).toBe(1);
    expect(result.contacts).toHaveLength(1);
    expect(result.contacts[0].tags).toEqual([{ id: 't1', name: 'VIP', color: '#10b981' }]);
  });

  it('fetches single contact and conversations via fallback when primary client returns empty', async () => {
    const emptyClient = {
      from: (table: string) => {
        if (table === 'contacts') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          };
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              order: async () => ({ data: [], error: null }),
            }),
          };
        }
        return {};
      },
    };

    const fakeFetch = vi.fn(async (url: string) => {
      if (url.startsWith('/api/contacts/')) {
        return {
          ok: true,
          json: async () => ({ id: 'c-42', name: 'Maria', phone: '51988887777' }),
        };
      }
      return {
        ok: true,
        json: async () => [{ id: 'conv-1', status: 'open', unread_count: 2 }],
      };
    });

    const contact = await getContactById(
      emptyClient as any,
      'c-42',
      fakeFetch as unknown as typeof fetch
    );
    expect(contact?.name).toBe('Maria');

    const convRes = await listConversationsWithContacts(
      emptyClient as any,
      fakeFetch as unknown as typeof fetch
    );
    expect(convRes.error).toBeNull();
    expect(convRes.conversations).toHaveLength(1);
    expect(convRes.conversations[0].id).toBe('conv-1');
  });
});

describe('Candidate 4: Gold Template Scheduling & Booking Store Module', () => {
  it('derives 40-minute booking lifecycle status symmetrically for Supabase and localStorage', () => {
    const now = new Date('2026-10-19T20:15:00');
    expect(deriveBookingLifecycleStatus('Agendado', '2026-10-19T20:00:00', now)).toEqual({
      status: 'Em andamento',
      changed: true,
    });
    expect(deriveBookingLifecycleStatus('Confirmado', '2026-10-19T19:00:00', now)).toEqual({
      status: 'Finalizado',
      changed: true,
    });
    expect(deriveBookingLifecycleStatus('Cancelado', '2026-10-19T19:00:00', now)).toEqual({
      status: 'Cancelado',
      changed: false,
    });
  });

  it('computes slot availability respecting custom limits, past slots, and active bookings', () => {
    const now = new Date('2026-10-19T18:45:00');
    const config = {
      ...DEFAULT_AGENDA_CONFIG,
      vagas_padrao: 3,
      limites_customizados: {
        '2026-10-19': { '19:30': 2 },
      },
    };
    const bookings = [
      { data: '2026-10-19', horario: '19:30', status: 'Agendado' },
      { data: '2026-10-19', horario: '19:30', status: 'Confirmado' },
    ];

    expect(computeSlotAvailability('2026-10-19', '18:30', config, bookings, now)).toEqual({
      available: false,
      remaining: 0,
      limit: 3,
    });

    expect(computeSlotAvailability('2026-10-19', '19:30', config, bookings, now)).toEqual({
      available: false,
      remaining: 0,
      limit: 2,
    });

    expect(computeSlotAvailability('2026-10-19', '20:00', config, bookings, now)).toEqual({
      available: true,
      remaining: 3,
      limit: 3,
    });
  });

  it('generates bulk time slots, detects unsaved config changes, and formats phones/WAHA IDs', () => {
    expect(generateTimeSlots('18:00', '19:30', 30)).toEqual(['18:00', '18:30', '19:00', '19:30']);
    expect(formatPhoneMask('51995239876')).toBe('(51) 99523-9876');
    expect(formatWahaChatId('(51) 99523-9876')).toBe('555195239876@c.us');
    expect(formatWahaChatId('(11) 99523-9876')).toBe('5511995239876@c.us');

    const saved = {
      ...DEFAULT_AGENDA_CONFIG,
      dias_funcionamento: [2, 3, 4],
      horarios_disponiveis: ['18:30', '19:00'],
    };
    expect(hasUnsavedConfigChanges({ ...saved, dias_funcionamento: [4, 2, 3] }, saved)).toBe(false);
    expect(hasUnsavedConfigChanges({ ...saved, antecedencia_maxima_dias: 14 }, saved)).toBe(true);
  });
});
