CREATE TABLE meals (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  link TEXT,
  week_of DATE NOT NULL,
  added_by INTEGER REFERENCES people(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
