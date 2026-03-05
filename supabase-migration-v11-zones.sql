-- House Zone Tracking for Vacuum & Mop Floors
CREATE TABLE house_zones (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  grid_cells JSONB NOT NULL DEFAULT '[]',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE zone_completions (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER NOT NULL REFERENCES house_zones(id) ON DELETE CASCADE,
  chore_type TEXT NOT NULL,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the 11 rooms with distinct colors
INSERT INTO house_zones (name, color, sort_order) VALUES
  ('Kitchen', '#ef4444', 1),
  ('Living Room', '#3b82f6', 2),
  ('Dining Room', '#8b5cf6', 3),
  ('Hallway', '#6b7280', 4),
  ('Master Bedroom', '#06b6d4', 5),
  ('Master Bathroom', '#14b8a6', 6),
  ('Guest Bathroom', '#f59e0b', 7),
  ('Office', '#22c55e', 8),
  ('Front Room', '#ec4899', 9),
  ('Sydneys Bedroom', '#f97316', 10),
  ('Sydneys Bathroom', '#a855f7', 11);
