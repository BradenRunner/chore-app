ALTER TABLE notification_schedule
  ADD COLUMN title TEXT NOT NULL DEFAULT 'Chore Reminder',
  ADD COLUMN body TEXT NOT NULL DEFAULT 'Hey {name}, you haven''t logged a chore today!';
