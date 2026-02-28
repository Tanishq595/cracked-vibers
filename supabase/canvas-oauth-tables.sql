-- Run this in Supabase SQL Editor to enable Canvas OAuth (Sign in with Canvas).
-- Required for /api/canvas/auth-url and /api/canvas/callback.

-- State stored before redirecting user to Canvas login (validated on callback)
CREATE TABLE IF NOT EXISTS oauth_state (
  state TEXT PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional: expire old state rows (run periodically or via trigger)
-- DELETE FROM oauth_state WHERE created_at < now() - interval '15 minutes';

-- User's Canvas OAuth tokens (one row per user)
CREATE TABLE IF NOT EXISTS canvas_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  canvas_base_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_canvas_connections_clerk_user_id
  ON canvas_connections(clerk_user_id);
