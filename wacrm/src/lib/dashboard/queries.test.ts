import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { loadConversationsSeries, loadResponseTime } from './queries'
import { lastNDayKeys, localDayKey } from './date-utils'

type Result = { data: unknown; error: unknown }

/** Fake Supabase client: `rpc` answers from a map; `from` serves `rows` page by page through `.range()`. */
function fakeDb(rpc: Record<string, Result>, rows: unknown[] = []) {
  const ranges: Array<[number, number]> = []
  const from = vi.fn(() => {
    const query = {
      select: () => query,
      gte: () => query,
      order: () => query,
      range: (start: number, end: number) => {
        ranges.push([start, end])
        return Promise.resolve({ data: rows.slice(start, end + 1), error: null })
      },
    }
    return query
  })
  const db = {
    rpc: vi.fn((name: string) => Promise.resolve(rpc[name] ?? { data: null, error: { message: 'missing function' } })),
    from,
  }
  return { db: db as unknown as SupabaseClient, from, ranges }
}

const today = lastNDayKeys(1)[0]

describe('loadConversationsSeries', () => {
  it('uses the SQL aggregate and fills the days without messages', async () => {
    const { db, from } = fakeDb({
      dashboard_message_series: { data: [{ day: today, incoming: 1500, outgoing: 900 }], error: null },
    })
    const series = await loadConversationsSeries(db, 7)
    expect(series).toHaveLength(7)
    expect(series[6]).toEqual({ day: today, incoming: 1500, outgoing: 900 })
    expect(series[0]).toMatchObject({ incoming: 0, outgoing: 0 })
    expect(from).not.toHaveBeenCalled()
  })

  it('without the migration, reads every page so recent days are not cut off', async () => {
    const now = new Date().toISOString()
    const rows = Array.from({ length: 1500 }, (_, i) => ({ created_at: now, sender_type: i % 2 ? 'customer' : 'agent' }))
    const { db, ranges } = fakeDb({}, rows)
    const series = await loadConversationsSeries(db, 7)
    expect(ranges).toEqual([[0, 999], [1000, 1999]])
    expect(series.find((p) => p.day === localDayKey(now))).toMatchObject({ incoming: 750, outgoing: 750 })
  })
})

describe('loadResponseTime', () => {
  const customerAt = new Date(Date.now() - 60 * 60_000)
  const responseAt = new Date(customerAt.getTime() + 10 * 60_000)

  it('summarises the pairs returned by the SQL function', async () => {
    const { db, from } = fakeDb({
      dashboard_response_samples: {
        data: [{ customer_at: customerAt.toISOString(), response_at: responseAt.toISOString() }],
        error: null,
      },
    })
    const summary = await loadResponseTime(db)
    expect(summary.buckets.reduce((sum, b) => sum + b.samples, 0)).toBe(1)
    expect(summary.buckets.find((b) => b.samples === 1)?.avgMinutes).toBeCloseTo(10)
    expect(from).not.toHaveBeenCalled()
  })

  it('without the migration, pairs the first customer message of a run with the next reply', async () => {
    const at = (min: number) => new Date(customerAt.getTime() + min * 60_000).toISOString()
    const { db } = fakeDb({}, [
      { conversation_id: 'a', sender_type: 'customer', created_at: at(0) },
      { conversation_id: 'a', sender_type: 'customer', created_at: at(5) },
      { conversation_id: 'a', sender_type: 'agent', created_at: at(20) },
      { conversation_id: 'b', sender_type: 'customer', created_at: at(1) },
    ])
    const summary = await loadResponseTime(db)
    expect(summary.buckets.reduce((sum, b) => sum + b.samples, 0)).toBe(1)
    expect(summary.buckets.find((b) => b.samples === 1)?.avgMinutes).toBeCloseTo(20)
  })
})
