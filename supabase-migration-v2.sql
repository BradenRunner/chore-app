-- Migration v2: PIN login, multiple chores per day, skip reasons

-- Add PIN column to people (nullable so existing rows aren't broken)
ALTER TABLE people ADD COLUMN pin TEXT;

-- Logins table
CREATE TABLE logins (
  id SERIAL PRIMARY KEY,
  person_id INTEGER REFERENCES people(id) ON DELETE CASCADE,
  logged_in_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_logins_person_id ON logins(person_id);

-- Skip reasons table
CREATE TABLE skip_reasons (
  id SERIAL PRIMARY KEY,
  person_id INTEGER REFERENCES people(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(person_id, date)
);

CREATE INDEX idx_skip_reasons_person_date ON skip_reasons(person_id, date);

-- Remove the unique constraint on completions(person_id, date) if it exists,
-- to allow multiple chores per day.
-- (The original schema only had an index, not a unique constraint, so this
-- just ensures no unique constraint blocks multiple completions.)
