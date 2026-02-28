const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const DB_PATH = path.join(__dirname, 'chores.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ntfy_topic TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL REFERENCES people(id),
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_completions_date ON completions(date);
  CREATE INDEX IF NOT EXISTS idx_completions_person_date ON completions(person_id, date);
`);

const existing = db.prepare('SELECT COUNT(*) as count FROM people').get();

if (existing.count > 0) {
  console.log('People already seeded. Current entries:');
  const people = db.prepare('SELECT * FROM people').all();
  for (const p of people) {
    console.log(`  ${p.name} -> ntfy topic: ${p.ntfy_topic}`);
  }
} else {
  const names = ['Braden', 'Maddie', 'Sydney'];
  const insert = db.prepare('INSERT INTO people (name, ntfy_topic) VALUES (?, ?)');

  for (const name of names) {
    const suffix = crypto.randomBytes(4).toString('hex');
    const topic = `chores-${name.toLowerCase()}-${suffix}`;
    insert.run(name, topic);
    console.log(`  ${name} -> ntfy topic: ${topic}`);
  }

  console.log('\nSetup complete! Each person should install the ntfy app and subscribe to their topic.');
}

// Seed chores
const existingChores = db.prepare('SELECT COUNT(*) as count FROM chores').get();

if (existingChores.count > 0) {
  console.log('\nChores already seeded. Current chores:');
  const chores = db.prepare('SELECT * FROM chores').all();
  for (const c of chores) {
    console.log(`  - ${c.name}`);
  }
} else {
  const defaultChores = [
    'Dishes', 'Vacuum', 'Take Out Trash', 'Laundry',
    'Clean Bathroom', 'Mop Floors', 'Wipe Counters', 'Tidy Living Room',
  ];
  const insertChore = db.prepare('INSERT INTO chores (name) VALUES (?)');
  for (const name of defaultChores) {
    insertChore.run(name);
  }
  console.log('\nSeeded default chores:', defaultChores.join(', '));
}

db.close();
