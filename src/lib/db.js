const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'chores.db');

let _db;

function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');

    _db.exec(`
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
  }
  return _db;
}

function getAllPeople() {
  return getDb().prepare('SELECT * FROM people ORDER BY id').all();
}

function getTodayStatus(dateStr) {
  const db = getDb();
  const people = getAllPeople();

  return people.map((person) => {
    const completion = db.prepare(
      'SELECT * FROM completions WHERE person_id = ? AND date = ? LIMIT 1'
    ).get(person.id, dateStr);

    return {
      id: person.id,
      name: person.name,
      ntfy_topic: person.ntfy_topic,
      done: !!completion,
      description: completion?.description || null,
    };
  });
}

function getStreak(personId, todayStr) {
  const db = getDb();
  let streak = 0;
  let date = new Date(todayStr + 'T00:00:00');

  while (true) {
    const dateStr = date.toISOString().split('T')[0];
    const row = db.prepare(
      'SELECT 1 FROM completions WHERE person_id = ? AND date = ?'
    ).get(personId, dateStr);

    if (row) {
      streak++;
      date.setDate(date.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function getWeeklyCount(personId, todayStr) {
  const db = getDb();
  const today = new Date(todayStr + 'T00:00:00');
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  const mondayStr = monday.toISOString().split('T')[0];

  const row = db.prepare(
    'SELECT COUNT(DISTINCT date) as count FROM completions WHERE person_id = ? AND date >= ? AND date <= ?'
  ).get(personId, mondayStr, todayStr);

  return row.count;
}

function logChore(personId, description, dateStr) {
  const db = getDb();

  const existing = db.prepare(
    'SELECT 1 FROM completions WHERE person_id = ? AND date = ?'
  ).get(personId, dateStr);

  if (existing) {
    return { success: false, error: 'Already logged a chore today' };
  }

  db.prepare(
    'INSERT INTO completions (person_id, description, date) VALUES (?, ?, ?)'
  ).run(personId, description, dateStr);

  return { success: true };
}

function getHistory(days) {
  const db = getDb();
  const today = new Date();
  const since = new Date(today);
  since.setDate(today.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  return db.prepare(`
    SELECT c.*, p.name
    FROM completions c
    JOIN people p ON p.id = c.person_id
    WHERE c.date >= ?
    ORDER BY c.date DESC, p.name
  `).all(sinceStr);
}

function getAllChores() {
  return getDb().prepare('SELECT * FROM chores ORDER BY id').all();
}

function addChore(name) {
  return getDb().prepare('INSERT INTO chores (name) VALUES (?)').run(name);
}

function deleteChore(id) {
  return getDb().prepare('DELETE FROM chores WHERE id = ?').run(id);
}

function addPerson(name) {
  const crypto = require('crypto');
  const suffix = crypto.randomBytes(4).toString('hex');
  const topic = `chores-${name.toLowerCase()}-${suffix}`;
  return getDb().prepare('INSERT INTO people (name, ntfy_topic) VALUES (?, ?)').run(name, topic);
}

function updatePerson(id, fields) {
  const db = getDb();
  if (fields.name !== undefined) {
    db.prepare('UPDATE people SET name = ? WHERE id = ?').run(fields.name, id);
  }
  if (fields.ntfy_topic !== undefined) {
    db.prepare('UPDATE people SET ntfy_topic = ? WHERE id = ?').run(fields.ntfy_topic, id);
  }
}

function deletePerson(id) {
  const db = getDb();
  db.prepare('DELETE FROM completions WHERE person_id = ?').run(id);
  db.prepare('DELETE FROM people WHERE id = ?').run(id);
}

function deleteCompletion(id) {
  return getDb().prepare('DELETE FROM completions WHERE id = ?').run(id);
}

module.exports = {
  getDb, getAllPeople, getTodayStatus, getStreak, getWeeklyCount, logChore, getHistory,
  getAllChores, addChore, deleteChore, addPerson, updatePerson, deletePerson, deleteCompletion,
};
