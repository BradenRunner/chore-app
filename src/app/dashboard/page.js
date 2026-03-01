'use client';

import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [status, setStatus] = useState(null);
  const [chores, setChores] = useState([]);
  const [people, setPeople] = useState([]);
  const [history, setHistory] = useState([]);
  const [newChore, setNewChore] = useState('');
  const [newPerson, setNewPerson] = useState('');
  const [newPersonPin, setNewPersonPin] = useState('');
  const [editingPerson, setEditingPerson] = useState(null);

  async function fetchAll() {
    const [statusRes, choresRes, peopleRes, historyRes] = await Promise.all([
      fetch('/api/status'),
      fetch('/api/chores'),
      fetch('/api/people'),
      fetch('/api/history?days=14'),
    ]);
    setStatus(await statusRes.json());
    setChores(await choresRes.json());
    setPeople(await peopleRes.json());
    const historyData = await historyRes.json();
    setHistory(historyData.history);
  }

  useEffect(() => {
    fetchAll();
  }, []);

  async function handleAddChore(e) {
    e.preventDefault();
    if (!newChore.trim()) return;
    await fetch('/api/chores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newChore.trim() }),
    });
    setNewChore('');
    fetchAll();
  }

  async function handleDeleteChore(id) {
    await fetch('/api/chores', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchAll();
  }

  async function handleAddPerson(e) {
    e.preventDefault();
    if (!newPerson.trim()) return;
    await fetch('/api/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newPerson.trim(),
        pin: newPersonPin || undefined,
      }),
    });
    setNewPerson('');
    setNewPersonPin('');
    fetchAll();
  }

  async function handleUpdatePerson(id, fields) {
    await fetch('/api/people', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields }),
    });
    setEditingPerson(null);
    fetchAll();
  }

  async function handleDeletePerson(id) {
    if (!confirm('Delete this person and all their completions?')) return;
    await fetch('/api/people', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchAll();
  }

  async function handleDeleteCompletion(id) {
    await fetch('/api/complete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchAll();
  }

  if (!status) {
    return <div className="loading">Loading dashboard...</div>;
  }

  function getStatusDesc(person) {
    const parts = [];
    if (person.completions.length > 0) {
      parts.push(person.completions.map((c) => c.description).join(', '));
    }
    if (person.skipReason) {
      parts.push(`Skipped: ${person.skipReason}`);
    }
    if (parts.length === 0) return 'Not yet';
    return parts.join(' | ');
  }

  function getCardClass(person) {
    if (person.completions.length > 0) return 'done';
    if (person.skipReason) return 'skipped';
    return 'not-done';
  }

  function getStatusIcon(person) {
    if (person.completions.length > 0) return '\u2705';
    if (person.skipReason) return '\u23ED\uFE0F';
    return '\u274C';
  }

  const totalPeople = status.people.length;
  const doneToday = status.people.filter((p) => p.completions.length > 0).length;
  const skipped = status.people.filter((p) => p.skipReason).length;
  const pending = totalPeople - doneToday - skipped;

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <nav className="dash-sidebar">
        <div className="dash-sidebar-brand">Chore Tracker</div>
        <a href="/" className="dash-nav-item">
          <span className="dash-nav-icon">&#128241;</span> Phone
        </a>
        <a href="/tv" className="dash-nav-item">
          <span className="dash-nav-icon">&#128250;</span> TV
        </a>
        <a href="/dashboard" className="dash-nav-item active">
          <span className="dash-nav-icon">&#128202;</span> Dashboard
        </a>
      </nav>

      {/* Main content */}
      <div className="dash-main">
        {/* Header */}
        <header className="dash-header">
          <div>
            <h1>Dashboard</h1>
            <p className="dash-header-sub">Overview &amp; Management</p>
          </div>
        </header>

        <div className="dash-content">
          {/* Summary stat cards */}
          <div className="dash-stats-row">
            <div className="dash-stat-card">
              <div className="dash-stat-value" style={{ color: '#3b82f6' }}>{totalPeople}</div>
              <div className="dash-stat-label">Total People</div>
            </div>
            <div className="dash-stat-card">
              <div className="dash-stat-value" style={{ color: '#22c55e' }}>{doneToday}</div>
              <div className="dash-stat-label">Done Today</div>
            </div>
            <div className="dash-stat-card">
              <div className="dash-stat-value" style={{ color: '#ef4444' }}>{pending}</div>
              <div className="dash-stat-label">Pending</div>
            </div>
            <div className="dash-stat-card">
              <div className="dash-stat-value" style={{ color: '#f59e0b' }}>{skipped}</div>
              <div className="dash-stat-label">Skipped</div>
            </div>
          </div>

          {/* Today's Status */}
          <section className="dash-section">
            <h2>Today&apos;s Status</h2>
            <div className="dash-status-grid">
              {status.people.map((person) => (
                <div key={person.id} className={`dash-status-card ${getCardClass(person)}`}>
                  <div className="dash-status-name">{person.name}</div>
                  <div className="dash-status-icon">{getStatusIcon(person)}</div>
                  <div className="dash-status-desc">
                    {getStatusDesc(person)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Manage Chores */}
          <section className="dash-section">
            <h2>Manage Chores</h2>
            <div className="dash-list">
              {chores.map((chore) => (
                <div key={chore.id} className="dash-list-item">
                  <span>{chore.name}</span>
                  <button className="dash-delete-btn" onClick={() => handleDeleteChore(chore.id)}>Remove</button>
                </div>
              ))}
            </div>
            <form className="dash-add-form" onSubmit={handleAddChore}>
              <input
                type="text"
                placeholder="New chore name"
                value={newChore}
                onChange={(e) => setNewChore(e.target.value)}
              />
              <button type="submit">Add</button>
            </form>
          </section>

          {/* Manage People */}
          <section className="dash-section">
            <h2>Manage People</h2>
            <div className="dash-list">
              {people.map((person) => (
                <div key={person.id} className="dash-list-item person-item">
                  {editingPerson === person.id ? (
                    <EditPersonForm
                      person={person}
                      onSave={(fields) => handleUpdatePerson(person.id, fields)}
                      onCancel={() => setEditingPerson(null)}
                    />
                  ) : (
                    <>
                      <div className="person-details">
                        <strong>{person.name}</strong>
                        <span className="person-topic">{person.ntfy_topic}</span>
                      </div>
                      <div className="person-actions">
                        <button className="dash-edit-btn" onClick={() => setEditingPerson(person.id)}>Edit</button>
                        <button className="dash-delete-btn" onClick={() => handleDeletePerson(person.id)}>Remove</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <form className="dash-add-form" onSubmit={handleAddPerson}>
              <input
                type="text"
                placeholder="New person name"
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
              />
              <input
                type="tel"
                maxLength={4}
                placeholder="PIN (4 digits)"
                value={newPersonPin}
                onChange={(e) => setNewPersonPin(e.target.value.replace(/\D/g, ''))}
                style={{ maxWidth: 120 }}
              />
              <button type="submit">Add</button>
            </form>
          </section>

          {/* Recent History */}
          <section className="dash-section">
            <h2>Recent History</h2>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Person</th>
                  <th>Chore</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.date}</td>
                    <td>{entry.name}</td>
                    <td>{entry.description}</td>
                    <td>
                      <button className="dash-delete-btn" onClick={() => handleDeleteCompletion(entry.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}

function EditPersonForm({ person, onSave, onCancel }) {
  const [name, setName] = useState(person.name);
  const [topic, setTopic] = useState(person.ntfy_topic);
  const [pin, setPin] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const fields = { name: name.trim(), ntfy_topic: topic.trim() };
    if (pin) fields.pin = pin;
    onSave(fields);
  }

  return (
    <form className="edit-person-form" onSubmit={handleSubmit}>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="ntfy topic" />
      <input
        type="tel"
        maxLength={4}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        placeholder="New PIN"
        style={{ maxWidth: 100 }}
      />
      <button type="submit">Save</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}
