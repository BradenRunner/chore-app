-- Migration v8: Skip Reason Voting
-- Adds vote_result to skip_reasons and creates skip_votes table

ALTER TABLE skip_reasons ADD COLUMN vote_result TEXT DEFAULT NULL;

CREATE TABLE skip_votes (
  id SERIAL PRIMARY KEY,
  skip_reason_id INTEGER NOT NULL REFERENCES skip_reasons(id) ON DELETE CASCADE,
  voter_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('valid', 'invalid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(skip_reason_id, voter_id)
);
