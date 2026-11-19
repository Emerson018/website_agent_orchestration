-- ============================================================
-- 027 — Dashboard aggregates in SQL.
--
-- The dashboard used to download every message of the period and
-- aggregate in JavaScript: slow, and PostgREST's row cap could cut
-- off part of the data. These functions return only the result.
-- SECURITY INVOKER (the default) keeps the RLS on `messages`, so each
-- caller only sees their own account's rows.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Messages per calendar day, in the caller's time zone.
CREATE OR REPLACE FUNCTION dashboard_message_series(p_start TIMESTAMPTZ, p_time_zone TEXT)
RETURNS TABLE (day TEXT, incoming INTEGER, outgoing INTEGER)
LANGUAGE sql
STABLE
AS $$
  SELECT
    to_char(m.created_at AT TIME ZONE p_time_zone, 'YYYY-MM-DD') AS day,
    (count(*) FILTER (WHERE m.sender_type = 'customer'))::INTEGER AS incoming,
    (count(*) FILTER (WHERE m.sender_type <> 'customer'))::INTEGER AS outgoing
  FROM messages m
  WHERE m.created_at >= p_start
  GROUP BY 1
$$;

-- One pair per customer run: the first message of a run of customer
-- messages, and the agent/bot reply that ends that run. Runs still
-- waiting for a reply are left out.
CREATE OR REPLACE FUNCTION dashboard_response_samples(p_start TIMESTAMPTZ)
RETURNS TABLE (customer_at TIMESTAMPTZ, response_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
AS $$
  WITH marked AS (
    SELECT
      m.conversation_id,
      m.created_at,
      m.sender_type = 'customer' AS is_customer,
      lag(m.sender_type = 'customer') OVER (
        PARTITION BY m.conversation_id ORDER BY m.created_at
      ) AS previous_is_customer
    FROM messages m
    WHERE m.created_at >= p_start
  ),
  run_starts AS (
    SELECT
      marked.created_at,
      marked.is_customer,
      lead(marked.created_at) OVER (
        PARTITION BY marked.conversation_id ORDER BY marked.created_at
      ) AS next_run_at
    FROM marked
    WHERE marked.previous_is_customer IS DISTINCT FROM marked.is_customer
  )
  SELECT run_starts.created_at, run_starts.next_run_at
  FROM run_starts
  WHERE run_starts.is_customer AND run_starts.next_run_at IS NOT NULL
$$;

GRANT EXECUTE ON FUNCTION dashboard_message_series(TIMESTAMPTZ, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION dashboard_response_samples(TIMESTAMPTZ) TO authenticated, service_role;
