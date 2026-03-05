'use client';

import { useState, useEffect } from 'react';

export default function TVDashboard() {
  const [data, setData] = useState(null);
  const [supplies, setSupplies] = useState([]);
  const [meals, setMeals] = useState([]);

  async function fetchAll() {
    const [statusRes, suppliesRes] = await Promise.all([
      fetch('/api/status'),
      fetch('/api/supplies'),
    ]);
    setData(await statusRes.json());
    const suppliesData = await suppliesRes.json();
    setSupplies(Array.isArray(suppliesData) ? suppliesData : []);

    try {
      const mealsRes = await fetch('/api/meals');
      const mealsData = await mealsRes.json();
      setMeals(Array.isArray(mealsData) ? mealsData : []);
    } catch {
      setMeals([]);
    }
  }

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
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

  function getSupplyStatus(s) {
    const pct = s.daysRemaining / s.days_duration;
    if (pct > 0.5) return 'ok';
    if (pct > 0.25) return 'warning';
    return 'critical';
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

      {/* Bottom row: Supplies + Meals side by side */}
      <div className="tv-bottom-row">
        {/* Supplies */}
        <div className="tv-panel">
          <h2>Supplies</h2>
          {supplies.length === 0 ? (
            <p className="tv-panel-empty">No supplies tracked</p>
          ) : (
            <div className="tv-supply-list">
              {supplies.map((s) => {
                const status = getSupplyStatus(s);
                return (
                  <div key={s.id} className={`tv-supply-item ${status}`}>
                    <div className="tv-supply-top">
                      <span className="tv-supply-name">{s.name}</span>
                      <span className={`tv-supply-days ${status}`}>{s.daysRemaining}d left</span>
                    </div>
                    <div className="tv-supply-bar">
                      <div
                        className={`tv-supply-fill ${status}`}
                        style={{ width: `${Math.max(0, Math.min(100, (s.daysRemaining / s.days_duration) * 100))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Meals */}
        <div className="tv-panel">
          <h2>Meals This Week</h2>
          {meals.length === 0 ? (
            <p className="tv-panel-empty">No meals planned</p>
          ) : (
            <div className="tv-meal-list">
              {meals.map((m) => (
                <div key={m.id} className={`tv-meal-item${m.cooked ? ' cooked' : ''}`}>
                  <span className="tv-meal-status">{m.cooked ? '\u2705' : '\u25CB'}</span>
                  <span className={`tv-meal-name${m.cooked ? ' cooked' : ''}`}>
                    {m.link ? <a href={m.link} target="_blank" rel="noopener noreferrer">{m.name}</a> : m.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
