'use client';

import { useState, useEffect } from 'react';

export default function RewardsPage() {
  const [user, setUser] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('choreUser');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('choreUser');
      }
    }
    fetchRewards();
  }, []);

  useEffect(() => {
    if (user) fetchBalance();
  }, [user]);

  async function fetchRewards() {
    const res = await fetch('/api/rewards');
    const data = await res.json();
    setRewards(data.filter((r) => r.active));
    setLoading(false);
  }

  async function fetchBalance() {
    const res = await fetch(`/api/tokens?personId=${user.personId}`);
    const data = await res.json();
    setBalance(data.balance);
  }

  async function handleRedeem(rewardId) {
    if (!user || redeeming) return;
    setRedeeming(rewardId);

    const res = await fetch('/api/rewards/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: user.personId, rewardId }),
    });

    if (res.ok) {
      await fetchBalance();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to redeem');
    }
    setRedeeming(null);
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="rewards-container" style={{ textAlign: 'center', paddingTop: 60 }}>
        <h1>Rewards Shop</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>
          Please log in on the <a href="/" style={{ color: 'var(--accent)' }}>home page</a> first.
        </p>
      </div>
    );
  }

  return (
    <div className="rewards-container">
      <div className="rewards-header">
        <h1>Rewards Shop</h1>
        <a href="/" className="rewards-back-btn">Back</a>
      </div>

      <div className="rewards-balance">
        <div className="balance-amount">{balance}</div>
        <div className="balance-label">Tokens Available</div>
      </div>

      {rewards.length === 0 ? (
        <div className="rewards-empty">
          <p>No rewards available yet.</p>
          <p style={{ fontSize: '0.85rem', marginTop: 8 }}>Ask your admin to add some!</p>
        </div>
      ) : (
        rewards.map((reward) => (
          <div key={reward.id} className="reward-card">
            <div className="reward-info">
              <div className="reward-name">{reward.name}</div>
              <div className="reward-cost">{reward.token_cost} tokens</div>
            </div>
            <button
              className="redeem-btn"
              onClick={() => handleRedeem(reward.id)}
              disabled={balance < reward.token_cost || redeeming === reward.id}
            >
              {redeeming === reward.id ? 'Redeeming...' : 'Redeem'}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
