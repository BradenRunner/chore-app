'use client';

import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [status, setStatus] = useState(null);
  const [chores, setChores] = useState([]);
  const [people, setPeople] = useState([]);
  const [history, setHistory] = useState([]);
  const [newChore, setNewChore] = useState('');
  const [newPerson, setNewPerson] = useState('');
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
    setHistory(await historyRes.json());
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
      body: JSON.stringify({ name: newPerson.trim() }),
    });
    setNewPerson('');
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

  return (
    <div className="dash-container">
      <h1>Dashboard</h1>

      {/* Today's Status */}
      <section className="dash-section">
        <h2>Today&apos;s Status</h2>
        <div className="dash-status-grid">
          {status.people.map((person) => (
            <div key={person.id} className={`dash-status-card ${person.done ? 'done' : 'not-done'}`}>
              <div className="dash-status-name">{person.name}</div>
              <div className="dash-status-icon">{person.done ? '\u2705' : '\u274C'}</div>
              <div className="dash-status-desc">
                {person.done ? person.description : 'Not yet'}
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
  );
}

function EditPersonForm({ person, onSave, onCancel }) {
  const [name, setName] = useState(person.name);
  const [topic, setTopic] = useState(person.ntfy_topic);

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ name: name.trim(), ntfy_topic: topic.trim() });
  }

  return (
    <form className="edit-person-form" onSubmit={handleSubmit}>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="ntfy topic" />
      <button type="submit">Save</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}
