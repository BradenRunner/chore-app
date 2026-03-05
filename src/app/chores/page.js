'use client';

import { useState, useEffect, useCallback } from 'react';

const ZONE_CHORES = ['Floors'];

export default function ChoresPage() {
  const [user, setUser] = useState(null);
  const [chores, setChores] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSkip, setShowSkip] = useState(false);
  const [skipText, setSkipText] = useState('');
  const [skipSubmitting, setSkipSubmitting] = useState(false);

  // Zone overlay state
  const [zoneOverlay, setZoneOverlay] = useState(null);
  const [selections, setSelections] = useState({});
  const [zoneSubmitting, setZoneSubmitting] = useState(false);

  const fetchStatus = useCallback(async () => {
    const res = await fetch('/api/status');
    const data = await res.json();
    setStatusData(data);
    setLoading(false);
    return data;
  }, []);

  async function fetchChores() {
    const res = await fetch('/api/chores');
    const data = await res.json();
    setChores(data);
  }

  useEffect(() => {
    const saved = localStorage.getItem('choreUser');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('choreUser');
      }
    } else {
      setLoading(false);
    }
    fetchStatus();
    fetchChores();
  }, [fetchStatus]);

  async function handleChoreSelect(choreName) {
    if (!user || submitting) return;

    if (ZONE_CHORES.includes(choreName)) {
      const [vacRes, mopRes] = await Promise.all([
        fetch('/api/zone-completions?choreType=Vacuum'),
        fetch('/api/zone-completions?choreType=Mop%20Floors'),
      ]);
      const vacZones = await vacRes.json();
      const mopZones = await mopRes.json();

      const merged = vacZones.map((vz) => {
        const mz = mopZones.find((m) => m.id === vz.id);
        return {
          ...vz,
          vacuumLast: vz.lastCleaned || null,
          mopLast: mz ? mz.lastCleaned : null,
        };
      });

      setZoneOverlay({ zones: merged });
      setSelections({});
      return;
    }

    setSubmitting(true);
    const res = await fetch('/api/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: user.personId, description: choreName }),
    });
    if (res.ok) {
      await fetchStatus();
    }
    setSubmitting(false);
  }

  function toggleSelection(zoneId, type) {
    setSelections((prev) => {
      const current = prev[zoneId] || { vacuum: false, mop: false };
      return { ...prev, [zoneId]: { ...current, [type]: !current[type] } };
    });
  }

  async function handleZoneSubmit() {
    if (!user || zoneSubmitting) return;

    const vacuumZoneIds = [];
    const mopZoneIds = [];
    for (const [zoneId, sel] of Object.entries(selections)) {
      if (sel.vacuum) vacuumZoneIds.push(Number(zoneId));
      if (sel.mop) mopZoneIds.push(Number(zoneId));
    }

    if (vacuumZoneIds.length === 0 && mopZoneIds.length === 0) return;
    setZoneSubmitting(true);

    // Log zone completions for each type
    if (vacuumZoneIds.length > 0) {
      await fetch('/api/zone-completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneIds: vacuumZoneIds, choreType: 'Vacuum', personId: user.personId }),
      });
    }

    if (mopZoneIds.length > 0) {
      await fetch('/api/zone-completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneIds: mopZoneIds, choreType: 'Mop Floors', personId: user.personId }),
      });
    }

    // Log a single "Floors" chore completion (awards tokens once)
    await fetch('/api/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: user.personId, description: 'Floors' }),
    });

    await fetchStatus();
    setZoneOverlay(null);
    setSelections({});
    setZoneSubmitting(false);
  }

  async function handleSkipSubmit(e) {
    e.preventDefault();
    if (!skipText.trim() || !user) return;
    setSkipSubmitting(true);
    await fetch('/api/skip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: user.personId, reason: skipText.trim() }),
    });
    setSkipText('');
    setShowSkip(false);
    setSkipSubmitting(false);
    await fetchStatus();
  }

  if (loading) return <div className="loading">Loading...</div>;

  if (!user) {
    return (
      <div className="phone-container" style={{ textAlign: 'center', paddingTop: 60 }}>
        <h1>Chores</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>
          Please log in on the <a href="/" style={{ color: 'var(--accent)' }}>home page</a> first.
        </p>
      </div>
    );
  }

  const myStatus = statusData ? statusData.people.find((p) => p.id === user.personId) : null;

  let totalSelections = 0;
  for (const sel of Object.values(selections)) {
    if (sel.vacuum) totalSelections++;
    if (sel.mop) totalSelections++;
  }

  return (
    <div className="phone-container">
      <div className="logged-in-header">
        <h1>{user.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {myStatus && (
            <span className="token-balance-badge">{myStatus.token_balance || 0} tokens</span>
          )}
          <a href="/" className="rewards-back-btn">Back</a>
        </div>
      </div>

      {myStatus && myStatus.completions.length > 0 && (
        <div className="today-completions">
          <h3>Done today</h3>
          <ul>
            {myStatus.completions.map((c) => (
              <li key={c.id}>{c.description}</li>
            ))}
          </ul>
        </div>
      )}

      {myStatus && myStatus.skipReason && (
        <div className={`skip-display${myStatus.skipVoteResult === 'invalid' ? ' skip-rejected' : ''}`}>
          <p>Skipping today: {myStatus.skipReason}</p>
          <p className={`skip-vote-status ${myStatus.skipVoteResult || 'pending'}`}>
            {!myStatus.skipVoteResult && 'Waiting for votes...'}
            {myStatus.skipVoteResult === 'valid' && 'Skip approved!'}
            {myStatus.skipVoteResult === 'invalid' && 'Skip rejected'}
          </p>
        </div>
      )}

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

      <div className="skip-section">
        {!showSkip ? (
          <button className="skip-toggle" onClick={() => setShowSkip(true)}>
            Can&apos;t do chores today?
          </button>
        ) : (
          <form className="skip-form" onSubmit={handleSkipSubmit}>
            <textarea
              value={skipText}
              onChange={(e) => setSkipText(e.target.value)}
              placeholder="Why can't you do chores today?"
              rows={2}
            />
            <div className="skip-form-actions">
              <button type="submit" disabled={!skipText.trim() || skipSubmitting}>Submit</button>
              <button type="button" onClick={() => { setShowSkip(false); setSkipText(''); }}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      {myStatus && (
        <div className="ntfy-info">
          <p>Get reminders: install the <strong>ntfy app</strong> and subscribe to:</p>
          <code>{myStatus.ntfy_topic}</code>
        </div>
      )}

      {zoneOverlay && (
        <div className="zone-overlay">
          <div className="zone-overlay-header">
            <h2>Clean Rooms</h2>
            <p>Tap Vacuum or Mop for each room you cleaned</p>
          </div>

          <ZoneMap
            zones={zoneOverlay.zones}
            selections={selections}
            toggleSelection={toggleSelection}
          />

          <div className="zone-overlay-footer">
            <div className="zone-legend">
              <span className="zone-legend-item"><span className="zone-dot zone-fresh" /> &le;3 days</span>
              <span className="zone-legend-item"><span className="zone-dot zone-aging" /> &le;7 days</span>
              <span className="zone-legend-item"><span className="zone-dot zone-overdue" /> &gt;7 days</span>
            </div>
            <button
              className="zone-submit-btn"
              onClick={handleZoneSubmit}
              disabled={totalSelections === 0 || zoneSubmitting}
            >
              {zoneSubmitting ? 'Saving...' : `Done - ${totalSelections} task${totalSelections !== 1 ? 's' : ''} logged`}
            </button>
            <button className="zone-cancel-btn" onClick={() => setZoneOverlay(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ZoneMap({ zones, selections, toggleSelection }) {
  // Sort zones by grid position (top-to-bottom, left-to-right) to reflect floor plan order
  const sorted = [...zones].sort((a, b) => {
    const aCells = a.grid_cells && a.grid_cells.length > 0 ? a.grid_cells : null;
    const bCells = b.grid_cells && b.grid_cells.length > 0 ? b.grid_cells : null;
    if (!aCells && !bCells) return a.sort_order - b.sort_order;
    if (!aCells) return 1;
    if (!bCells) return -1;
    const aMinRow = Math.min(...aCells.map((c) => c.row));
    const bMinRow = Math.min(...bCells.map((c) => c.row));
    if (aMinRow !== bMinRow) return aMinRow - bMinRow;
    const aMinCol = Math.min(...aCells.map((c) => c.col));
    const bMinCol = Math.min(...bCells.map((c) => c.col));
    return aMinCol - bMinCol;
  });

  return (
    <div className="zone-room-grid">
      {sorted.map((zone) => {
        const sel = selections[zone.id] || { vacuum: false, mop: false };
        return (
          <div key={zone.id} className="zone-room-card">
            <div className="zone-room-color-bar" style={{ background: zone.color }} />
            <div className="zone-room-name">{zone.name}</div>
            <div className="zone-room-actions">
              <button
                className={`zone-action-btn ${getFreshnessClass(zone.vacuumLast)}${sel.vacuum ? ' selected' : ''}`}
                onClick={() => toggleSelection(zone.id, 'vacuum')}
              >
                <span className="zone-action-dot" /> Vacuum
              </button>
              <button
                className={`zone-action-btn ${getFreshnessClass(zone.mopLast)}${sel.mop ? ' selected' : ''}`}
                onClick={() => toggleSelection(zone.id, 'mop')}
              >
                <span className="zone-action-dot" /> Mop
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getFreshnessClass(dateStr) {
  if (!dateStr) return 'zone-overdue';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  const days = Math.floor((today - d) / (1000 * 60 * 60 * 24));
  if (days <= 3) return 'zone-fresh';
  if (days <= 7) return 'zone-aging';
  return 'zone-overdue';
}
