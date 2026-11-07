
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS article_lottery_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  period TEXT NOT NULL,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'issued')),
  issued_code TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE (user_id, period)
);

CREATE INDEX IF NOT EXISTS
  idx_article_lottery_submissions_period
ON article_lottery_submissions(period);

CREATE INDEX IF NOT EXISTS
  idx_article_lottery_submissions_status
ON article_lottery_submissions(status);

CREATE INDEX IF NOT EXISTS
  idx_article_lottery_submissions_user
ON article_lottery_submissions(user_id);
