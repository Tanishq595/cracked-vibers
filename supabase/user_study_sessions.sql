-- Run in Supabase SQL Editor to enable study time tracking for "This Week" stats.
-- Used by /api/study-session and /api/week-stats.

CREATE TABLE IF NOT EXISTS user_study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  source TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_study_sessions_user_id
  ON user_study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_study_sessions_started_at
  ON user_study_sessions(started_at);
