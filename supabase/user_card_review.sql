-- Run in Supabase SQL Editor. Stores flashcard Known/Unknown and next review date.
-- Used by /api/card-review (save) and /api/card-review-due (list due).

CREATE TABLE IF NOT EXISTS user_card_review (
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  synthesis_id TEXT,
  known BOOLEAN NOT NULL,
  next_review_at DATE NOT NULL,
  question_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_user_card_review_user_next ON user_card_review(user_id, next_review_at);

COMMENT ON TABLE user_card_review IS 'Per-user flashcard review: known=true -> review in 10 days, known=false -> 1 day. next_review_at in UTC date.';
