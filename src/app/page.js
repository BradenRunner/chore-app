'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function Home() {
  const [people, setPeople] = useState([]);
  const [chores, setChores] = useState([]);
  const [user, setUser] = useState(null);
  const [pinTarget, setPinTarget] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState(null);
  const [showSkip, setShowSkip] = useState(false);
  const [skipText, setSkipText] = useState('');
  const [skipSubmitting, setSkipSubmitting] = useState(false);
  // Punishment wheel state
  const [showWheel, setShowWheel] = useState(false);
  const [punishmentItems, setPunishmentItems] = useState([]);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState(null);
  const [wheelChecked, setWheelChecked] = useState(false);
  const canvasRef = useRef(null);
  const spinnerRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch('/api/status');
    const data = await res.json();
    setPeople(data.people);
    setStatusData(data);
    setLoading(false);
    return data;
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('choreUser');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('choreUser');
      }
    }
    fetchStatus();
    fetchChores();
  }, [fetchStatus]);

  // Check if punishment wheel should show (no completions AND no skip reason)
  useEffect(() => {
    if (!user || !statusData || wheelChecked) return;
    const myStatus = statusData.people.find((p) => p.id === user.personId);
    if (myStatus && myStatus.completions.length === 0 && !myStatus.skipReason) {
      // Check if there are punishment items configured
      fetch('/api/punishment-items')
        .then((r) => r.json())
        .then((items) => {
          const active = items.filter((i) => i.active);
          if (active.length >= 2) {
            setPunishmentItems(active);
            setShowWheel(true);
          }
        });
    }
    setWheelChecked(true);
  }, [user, statusData, wheelChecked]);

  // Draw wheel when punishment items load
  useEffect(() => {
    if (!showWheel || punishmentItems.length < 2 || !canvasRef.current) return;
    drawWheel(canvasRef.current, punishmentItems);
  }, [showWheel, punishmentItems]);

  async function fetchChores() {
    const res = await fetch('/api/chores');
    const data = await res.json();
    setChores(data);
  }

  async function handlePersonTap(person) {
    setPinTarget(person);
    setPin('');
    setPinError('');
  }

  async function handlePinSubmit(e) {
    e.preventDefault();
    if (!pin || !pinTarget) return;
    setPinError('');
    setSubmitting(true);

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: pinTarget.id, pin }),
    });

    if (res.ok) {
      const data = await res.json();
      const userData = { personId: data.id, name: data.name };
      localStorage.setItem('choreUser', JSON.stringify(userData));
      setUser(userData);
      setPinTarget(null);
      setPin('');
      setWheelChecked(false); // Re-check wheel for new user
    } else {
      setPinError('Incorrect PIN');
    }
    setSubmitting(false);
  }

  function handleLogout() {
    localStorage.removeItem('choreUser');
    setUser(null);
    setShowSkip(false);
    setSkipText('');
    setShowWheel(false);
    setWheelResult(null);
    setWheelChecked(false);
  }

  async function handleChoreSelect(choreName) {
    if (!user || submitting) return;

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

  // Punishment wheel spin
  function handleSpin() {
    if (wheelSpinning || punishmentItems.length < 2) return;
    setWheelSpinning(true);
    setWheelResult(null);

    const sliceAngle = 360 / punishmentItems.length;
    // Random result index
    const resultIndex = Math.floor(Math.random() * punishmentItems.length);
    // Calculate rotation: multiple full turns + land so the pointer (top) points to resultIndex
    // Slice i occupies from i*sliceAngle to (i+1)*sliceAngle. Center is at (i+0.5)*sliceAngle.
    // The pointer is at the top (0/360 degrees). We rotate clockwise.
    // To land on slice `resultIndex`, the center of that slice should be at the top after rotation.
    // That means total rotation = fullTurns*360 + (360 - resultIndex*sliceAngle - sliceAngle/2)
    const fullTurns = 5 + Math.floor(Math.random() * 3);
    const targetAngle = fullTurns * 360 + (360 - resultIndex * sliceAngle - sliceAngle / 2);

    if (spinnerRef.current) {
      spinnerRef.current.style.transition = 'none';
      spinnerRef.current.style.transform = 'rotate(0deg)';
      // Force reflow
      spinnerRef.current.offsetHeight;
      spinnerRef.current.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      spinnerRef.current.style.transform = `rotate(${targetAngle}deg)`;
    }

    setTimeout(async () => {
      const item = punishmentItems[resultIndex];
      setWheelResult(item);
      setWheelSpinning(false);

      // Log punishment
      try {
        await fetch('/api/punishment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: user.personId, punishmentItemId: item.id }),
        });
        await fetchStatus();
      } catch {
        // Ignore log errors
      }
    }, 4200);
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const myStatus = user ? people.find((p) => p.id === user.personId) : null;

  // Not logged in — show person selection + PIN entry
  if (!user) {
    return (
      <div className="phone-container">
        <h1>Chore Tracker</h1>

        {!pinTarget ? (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Who are you?</p>
            <div className="person-buttons">
              {people.map((person) => (
                <button
                  key={person.id}
                  className="person-btn"
                  onClick={() => handlePersonTap(person)}
                >
                  {person.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="pin-entry">
            <p>Enter PIN for <strong>{pinTarget.name}</strong></p>
            <form onSubmit={handlePinSubmit}>
              <input
                type="tel"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                autoFocus
                className="pin-input"
              />
              {pinError && <p className="pin-error">{pinError}</p>}
              <div className="pin-actions">
                <button type="submit" disabled={pin.length < 4 || submitting} className="pin-submit">
                  Login
                </button>
                <button type="button" onClick={() => setPinTarget(null)} className="pin-back">
                  Back
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // Logged in
  return (
    <div className="phone-container">
      {/* Punishment Wheel Overlay */}
      {showWheel && punishmentItems.length >= 2 && (
        <div className="wheel-overlay">
          <h2>Punishment Wheel</h2>
          <p className="wheel-subtitle">You haven&apos;t done any chores or submitted a reason!</p>
          <div className="wheel-container">
            <div className="wheel-pointer"></div>
            <div className="wheel-spinner" ref={spinnerRef}>
              <canvas ref={canvasRef} width={300} height={300}></canvas>
            </div>
          </div>
          {!wheelResult ? (
            <button
              className="wheel-spin-btn"
              onClick={handleSpin}
              disabled={wheelSpinning}
            >
              {wheelSpinning ? 'Spinning...' : 'Spin the Wheel'}
            </button>
          ) : (
            <div className="wheel-result">
              <div className="result-label">Your punishment:</div>
              <div className="result-name">{wheelResult.name}</div>
              {wheelResult.token_deduction > 0 && (
                <div className="result-deduction">-{wheelResult.token_deduction} tokens</div>
              )}
              <button
                className="wheel-dismiss-btn"
                onClick={() => { setShowWheel(false); setWheelResult(null); }}
              >
                OK
              </button>
            </div>
          )}
        </div>
      )}

      <div className="logged-in-header">
        <h1>{user.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {myStatus && (
            <span className="token-balance-badge">
              {myStatus.token_balance || 0} tokens
            </span>
          )}
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* Today's completions */}
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

      {/* Skip display */}
      {myStatus && myStatus.skipReason && (
        <div className="skip-display">
          <p>Skipping today: {myStatus.skipReason}</p>
        </div>
      )}

      {/* Chore grid — always visible so they can add more */}
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

      {/* Rewards link */}
      <button
        className="rewards-link-btn"
        onClick={() => window.location.href = '/rewards'}
      >
        Rewards Shop
      </button>

      {/* Skip section */}
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
              <button type="submit" disabled={!skipText.trim() || skipSubmitting}>
                Submit
              </button>
              <button type="button" onClick={() => { setShowSkip(false); setSkipText(''); }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ntfy info */}
      {myStatus && (
        <div className="ntfy-info">
          <p>Get reminders: install the <strong>ntfy app</strong> and subscribe to:</p>
          <code>{myStatus.ntfy_topic}</code>
        </div>
      )}
    </div>
  );
}

// Draw the punishment wheel on a canvas
function drawWheel(canvas, items) {
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = cx - 2;
  const sliceAngle = (2 * Math.PI) / items.length;

  const colors = [
    '#ef4444', '#3b82f6', '#22c55e', '#f59e0b',
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
    '#14b8a6', '#6366f1', '#e11d48', '#84cc16',
  ];

  items.forEach((item, i) => {
    const start = i * sliceAngle - Math.PI / 2;
    const end = start + sliceAngle;

    // Draw slice
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw label
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + sliceAngle / 2);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Truncate long names
    const label = item.name.length > 14 ? item.name.slice(0, 12) + '..' : item.name;
    ctx.fillText(label, r * 0.6, 0);
    ctx.restore();
  });
}
