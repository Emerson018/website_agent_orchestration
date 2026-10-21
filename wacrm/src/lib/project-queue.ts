export interface ProjectQueueItem {
  id: number;
  created_at: string;
  mensagem_lead: string;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
  resultado_json: {
    account_id?: string;
    user_id?: string;
    contact_id?: string;
    project_name?: string;
    target_project_path?: string;
    custom_requirements?: Record<string, unknown>;
    erro?: string;
    [key: string]: unknown;
  } | null;
  supabase_url: string | null;
  supabase_anon_key: string | null;
}

export interface EnqueueProjectInput {
  project_name: string;
  contact_id?: string | null;
  branding?: {
    palette_name?: string;
    primary_color_hex?: string;
    secondary_color_hex?: string;
    bg_color_hex?: string;
    surface_color_hex?: string;
    text_color_hex?: string;
    muted_color_hex?: string;
    theme?: string;
    font_heading?: string;
    font_body?: string;
    layout_concept?: string;
    focal_element?: string;
    design_critique?: string;
    copy_tone?: string;
    [key: string]: unknown;
  };
  modules?: string[];
  reference_links?: Array<{ url: string; type?: string; notes?: string }>;
  client_info?: {
    email?: string;
    phone?: string;
  };
  summary?: {
    total_setup_price?: number;
    monthly_maintenance?: number;
  };
  supabase_url?: string | null;
  supabase_anon_key?: string | null;
  supabase_service_role_key?: string | null;
  ai_analysis?: string;
  additional_data?: Record<string, unknown>;
}

/**
 * Normalizes a tenant Supabase URL or bare project ref into `https://<ref>.supabase.co`.
 */
export function normalizeTenantSupabaseUrl(rawUrl?: string | null): string {
  const cleaned = (rawUrl || '').trim();
  if (!cleaned) return '';
  const withProtocol =
    cleaned.startsWith('http://') || cleaned.startsWith('https://')
      ? cleaned
      : `https://${cleaned}.supabase.co`;
  return withProtocol.replace(/\/+$/, '');
}

async function fetchPortalBackend(
  endpointPath: string,
  options?: RequestInit,
  fetchFn: typeof fetch = fetch
): Promise<Response> {
  try {
    const res = await fetchFn(`http://localhost:5000${endpointPath}`, options);
    if (res.ok) return res;
  } catch {}
  return fetchFn(`http://127.0.0.1:5000${endpointPath}`, options);
}

/**
 * Enqueues a project in Portal Fábrica (`POST /api/projetos` with `auto_process: true`)
 * and triggers compilation if the backend did not auto-dispatch it.
 */
export async function enqueueAndTriggerBuild(
  input: EnqueueProjectInput,
  fetchFn: typeof fetch = fetch
): Promise<{ projectId: number; project: Record<string, unknown> }> {
  const normalizedUrl = normalizeTenantSupabaseUrl(input.supabase_url);
  const payload = {
    project_name: input.project_name || 'Projeto Sem Nome',
    contact_id: input.contact_id || undefined,
    branding: input.branding || { palette_name: 'Definida via RAG' },
    modules: input.modules && input.modules.length > 0 ? input.modules : ['agendador_pwa'],
    reference_links: input.reference_links || [],
    client_info: {
      email: input.client_info?.email || '',
      phone: input.client_info?.phone || '',
    },
    ...(input.summary ? { summary: input.summary } : {}),
    supabase_url: normalizedUrl,
    supabase_anon_key: (input.supabase_anon_key || '').trim(),
    supabase_service_role_key: (input.supabase_service_role_key || '').trim(),
    ai_analysis: input.ai_analysis || '',
    ...(input.additional_data ? { additional_data: input.additional_data } : {}),
    auto_process: true,
  };

  const createRes = await fetchPortalBackend(
    '/api/projetos',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetchFn
  );

  if (!createRes.ok) {
    throw new Error('Erro ao registrar o projeto na fila.');
  }

  const newProject = (await createRes.json()) as Record<string, unknown>;
  const projectId = Number(newProject.id);

  if (!newProject.auto_dispatched) {
    const processRes = await fetchPortalBackend(
      `/api/projetos/${projectId}/processar`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      fetchFn
    );

    if (!processRes.ok) {
      throw new Error('Erro ao iniciar a geração do site.');
    }
  }

  return { projectId, project: newProject };
}

/**
 * Filters `fila_projetos` items belonging to a CRM Contact.
 * Prioritizes exact `resultado_json.contact_id` match; falls back to legacy text heuristics
 * only when `contact_id` was not recorded on the queue item.
 */
export function filterProjectsForContact<T extends ProjectQueueItem>(
  projects: T[],
  contact: { id: string; name?: string | null; phone?: string | null; email?: string | null } | null
): T[] {
  if (!contact) return [];

  const contactName = (contact.name || '').trim().toLowerCase();
  const contactPhone = contact.phone ? contact.phone.replace(/\D/g, '') : '';
  const contactEmail = (contact.email || '').trim().toLowerCase();

  return projects.filter((p) => {
    const itemContactId = p.resultado_json?.contact_id;
    if (itemContactId) {
      return itemContactId === contact.id;
    }

    const projectMsg = (p.mensagem_lead || '').toLowerCase();
    const projectName = String(p.resultado_json?.project_name || '').toLowerCase();

    if (projectName && contactName && projectName === contactName) return true;
    if (contactName && contactName.length > 2 && projectMsg.includes(contactName)) return true;
    if (contactPhone && contactPhone.length > 5 && projectMsg.includes(contactPhone)) return true;
    if (contactEmail && contactEmail.length > 3 && projectMsg.includes(contactEmail)) return true;

    return false;
  });
}

/**
 * Extracts a human-readable brand name from a queue item's briefing or metadata.
 */
export function extractProjectBrandName(project: ProjectQueueItem): string {
  const titleMatch = project.mensagem_lead?.match(
    /Nome do Estabelecimento \/ Marca(?:\*+)?:\s*'([^']+)'/i
  );
  if (titleMatch?.[1]) {
    return titleMatch[1];
  }
  if (typeof project.resultado_json?.project_name === 'string' && project.resultado_json.project_name) {
    return project.resultado_json.project_name;
  }
  return `Projeto #${project.id}`;
}
