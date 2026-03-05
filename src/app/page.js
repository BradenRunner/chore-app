'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function Home() {
  const [people, setPeople] = useState([]);
  const [user, setUser] = useState(null);
  const [pinTarget, setPinTarget] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState(null);
  const [supplies, setSupplies] = useState([]);
  // Meals state
  const [meals, setMeals] = useState([]);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [mealName, setMealName] = useState('');
  const [mealLink, setMealLink] = useState('');
  // Punishment wheel state
  const [showWheel, setShowWheel] = useState(false);
  const [punishmentItems, setPunishmentItems] = useState([]);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState(null);
  const [wheelChecked, setWheelChecked] = useState(false);
  const canvasRef = useRef(null);
  const spinnerRef = useRef(null);
  // Skip voting state
  const [pendingVotes, setPendingVotes] = useState([]);
  const [votingOn, setVotingOn] = useState(null); // skipReasonId being voted on

  const fetchStatus = useCallback(async () => {
    const res = await fetch('/api/status');
    const data = await res.json();
    setPeople(data.people);
    setStatusData(data);
    setLoading(false);
    return data;
  }, []);

  const fetchPendingVotes = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/skip-votes?voterId=${user.personId}`);
      const data = await res.json();
      setPendingVotes(data);
    } catch {
      // ignore
    }
  }, [user]);

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
    fetchSupplies();
    fetchMeals();
  }, [fetchStatus]);

  // Fetch pending votes on login and poll every 15s
  useEffect(() => {
    if (!user) return;
    fetchPendingVotes();
    const interval = setInterval(fetchPendingVotes, 15000);
    return () => clearInterval(interval);
  }, [user, fetchPendingVotes]);

  // Check if punishment wheel should show
  useEffect(() => {
    if (!user || !statusData || wheelChecked) return;
    const myStatus = statusData.people.find((p) => p.id === user.personId);
    if (!myStatus) return;

    const shouldShowWheel =
      myStatus.completions.length === 0 && (
        // Original: no skip at all
        (!myStatus.skipReason) ||
        // New: skip was voted invalid and not yet punished
        (myStatus.skipVoteResult === 'invalid' && !myStatus.punishedToday)
      );

    if (shouldShowWheel) {
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

  async function fetchSupplies() {
    try {
      const res = await fetch('/api/supplies');
      const data = await res.json();
      setSupplies(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  }

  async function fetchMeals() {
    try {
      const res = await fetch('/api/meals');
      const data = await res.json();
      setMeals(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  }

  async function handleAddMeal(e) {
    e.preventDefault();
    if (!mealName.trim()) return;
    await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: mealName.trim(), link: mealLink.trim() || null, addedBy: user?.personId }),
    });
    setMealName('');
    setMealLink('');
    setShowAddMeal(false);
    fetchMeals();
  }

  async function handleDeleteMeal(id) {
    await fetch('/api/meals', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchMeals();
  }

  async function handleToggleMealCooked(meal) {
    await fetch('/api/meals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: meal.id, cooked: !meal.cooked }),
    });
    fetchMeals();
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
    setShowWheel(false);
    setWheelResult(null);
    setWheelChecked(false);
    setPendingVotes([]);
  }

  async function handleVote(skipReasonId, vote) {
    setVotingOn(skipReasonId);
    try {
      await fetch('/api/skip-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipReasonId, voterId: user.personId, vote }),
      });
      await fetchPendingVotes();
      await fetchStatus();
    } catch {
      // ignore
    }
    setVotingOn(null);
  }

  // Punishment wheel spin
  function handleSpin() {
    if (wheelSpinning || punishmentItems.length < 2) return;
    setWheelSpinning(true);
    setWheelResult(null);

    const sliceAngle = 360 / punishmentItems.length;
    const resultIndex = Math.floor(Math.random() * punishmentItems.length);
    const fullTurns = 5 + Math.floor(Math.random() * 3);
    const targetAngle = fullTurns * 360 + (360 - resultIndex * sliceAngle - sliceAngle / 2);

    if (spinnerRef.current) {
      spinnerRef.current.style.transition = 'none';
      spinnerRef.current.style.transform = 'rotate(0deg)';
      spinnerRef.current.offsetHeight;
      spinnerRef.current.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      spinnerRef.current.style.transform = `rotate(${targetAngle}deg)`;
    }

    setTimeout(async () => {
      const item = punishmentItems[resultIndex];
      setWheelResult(item);
      setWheelSpinning(false);

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

  // Determine wheel subtitle based on context
  function getWheelSubtitle() {
    if (myStatus && myStatus.skipVoteResult === 'invalid') {
      return 'Your skip reason was voted invalid!';
    }
    return "You haven\u2019t done any chores or submitted a reason!";
  }

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
          <p className="wheel-subtitle">{getWheelSubtitle()}</p>
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

      {/* Pending Skip Votes — must complete all before accessing chores */}
      {pendingVotes.length > 0 && (
        <div className="vote-gate">
          <div className="vote-gate-header">
            <h2>Vote Before You Start</h2>
            <p>You must vote on all skip reasons before marking off chores.</p>
          </div>
          <div className="vote-section">
            <h3>Skip Votes Needed ({pendingVotes.length})</h3>
            {pendingVotes.map((skip) => (
              <div key={skip.id} className="vote-card">
                <div className="vote-card-info">
                  <strong>{skip.personName}</strong> wants to skip:
                  <blockquote>&ldquo;{skip.reason}&rdquo;</blockquote>
                </div>
                <div className="vote-card-actions">
                  <button
                    className="vote-btn valid"
                    onClick={() => handleVote(skip.id, 'valid')}
                    disabled={votingOn === skip.id}
                  >
                    Valid
                  </button>
                  <button
                    className="vote-btn invalid"
                    onClick={() => handleVote(skip.id, 'invalid')}
                    disabled={votingOn === skip.id}
                  >
                    Not Valid
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard — shown after votes are cleared */}
      {pendingVotes.length === 0 && myStatus && (() => {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        const lowSupplies = supplies.filter((s) => {
          if (!s.days_duration || s.days_duration === 0) return false;
          return (s.daysRemaining / s.days_duration) < 0.5;
        });
        return (
          <div className="phone-dashboard">
            <p className="phone-dash-greeting">{greeting}, {user.name}!</p>

            {/* Stat cards */}
            <div className="phone-dash-cards">
              <a href="/chores" className="phone-dash-card green phone-dash-card-link">
                <div className="phone-dash-label">Chores Today</div>
                <div className="phone-dash-value">{myStatus.completions.length}</div>
                <div className="phone-dash-sub">{myStatus.completions.length === 0 ? 'Tap to start' : `${myStatus.completions.length} completed`}</div>
              </a>
              <a href="/rewards" className="phone-dash-card amber phone-dash-card-link">
                <div className="phone-dash-label">Tokens</div>
                <div className="phone-dash-value">{myStatus.token_balance || 0}</div>
                <div className="phone-dash-sub">Tap to spend</div>
              </a>
              <div className="phone-dash-card pink">
                <div className="phone-dash-label">Streak</div>
                <div className="phone-dash-value">{myStatus.streak || 0}</div>
                <div className="phone-dash-sub">{myStatus.streak ? `${myStatus.streak} day${myStatus.streak !== 1 ? 's' : ''}` : 'Start today!'}</div>
              </div>
            </div>

            {/* Skip status */}
            {myStatus.skipReason && (
              <div className={`skip-display${myStatus.skipVoteResult === 'invalid' ? ' skip-rejected' : ''}`}>
                <p>Skipping today: {myStatus.skipReason}</p>
                <p className={`skip-vote-status ${myStatus.skipVoteResult || 'pending'}`}>
                  {!myStatus.skipVoteResult && 'Waiting for votes...'}
                  {myStatus.skipVoteResult === 'valid' && 'Skip approved!'}
                  {myStatus.skipVoteResult === 'invalid' && 'Skip rejected'}
                </p>
              </div>
            )}

            {/* Supplies */}
            {supplies.length > 0 && (
              <div className="phone-dash-supplies">
                <div className="phone-dash-supplies-title">Supplies</div>
                {supplies.map((s) => {
                  const pct = s.days_duration ? Math.max(0, Math.min(100, (s.daysRemaining / s.days_duration) * 100)) : 0;
                  const status = pct === 0 ? 'critical' : pct < 25 ? 'critical' : pct < 50 ? 'warning' : 'ok';
                  return (
                    <div key={s.id} className="phone-dash-supply-item">
                      <div className="phone-dash-supply-row">
                        <span className="phone-dash-supply-name">{s.name}</span>
                        <span className={`phone-dash-supply-days ${status}`}>
                          {s.daysRemaining === 0 ? 'EMPTY' : `${s.daysRemaining}d left`}
                        </span>
                      </div>
                      <div className="phone-dash-supply-bar">
                        <div className={`phone-dash-supply-fill ${status}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Meals This Week */}
            <div className="phone-dash-meals">
              <div className="phone-dash-meals-title">Meals This Week</div>
              {meals.length === 0 && !showAddMeal && (
                <p className="phone-dash-meals-empty">No meals planned yet.</p>
              )}
              {meals.map((meal) => (
                <div key={meal.id} className={`phone-dash-meal-item${meal.cooked ? ' cooked' : ''}`}>
                  <button
                    className={`phone-dash-meal-check${meal.cooked ? ' checked' : ''}`}
                    onClick={() => handleToggleMealCooked(meal)}
                  >
                    {meal.cooked ? '\u2705' : '\u25CB'}
                  </button>
                  <div className={`phone-dash-meal-name${meal.cooked ? ' cooked' : ''}`}>
                    {meal.link ? (
                      <a href={meal.link} target="_blank" rel="noopener noreferrer" className="phone-dash-meal-link">
                        {meal.name}
                      </a>
                    ) : (
                      <span>{meal.name}</span>
                    )}
                  </div>
                  <button
                    className="phone-dash-meal-delete"
                    onClick={() => handleDeleteMeal(meal.id)}
                  >
                    &times;
                  </button>
                </div>
              ))}
              {showAddMeal ? (
                <form onSubmit={handleAddMeal} className="phone-dash-meal-form">
                  <input
                    type="text"
                    placeholder="Meal name"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    autoFocus
                  />
                  <input
                    type="url"
                    placeholder="Recipe link (optional)"
                    value={mealLink}
                    onChange={(e) => setMealLink(e.target.value)}
                  />
                  <div className="phone-dash-meal-form-actions">
                    <button type="submit" disabled={!mealName.trim()}>Save</button>
                    <button type="button" onClick={() => { setShowAddMeal(false); setMealName(''); setMealLink(''); }}>Cancel</button>
                  </div>
                </form>
              ) : (
                <button className="phone-dash-meal-add-btn" onClick={() => setShowAddMeal(true)}>
                  + Add Meal
                </button>
              )}
            </div>

          </div>
        );
      })()}
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
    const label = item.name.length > 14 ? item.name.slice(0, 12) + '..' : item.name;
    ctx.fillText(label, r * 0.6, 0);
    ctx.restore();
  });
}
