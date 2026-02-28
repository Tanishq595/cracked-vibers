-- Run in Supabase SQL Editor to track when gaps are marked addressed (for "Gaps closed this week").
-- Used by /api/gaps-addressed (insert on mark addressed) and /api/week-stats (count this week).

CREATE TABLE IF NOT EXISTS user_gap_addressed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  gap_id TEXT NOT NULL,
  addressed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_gap_addressed_events_user_addressed
  ON user_gap_addressed_events(user_id, addressed_at);
