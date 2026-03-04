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

  function getCardClass(person) {
    if (person.completions.length > 0) return 'done';
    if (person.skipReason) {
      if (!person.skipVoteResult) return 'voting';
      if (person.skipVoteResult === 'invalid') return 'not-done';
      return 'skipped';
    }
    return 'not-done';
  }

  function getStatusIcon(person) {
    if (person.completions.length > 0) return '\u2705';
    if (person.skipReason) {
      if (!person.skipVoteResult) return '\u2696\uFE0F';
      if (person.skipVoteResult === 'invalid') return '\u274C';
      return '\u23ED\uFE0F';
    }
    return '\u274C';
  }

  function getDescription(person) {
    if (person.completions.length > 0) {
      return person.completions.map((c) => c.description).join(', ');
    }
    if (person.skipReason) {
      let suffix = '';
      if (!person.skipVoteResult) suffix = ' (voting...)';
      else if (person.skipVoteResult === 'invalid') suffix = ' (REJECTED)';
      else suffix = ' (approved)';
      return `Skipped: ${person.skipReason}${suffix}`;
    }
    return 'Not yet...';
  }

  return (
    <div className="tv-container">
      <h1>Chore Tracker</h1>
      <p className="tv-date">{dateDisplay}</p>

      <div className="tv-grid">
        {data.people.map((person) => (
          <div key={person.id} className={`tv-card ${getCardClass(person)}`}>
            <div className="name">{person.name}</div>
            <div className="status-icon">{getStatusIcon(person)}</div>
            <div className="chore-desc">
              {getDescription(person)}
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
