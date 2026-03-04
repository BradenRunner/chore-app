CREATE TABLE supplies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  days_duration INTEGER NOT NULL,
  alert_days_before INTEGER NOT NULL DEFAULT 3,
  alert_interval_days INTEGER NOT NULL DEFAULT 1,
  last_restocked DATE NOT NULL DEFAULT CURRENT_DATE,
  last_alert_date DATE DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
