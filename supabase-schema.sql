-- Supabase Schema Migration for Chore Tracker
-- Run this in the Supabase SQL Editor to create tables and seed data.

-- People table
CREATE TABLE people (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  ntfy_topic TEXT NOT NULL UNIQUE
);

-- Completions table
CREATE TABLE completions (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id),
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chores table
CREATE TABLE chores (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

-- Indexes
CREATE INDEX idx_completions_date ON completions(date);
CREATE INDEX idx_completions_person_date ON completions(person_id, date);

-- Seed people
INSERT INTO people (name, ntfy_topic) VALUES
  ('Braden', 'chores-braden-' || substr(md5(random()::text), 1, 8)),
  ('Maddie', 'chores-maddie-' || substr(md5(random()::text), 1, 8)),
  ('Sydney', 'chores-sydney-' || substr(md5(random()::text), 1, 8));

-- Seed default chores
INSERT INTO chores (name) VALUES
  ('Dishes'),
  ('Vacuum'),
  ('Take Out Trash'),
  ('Laundry'),
  ('Clean Bathroom'),
  ('Mop Floors'),
  ('Wipe Counters'),
  ('Tidy Living Room');
