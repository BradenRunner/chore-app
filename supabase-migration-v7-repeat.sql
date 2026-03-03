ALTER TABLE notification_schedule
  ADD COLUMN repeat_interval INTEGER NOT NULL DEFAULT 0;
