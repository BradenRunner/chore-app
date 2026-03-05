'use client';

import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [status, setStatus] = useState(null);
  const [chores, setChores] = useState([]);
  const [people, setPeople] = useState([]);
  const [history, setHistory] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [punishmentItems, setPunishmentItems] = useState([]);
  const [newChore, setNewChore] = useState('');
  const [newChoreTokens, setNewChoreTokens] = useState('1');
  const [newPerson, setNewPerson] = useState('');
  const [newPersonPin, setNewPersonPin] = useState('');
  const [editingPerson, setEditingPerson] = useState(null);
  const [newRewardName, setNewRewardName] = useState('');
  const [newRewardCost, setNewRewardCost] = useState('');
  const [newPunishName, setNewPunishName] = useState('');
  const [newPunishDeduction, setNewPunishDeduction] = useState('0');
  // Inline token editors: { [choreId]: value }
  const [tokenEdits, setTokenEdits] = useState({});
  // Inline chore editing: { id, name, token_value }
  const [editingChore, setEditingChore] = useState(null);
  // Notification schedule
  const [schedule, setSchedule] = useState([]);
  const [schedHour, setSchedHour] = useState('6');
  const [schedMinute, setSchedMinute] = useState('00');
  const [schedAmPm, setSchedAmPm] = useState('PM');
  const [expandedSchedule, setExpandedSchedule] = useState(null);
  const [schedMsgEdits, setSchedMsgEdits] = useState({});
  const [supplies, setSupplies] = useState([]);
  const [zones, setZones] = useState([]);
  const [activeBrush, setActiveBrush] = useState(null);

  async function fetchAll() {
    const [statusRes, choresRes, peopleRes, historyRes, rewardsRes, punishRes, schedRes, suppliesRes] = await Promise.all([
      fetch('/api/status'),
      fetch('/api/chores'),
      fetch('/api/people'),
      fetch('/api/history?days=14'),
      fetch('/api/rewards'),
      fetch('/api/punishment-items'),
      fetch('/api/notification-schedule'),
      fetch('/api/supplies'),
    ]);
    setStatus(await statusRes.json());
    setChores(await choresRes.json());
    setPeople(await peopleRes.json());
    const historyData = await historyRes.json();
    setHistory(historyData.history);
    setRewards(await rewardsRes.json());
    setPunishmentItems(await punishRes.json());
    setSchedule(await schedRes.json());
    const suppliesData = await suppliesRes.json();
    setSupplies(Array.isArray(suppliesData) ? suppliesData : []);
    // Fetch zones
    try {
      const zonesRes = await fetch('/api/zones');
      setZones(await zonesRes.json());
    } catch { setZones([]); }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  // Chore handlers
  async function handleAddChore(e) {
    e.preventDefault();
    if (!newChore.trim()) return;
    await fetch('/api/chores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newChore.trim(), token_value: Number(newChoreTokens) || 1 }),
    });
    setNewChore('');
    setNewChoreTokens('1');
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

  async function handleSaveChoreEdit() {
    if (!editingChore || !editingChore.name.trim()) return;
    const res = await fetch('/api/chores', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingChore.id,
        name: editingChore.name.trim(),
        token_value: Number(editingChore.token_value),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert('Error saving: ' + (data.error || 'Unknown error'));
      return;
    }
    setEditingChore(null);
    fetchAll();
  }

  async function handleUpdateTokenValue(choreId) {
    const val = tokenEdits[choreId];
    if (val === undefined) return;
    await fetch('/api/chores', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: choreId, token_value: Number(val) }),
    });
    setTokenEdits((prev) => {
      const next = { ...prev };
      delete next[choreId];
      return next;
    });
    fetchAll();
  }

  // People handlers
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

  // Rewards handlers
  async function handleAddReward(e) {
    e.preventDefault();
    if (!newRewardName.trim() || !newRewardCost) return;
    await fetch('/api/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRewardName.trim(), token_cost: Number(newRewardCost) }),
    });
    setNewRewardName('');
    setNewRewardCost('');
    fetchAll();
  }

  async function handleDeleteReward(id) {
    await fetch('/api/rewards', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchAll();
  }

  // Punishment item handlers
  async function handleAddPunishment(e) {
    e.preventDefault();
    if (!newPunishName.trim()) return;
    await fetch('/api/punishment-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newPunishName.trim(),
        token_deduction: Number(newPunishDeduction) || 0,
      }),
    });
    setNewPunishName('');
    setNewPunishDeduction('0');
    fetchAll();
  }

  async function handleDeletePunishment(id) {
    await fetch('/api/punishment-items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchAll();
  }

  // Notification schedule handlers
  function formatTime24(hour12, minute, ampm) {
    let h = parseInt(hour12, 10);
    if (ampm === 'AM' && h === 12) h = 0;
    else if (ampm === 'PM' && h !== 12) h += 12;
    return `${String(h).padStart(2, '0')}:${minute}`;
  }

  function formatTime12(time24) {
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  async function handleAddScheduleTime(e) {
    e.preventDefault();
    const time = formatTime24(schedHour, schedMinute, schedAmPm);
    await fetch('/api/notification-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time }),
    });
    fetchAll();
  }

  async function handleDeleteScheduleTime(id) {
    await fetch('/api/notification-schedule', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setExpandedSchedule(null);
    fetchAll();
  }

  function handleToggleScheduleExpand(s) {
    if (expandedSchedule === s.id) {
      setExpandedSchedule(null);
    } else {
      setExpandedSchedule(s.id);
      setSchedMsgEdits({
        title: s.title || 'Chore Reminder',
        body: s.body || 'Hey {name}, you haven\'t logged a chore today!',
        repeat_interval: s.repeat_interval || 0,
      });
    }
  }

  async function handleZoneCellClick(row, col) {
    if (!activeBrush) return;
    const zone = zones.find((z) => z.id === activeBrush);
    if (!zone) return;

    const cells = zone.grid_cells || [];
    const existing = cells.findIndex((c) => c.row === row && c.col === col);

    // Check if another zone owns this cell
    const otherZone = zones.find((z) => z.id !== activeBrush && (z.grid_cells || []).some((c) => c.row === row && c.col === col));
    if (otherZone) {
      const otherCells = otherZone.grid_cells.filter((c) => !(c.row === row && c.col === col));
      await fetch('/api/zones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: otherZone.id, grid_cells: otherCells }),
      });
    }

    let newCells;
    if (existing >= 0) {
      newCells = cells.filter((_, i) => i !== existing);
    } else {
      newCells = [...cells, { row, col }];
    }

    await fetch('/api/zones', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeBrush, grid_cells: newCells }),
    });

    const zonesRes = await fetch('/api/zones');
    setZones(await zonesRes.json());
  }

  async function handleSaveScheduleMessage(id) {
    await fetch('/api/notification-schedule', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title: schedMsgEdits.title, body: schedMsgEdits.body, repeat_interval: Number(schedMsgEdits.repeat_interval) || 0 }),
    });
    setExpandedSchedule(null);
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
      let suffix = '';
      if (!person.skipVoteResult) suffix = ' (voting...)';
      else if (person.skipVoteResult === 'invalid') suffix = ' (REJECTED)';
      else suffix = ' (approved)';
      parts.push(`Skipped: ${person.skipReason}${suffix}`);
    }
    if (parts.length === 0) return 'Not yet';
    return parts.join(' | ');
  }

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
        <a href="/rewards" className="dash-nav-item">
          <span className="dash-nav-icon">&#127873;</span> Rewards
        </a>
        <a href="/supplies" className="dash-nav-item">
          <span className="dash-nav-icon">&#128230;</span> Supplies
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
            <div className="dash-stat-card">
              <div className="dash-stat-value" style={{ color: '#f97316' }}>
                {Array.isArray(supplies) ? supplies.filter((s) => s.daysRemaining / s.days_duration < 0.25).length : 0}
              </div>
              <div className="dash-stat-label">Low Supplies</div>
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
                  <div className="dash-status-tokens">
                    {person.token_balance || 0} tokens
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
                  {editingChore && editingChore.id === chore.id ? (
                    <div className="chore-edit-row">
                      <input
                        type="text"
                        value={editingChore.name}
                        onChange={(e) => setEditingChore((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Chore name"
                      />
                      <input
                        type="number"
                        min="0"
                        value={editingChore.token_value}
                        onChange={(e) => setEditingChore((prev) => ({ ...prev, token_value: e.target.value }))}
                        style={{ maxWidth: 70 }}
                      />
                      <span className="chore-token-label">tokens</span>
                      <button className="dash-edit-btn" onClick={handleSaveChoreEdit}>Save</button>
                      <button className="dash-delete-btn" onClick={() => setEditingChore(null)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <span>{chore.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="chore-token-label">{chore.token_value} tokens</span>
                        <button className="dash-edit-btn" onClick={() => setEditingChore({ id: chore.id, name: chore.name, token_value: chore.token_value })}>Edit</button>
                        <button className="dash-delete-btn" onClick={() => handleDeleteChore(chore.id)}>Remove</button>
                      </div>
                    </>
                  )}
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
              <input
                type="number"
                min="0"
                placeholder="Tokens"
                value={newChoreTokens}
                onChange={(e) => setNewChoreTokens(e.target.value)}
                style={{ maxWidth: 80 }}
              />
              <button type="submit">Add</button>
            </form>
          </section>

          {/* Manage Rewards */}
          <section className="dash-section">
            <h2>Manage Rewards</h2>
            <div className="dash-list">
              {rewards.map((reward) => (
                <div key={reward.id} className="mgmt-item">
                  <div className="mgmt-item-info">
                    <strong>{reward.name}</strong>
                    <span className="mgmt-item-meta">{reward.token_cost} tokens | {reward.active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="mgmt-item-actions">
                    <button className="dash-delete-btn" onClick={() => handleDeleteReward(reward.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <form className="dash-add-form" onSubmit={handleAddReward}>
              <input
                type="text"
                placeholder="Reward name"
                value={newRewardName}
                onChange={(e) => setNewRewardName(e.target.value)}
              />
              <input
                type="number"
                min="1"
                placeholder="Token cost"
                value={newRewardCost}
                onChange={(e) => setNewRewardCost(e.target.value)}
                style={{ maxWidth: 100 }}
              />
              <button type="submit">Add</button>
            </form>
          </section>

          {/* Manage Punishment Items */}
          <section className="dash-section">
            <h2>Manage Punishment Items</h2>
            <div className="dash-list">
              {punishmentItems.map((item) => (
                <div key={item.id} className="mgmt-item">
                  <div className="mgmt-item-info">
                    <strong>{item.name}</strong>
                    <span className="mgmt-item-meta">-{item.token_deduction || 0} tokens | {item.active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="mgmt-item-actions">
                    <button className="dash-delete-btn" onClick={() => handleDeletePunishment(item.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <form className="dash-add-form" onSubmit={handleAddPunishment}>
              <input
                type="text"
                placeholder="Punishment name"
                value={newPunishName}
                onChange={(e) => setNewPunishName(e.target.value)}
              />
              <input
                type="number"
                min="0"
                placeholder="Token deduction"
                value={newPunishDeduction}
                onChange={(e) => setNewPunishDeduction(e.target.value)}
                style={{ maxWidth: 120 }}
              />
              <button type="submit">Add</button>
            </form>
          </section>

          {/* Notification Schedule */}
          <section className="dash-section">
            <h2>Notification Schedule</h2>
            <div className="dash-list">
              {schedule.map((s) => (
                <div key={s.id} className="schedule-item">
                  <div className="schedule-item-header">
                    <span
                      className="schedule-badge"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleToggleScheduleExpand(s)}
                    >
                      {formatTime12(s.time)}{s.repeat_interval > 0 && ` (every ${s.repeat_interval}m)`}
                    </span>
                    <button className="dash-delete-btn" onClick={() => handleDeleteScheduleTime(s.id)}>Remove</button>
                  </div>
                  {expandedSchedule === s.id && (
                    <div className="schedule-msg-edit">
                      <label>
                        Title
                        <input
                          type="text"
                          value={schedMsgEdits.title || ''}
                          onChange={(e) => setSchedMsgEdits((prev) => ({ ...prev, title: e.target.value }))}
                        />
                      </label>
                      <label>
                        Body
                        <input
                          type="text"
                          value={schedMsgEdits.body || ''}
                          onChange={(e) => setSchedMsgEdits((prev) => ({ ...prev, body: e.target.value }))}
                        />
                        <span className="schedule-msg-hint">Use &#123;name&#125; for the person&apos;s name</span>
                      </label>
                      <label>
                        Repeat
                        <select
                          value={schedMsgEdits.repeat_interval || 0}
                          onChange={(e) => setSchedMsgEdits((prev) => ({ ...prev, repeat_interval: Number(e.target.value) }))}
                        >
                          <option value={0}>Off</option>
                          <option value={2}>Every 2 min</option>
                          <option value={5}>Every 5 min</option>
                          <option value={10}>Every 10 min</option>
                          <option value={15}>Every 15 min</option>
                          <option value={30}>Every 30 min</option>
                        </select>
                      </label>
                      <button onClick={() => handleSaveScheduleMessage(s.id)}>Save</button>
                    </div>
                  )}
                </div>
              ))}
              {schedule.length === 0 && (
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>No notification times configured</span>
              )}
            </div>
            <form className="dash-add-form" onSubmit={handleAddScheduleTime} style={{ marginTop: 12 }}>
              <select value={schedHour} onChange={(e) => setSchedHour(e.target.value)} style={{ maxWidth: 70 }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <select value={schedMinute} onChange={(e) => setSchedMinute(e.target.value)} style={{ maxWidth: 70 }}>
                {['00', '15', '30', '45'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select value={schedAmPm} onChange={(e) => setSchedAmPm(e.target.value)} style={{ maxWidth: 70 }}>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
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

          {/* House Zones */}
          <section className="dash-section">
            <h2>House Zones</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 12 }}>
              Select a room brush, then click grid cells to paint your floor plan.
            </p>
            <div className="zone-brush-palette">
              {zones.map((z) => (
                <button
                  key={z.id}
                  className={`zone-brush-btn${activeBrush === z.id ? ' active' : ''}`}
                  style={{ '--zone-color': z.color }}
                  onClick={() => setActiveBrush(activeBrush === z.id ? null : z.id)}
                >
                  <span className="zone-brush-swatch" style={{ background: z.color }} />
                  {z.name}
                </button>
              ))}
            </div>
            <div className="zone-editor-grid">
              {Array.from({ length: 10 }, (_, row) => (
                <div key={row} className="zone-editor-row">
                  {Array.from({ length: 12 }, (_, col) => {
                    const zone = zones.find((z) => (z.grid_cells || []).some((c) => c.row === row && c.col === col));
                    return (
                      <div
                        key={col}
                        className={`zone-editor-cell${zone ? ' painted' : ''}`}
                        style={zone ? { background: zone.color } : undefined}
                        onClick={() => handleZoneCellClick(row, col)}
                        title={zone ? zone.name : `${row},${col}`}
                      >
                        {zone ? zone.name[0] : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
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
