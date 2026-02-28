-- Run in Supabase SQL Editor to store which knowledge gaps a user has marked as addressed.
-- Required for /api/gaps-addressed (load and save).

CREATE TABLE IF NOT EXISTS user_gap_addressed (
  user_id TEXT PRIMARY KEY,
  addressed_gap_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_gap_addressed_updated_at
  ON user_gap_addressed(updated_at);

COMMENT ON TABLE user_gap_addressed IS 'Clerk user_id -> list of gap IDs (strings) the user marked as addressed on the Gaps tab';
