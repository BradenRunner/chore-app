CREATE TABLE notification_schedule (
  id SERIAL PRIMARY KEY,
  time TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_sent (
  id SERIAL PRIMARY KEY,
  time_slot TEXT NOT NULL,
  date TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reminded INTEGER NOT NULL DEFAULT 0,
  UNIQUE(time_slot, date)
);

INSERT INTO notification_schedule (time) VALUES ('18:00');
