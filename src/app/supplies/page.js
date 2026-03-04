'use client';

import { useState, useEffect } from 'react';

export default function SuppliesPage() {
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [daysDuration, setDaysDuration] = useState('');
  const [alertDaysBefore, setAlertDaysBefore] = useState('3');
  const [alertIntervalDays, setAlertIntervalDays] = useState('1');
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({});

  async function fetchSupplies() {
    const res = await fetch('/api/supplies');
    const data = await res.json();
    setSupplies(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    fetchSupplies();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim() || !daysDuration) return;
    await fetch('/api/supplies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        daysDuration: Number(daysDuration),
        alertDaysBefore: Number(alertDaysBefore) || 3,
        alertIntervalDays: Number(alertIntervalDays) || 1,
      }),
    });
    setName('');
    setDaysDuration('');
    setAlertDaysBefore('3');
    setAlertIntervalDays('1');
    fetchSupplies();
  }

  async function handleRestock(id) {
    await fetch('/api/supplies/restock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchSupplies();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this supply?')) return;
    await fetch('/api/supplies', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchSupplies();
  }

  function startEdit(supply) {
    setEditingId(supply.id);
    setEditFields({
      name: supply.name,
      days_duration: supply.days_duration,
      alert_days_before: supply.alert_days_before,
      alert_interval_days: supply.alert_interval_days,
    });
  }

  async function handleSaveEdit(id) {
    await fetch('/api/supplies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editFields }),
    });
    setEditingId(null);
    fetchSupplies();
  }

  function getStatusClass(supply) {
    if (supply.daysRemaining === 0) return 'critical';
    const pct = supply.daysRemaining / supply.days_duration;
    if (pct < 0.25) return 'critical';
    if (pct < 0.5) return 'warning';
    return 'ok';
  }

  function getProgressPct(supply) {
    if (supply.days_duration === 0) return 0;
    return Math.max(0, Math.min(100, (supply.daysRemaining / supply.days_duration) * 100));
  }

  if (loading) {
    return <div className="loading">Loading supplies...</div>;
  }

  return (
    <div className="supplies-container">
      <div className="supplies-header">
        <h1>Supplies</h1>
        <a href="/" className="supplies-back-btn">Back</a>
      </div>

      {supplies.length === 0 ? (
        <div className="supplies-empty">
          <p>No supplies tracked yet.</p>
          <p>Add your first item below!</p>
        </div>
      ) : (
        <div className="supplies-list">
          {supplies.map((supply) => (
            <div key={supply.id} className={`supply-card supply-status-${getStatusClass(supply)}`}>
              {editingId === supply.id ? (
                <div className="supply-edit-form">
                  <input
                    type="text"
                    value={editFields.name}
                    onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                    placeholder="Name"
                  />
                  <div className="supply-edit-row">
                    <label>
                      Duration (days)
                      <input
                        type="number"
                        min="1"
                        value={editFields.days_duration}
                        onChange={(e) => setEditFields({ ...editFields, days_duration: Number(e.target.value) })}
                      />
                    </label>
                    <label>
                      Alert before (days)
                      <input
                        type="number"
                        min="1"
                        value={editFields.alert_days_before}
                        onChange={(e) => setEditFields({ ...editFields, alert_days_before: Number(e.target.value) })}
                      />
                    </label>
                    <label>
                      Alert every (days)
                      <input
                        type="number"
                        min="1"
                        value={editFields.alert_interval_days}
                        onChange={(e) => setEditFields({ ...editFields, alert_interval_days: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                  <div className="supply-edit-actions">
                    <button onClick={() => handleSaveEdit(supply.id)}>Save</button>
                    <button onClick={() => setEditingId(null)} className="supply-cancel-btn">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="supply-card-header">
                    <div className="supply-info">
                      <span className="supply-name">{supply.name}</span>
                      <span className={`supply-status ${getStatusClass(supply)}`}>
                        {supply.daysRemaining === 0 ? 'EMPTY' : `${supply.daysRemaining} days left`}
                      </span>
                    </div>
                    <div className="supply-actions">
                      <button className="supply-restock-btn" onClick={() => handleRestock(supply.id)}>
                        Restock
                      </button>
                      <button className="supply-edit-btn" onClick={() => startEdit(supply)}>Edit</button>
                      <button className="supply-delete-btn" onClick={() => handleDelete(supply.id)}>Delete</button>
                    </div>
                  </div>
                  <div className="supply-progress">
                    <div
                      className={`supply-progress-bar ${getStatusClass(supply)}`}
                      style={{ width: `${getProgressPct(supply)}%` }}
                    />
                  </div>
                  <div className="supply-meta">
                    Lasts {supply.days_duration} days &middot; Alert at {supply.alert_days_before}d &middot; Every {supply.alert_interval_days}d
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="supply-add-form">
        <h3>Add Supply</h3>
        <form onSubmit={handleAdd}>
          <input
            type="text"
            placeholder="Supply name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="supply-add-row">
            <label>
              Duration (days)
              <input
                type="number"
                min="1"
                placeholder="30"
                value={daysDuration}
                onChange={(e) => setDaysDuration(e.target.value)}
              />
            </label>
            <label>
              Alert before
              <input
                type="number"
                min="1"
                placeholder="3"
                value={alertDaysBefore}
                onChange={(e) => setAlertDaysBefore(e.target.value)}
              />
            </label>
            <label>
              Repeat every
              <input
                type="number"
                min="1"
                placeholder="1"
                value={alertIntervalDays}
                onChange={(e) => setAlertIntervalDays(e.target.value)}
              />
            </label>
          </div>
          <button type="submit">Add Supply</button>
        </form>
      </div>
    </div>
  );
}
