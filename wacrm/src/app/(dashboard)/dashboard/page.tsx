"use client"

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import {
  MessageSquare,
  UserPlus,
  Send,
} from 'lucide-react'

import {
  loadActivity,
  loadConversationsSeries,
  loadMetrics,
  loadResponseTime,
} from '@/lib/dashboard/queries'
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  MetricsBundle,
  ResponseTimeSummary,
} from '@/lib/dashboard/types'

import { MetricCard } from '@/components/dashboard/metric-card'
import { SkeletonCard } from '@/components/dashboard/skeleton'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ConversationsChart } from '@/components/dashboard/conversations-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'

// O gráfico usa recharts, biblioteca pesada: carrega depois do resto da tela
const ResponseTimeChart = dynamic(
  () => import('@/components/dashboard/response-time-chart').then((m) => m.ResponseTimeChart),
  { ssr: false, loading: () => <SkeletonCard className="h-72" /> },
)

type RangeDays = 7 | 30 | 90

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricsBundle | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)

  const [range, setRange] = useState<RangeDays>(30)
  // Keep a cache per range so switching tabs doesn't re-fetch what we
  // already have. Ranges the user hasn't opened yet stay null and
  // trigger a fetch on first view.
  const [series, setSeries] = useState<Record<RangeDays, ConversationsSeriesPoint[] | null>>({
    7: null,
    30: null,
    90: null,
  })
  const [seriesLoading, setSeriesLoading] = useState(true)

  const [responseTime, setResponseTime] = useState<ResponseTimeSummary | null>(null)
  const [responseTimeLoading, setResponseTimeLoading] = useState(true)

  const [activity, setActivity] = useState<ActivityItem[] | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)

  const loadAll = useCallback(() => {
    const db = createClient()

    fetch('/api/dashboard?range=30')
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error('API dashboard returned non-ok status')
      })
      .then((data) => {
        if (data.metrics) setMetrics(data.metrics)
        if (data.series) setSeries((prev) => ({ ...prev, 30: data.series }))
        if (data.responseTime) setResponseTime(data.responseTime)
        if (data.activity) setActivity(data.activity)
      })
      .catch((err) => {
        console.warn('[dashboard] API fetch failed, falling back to browser queries:', err)
        void loadMetrics(db).then((m) => setMetrics(m)).catch(() => {})
        void loadConversationsSeries(db, 30).then((s) => setSeries((prev) => ({ ...prev, 30: s }))).catch(() => {})
        void loadResponseTime(db).then((r) => setResponseTime(r)).catch(() => {})
        void loadActivity(db, 50).then((a) => setActivity(a)).catch(() => {})
      })
      .finally(() => {
        setMetricsLoading(false)
        setSeriesLoading(false)
        setResponseTimeLoading(false)
        setActivityLoading(false)
      })
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleRangeChange = useCallback(
    (r: RangeDays) => {
      setRange(r)
      if (series[r] !== null) return
      setSeriesLoading(true)
      fetch(`/api/dashboard?range=${r}&only=series`)
        .then((res) => res.json())
        .then((data) => {
          if (data.series) {
            setSeries((prev) => ({ ...prev, [r]: data.series }))
          }
        })
        .catch(() => {
          const db = createClient()
          loadConversationsSeries(db, r)
            .then((s) => setSeries((prev) => ({ ...prev, [r]: s })))
            .catch((err) => console.error('[dashboard] series failed:', err))
        })
        .finally(() => setSeriesLoading(false))
    },
    [series],
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live analytics across conversations and contacts.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {metricsLoading || !metrics ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="motion-enter" style={{ animationDelay: '0ms' }}>
              <MetricCard
                title="Active Conversations"
                value={metrics.activeConversations.current.toLocaleString()}
                icon={MessageSquare}
                delta={{
                  sign: metrics.activeConversations.previous,
                  label: deltaLabel(metrics.activeConversations.previous, 'new today vs yesterday'),
                }}
              />
            </div>
            <div className="motion-enter" style={{ animationDelay: '50ms' }}>
              <MetricCard
                title="New Contacts Today"
                value={metrics.newContactsToday.current.toLocaleString()}
                icon={UserPlus}
                delta={{
                  sign:
                    metrics.newContactsToday.current - metrics.newContactsToday.previous,
                  label: deltaLabel(
                    metrics.newContactsToday.current - metrics.newContactsToday.previous,
                    'vs yesterday',
                  ),
                }}
              />
            </div>
            <div className="motion-enter" style={{ animationDelay: '100ms' }}>
              <MetricCard
                title="Messages Sent Today"
                value={metrics.messagesSentToday.current.toLocaleString()}
                icon={Send}
                delta={{
                  sign:
                    metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                  label: deltaLabel(
                    metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                    'vs yesterday',
                  ),
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Quick actions */}
      <QuickActions />

      {/* Conversations chart */}
      <ConversationsChart
        series={series}
        loading={seriesLoading}
        range={range}
        onRangeChange={handleRangeChange}
      />

      {/* Response time */}
      <div key={responseTimeLoading ? 'response-time-loading' : 'response-time-ready'} className={responseTimeLoading ? undefined : 'motion-enter'}>
        <ResponseTimeChart data={responseTime} loading={responseTimeLoading} />
      </div>

      {/* Activity feed */}
      <div key={activityLoading ? 'activity-loading' : 'activity-ready'} className={activityLoading ? undefined : 'motion-enter'}>
        <ActivityFeed items={activity} loading={activityLoading} />
      </div>
    </div>
  )
}

// ------------------------------------------------------------

function deltaLabel(delta: number, suffix: string): string {
  if (delta === 0) return `No change ${suffix}`
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toLocaleString()} ${suffix}`
}
