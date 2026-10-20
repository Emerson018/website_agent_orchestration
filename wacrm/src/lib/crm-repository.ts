import type { Contact, Conversation, Tag } from '@/types';

export interface ContactWithTags extends Contact {
  tags?: Tag[];
  contact_tags?: Array<{
    tag_id: string;
    tags?: Tag | null;
  }>;
}

export interface ListContactsParams {
  supabase: any;
  page: number;
  pageSize: number;
  search?: string;
  tagsMap?: Record<string, Tag>;
  fetchFn?: typeof fetch;
}

export interface ListContactsResult {
  contacts: ContactWithTags[];
  count: number;
  error: { message: string } | null;
}

/**
 * Lists contacts with pagination, search, and tag enrichment.
 * Automatically falls back to `/api/contacts` when browser RLS returns empty or errors,
 * and preserves tags from either embedded `contact_tags(tag_id, tags(*))` or `tagsMap`.
 */
export async function listContactsWithTags({
  supabase,
  page,
  pageSize,
  search = '',
  tagsMap = {},
  fetchFn = fetch,
}: ListContactsParams): Promise<ListContactsResult> {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const trimmedSearch = search.trim();

  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (trimmedSearch) {
    const term = `%${trimmedSearch}%`;
    query = query.or(`name.ilike.${term},phone.ilike.${term},email.ilike.${term}`);
  }

  let { data, count, error } = await query;

  if (error || !data || data.length === 0) {
    try {
      const apiRes = await fetchFn(
        `/api/contacts?page=${page}&limit=${pageSize}&search=${encodeURIComponent(trimmedSearch)}`
      );
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (Array.isArray(apiData.contacts)) {
          data = apiData.contacts;
          count = apiData.count ?? apiData.contacts.length;
          error = null;
        }
      }
    } catch (err) {
      console.warn('Fallback /api/contacts failed:', err);
    }
  }

  if (error) {
    return { contacts: [], count: 0, error };
  }

  if (!data || data.length === 0) {
    return { contacts: [], count: count ?? 0, error: null };
  }

  const contactIds = data.map((c: Contact) => c.id);
  const tagsByContact: Record<string, Tag[]> = {};

  // 1. Extract embedded tags if returned by `/api/contacts`
  for (const row of data as ContactWithTags[]) {
    if (Array.isArray(row.contact_tags) && row.contact_tags.length > 0) {
      const resolvedTags = row.contact_tags
        .map((ct) => ct.tags || (ct.tag_id ? tagsMap[ct.tag_id] : undefined))
        .filter((t): t is Tag => Boolean(t));
      if (resolvedTags.length > 0) {
        tagsByContact[row.id] = resolvedTags;
      }
    }
  }

  // 2. Query browser `contact_tags` for any contacts not already enriched
  const needsBrowserTags = data.some((c: Contact) => !tagsByContact[c.id]);
  if (needsBrowserTags && supabase.from) {
    try {
      const { data: contactTags } = await supabase
        .from('contact_tags')
        .select('contact_id, tag_id, tags(*)')
        .in('contact_id', contactIds);

      contactTags?.forEach((ct: { contact_id: string; tag_id: string; tags?: Tag }) => {
        if (!tagsByContact[ct.contact_id]) tagsByContact[ct.contact_id] = [];
        const resolved = ct.tags || tagsMap[ct.tag_id];
        if (resolved && !tagsByContact[ct.contact_id].some((existing) => existing.id === resolved.id)) {
          tagsByContact[ct.contact_id].push(resolved);
        }
      });
    } catch {}
  }

  const enriched: ContactWithTags[] = data.map((c: ContactWithTags) => ({
    ...c,
    tags: tagsByContact[c.id] ?? c.tags ?? [],
  }));

  return {
    contacts: enriched,
    count: count ?? enriched.length,
    error: null,
  };
}

/**
 * Fetches a single contact by ID with transparent `/api/contacts/[id]` fallback.
 */
export async function getContactById(
  supabase: any,
  contactId: string,
  fetchFn: typeof fetch = fetch
): Promise<Contact | null> {
  if (!contactId) return null;

  let { data } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .maybeSingle();

  if (!data) {
    try {
      const res = await fetchFn(`/api/contacts/${contactId}`);
      if (res.ok) {
        data = await res.json();
      }
    } catch {}
  }

  return data ?? null;
}

/**
 * Lists conversations with joined contacts in descending `last_message_at` order,
 * falling back to `/api/conversations` when browser RLS returns empty or errors.
 */
export async function listConversationsWithContacts(
  supabase: any,
  fetchFn: typeof fetch = fetch
): Promise<{ conversations: Conversation[]; error: any }> {
  let { data, error } = await supabase
    .from('conversations')
    .select('*, contact:contacts(*)')
    .order('last_message_at', { ascending: false });

  if (error || !data || data.length === 0) {
    try {
      const apiRes = await fetchFn('/api/conversations');
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (Array.isArray(apiData)) {
          data = apiData;
          error = null;
        }
      }
    } catch (e) {
      console.warn('Fallback /api/conversations failed:', e);
    }
  }

  return {
    conversations: (data ?? []) as Conversation[],
    error: error ?? null,
  };
}
