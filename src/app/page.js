'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [people, setPeople] = useState([]);
  const [chores, setChores] = useState([]);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchStatus() {
    const res = await fetch('/api/status');
    const data = await res.json();
    setPeople(data.people);
    setLoading(false);
  }

  async function fetchChores() {
    const res = await fetch('/api/chores');
    const data = await res.json();
    setChores(data);
  }

  useEffect(() => {
    fetchStatus();
    fetchChores();
  }, []);

  async function handleChoreSelect(choreName) {
    if (!selected || submitting) return;

    setSubmitting(true);
    const res = await fetch('/api/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: selected.id, description: choreName }),
    });

    if (res.ok) {
      await fetchStatus();
    }
    setSubmitting(false);
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const selectedPerson = selected ? people.find((p) => p.id === selected.id) : null;

  return (
    <div className="phone-container">
      <h1>Chore Tracker</h1>

      <div className="person-buttons">
        {people.map((person) => (
          <button
            key={person.id}
            className={`person-btn ${selected?.id === person.id ? 'active' : ''}`}
            onClick={() => setSelected(person)}
          >
            {person.name}
            {person.done ? ' \u2713' : ''}
          </button>
        ))}
      </div>

      {selectedPerson && (
        selectedPerson.done ? (
          <div className="completed-card">
            <div className="checkmark">{'\u2705'}</div>
            <p><strong>{selectedPerson.name}</strong> is done for today!</p>
            <p className="chore-name">{selectedPerson.description}</p>
          </div>
        ) : (
          <div className="chore-grid">
            {chores.map((chore) => (
              <button
                key={chore.id}
                className="chore-btn"
                onClick={() => handleChoreSelect(chore.name)}
                disabled={submitting}
              >
                {chore.name}
              </button>
            ))}
          </div>
        )
      )}

      {selectedPerson && (
        <div className="ntfy-info">
          <p>Get reminders: install the <strong>ntfy app</strong> and subscribe to:</p>
          <code>{selectedPerson.ntfy_topic}</code>
        </div>
      )}
    </div>
  );
}
