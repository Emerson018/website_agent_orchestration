import { describe, it, expect, vi } from 'vitest';
import {
  listContactsWithTags,
  getContactById,
  listConversationsWithContacts,
} from '../crm-repository';

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
