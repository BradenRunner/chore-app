-- Migration v3: Token Economy + Rewards + Punishment Wheel
-- Run in Supabase SQL Editor

ALTER TABLE chores ADD COLUMN token_value INTEGER NOT NULL DEFAULT 1;
ALTER TABLE people ADD COLUMN token_balance INTEGER NOT NULL DEFAULT 0;

CREATE TABLE token_transactions (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  reference_id INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_token_tx_person ON token_transactions(person_id);

CREATE TABLE rewards (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  token_cost INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reward_redemptions (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  reward_id INTEGER NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  token_cost INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_redemptions_person ON reward_redemptions(person_id);

CREATE TABLE punishment_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  token_deduction INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE punishment_log (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  punishment_item_id INTEGER NOT NULL REFERENCES punishment_items(id) ON DELETE CASCADE,
  token_deduction INTEGER NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_punishment_log_person ON punishment_log(person_id);
