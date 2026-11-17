-- ============================================================
-- 026 — Close in-flight work left by the removed Flows and
-- Automations features.
--
-- The app no longer ships the Flows runner, the Automations engine
-- or their cron routes, so nothing will ever advance or sweep these
-- rows again. Mark them finished so the data stays consistent.
-- Tables and history are kept untouched.
-- ============================================================

UPDATE flow_runs
SET status = 'timed_out',
    ended_at = NOW(),
    end_reason = 'feature_removed'
WHERE status = 'active';

UPDATE automation_pending_executions
SET status = 'failed'
WHERE status IN ('pending', 'running');
