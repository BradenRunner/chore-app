'use client';

import { useState, useEffect } from 'react';

export default function TVDashboard() {
  const [data, setData] = useState(null);

  async function fetchStatus() {
    const res = await fetch('/api/status');
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const dateDisplay = new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="tv-container">
      <h1>Chore Tracker</h1>
      <p className="tv-date">{dateDisplay}</p>

      <div className="tv-grid">
        {data.people.map((person) => (
          <div key={person.id} className={`tv-card ${person.done ? 'done' : 'not-done'}`}>
            <div className="name">{person.name}</div>
            <div className="status-icon">{person.done ? '\u2705' : '\u274C'}</div>
            <div className="chore-desc">
              {person.done ? person.description : 'Not yet...'}
            </div>
            <div className="tv-stats">
              <div className="tv-stat">
                <div className="value streak">{person.streak}</div>
                <div className="label">Streak</div>
              </div>
              <div className="tv-stat">
                <div className="value weekly">{person.weeklyCount}/7</div>
                <div className="label">This Week</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
