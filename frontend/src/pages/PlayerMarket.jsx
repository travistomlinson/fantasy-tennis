import React, { useState, useEffect } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import * as api from '../api.js';
import PlayerAvatar from '../components/PlayerAvatar.jsx';
import { TennisBall, TennisRacket, TennisBallPattern } from '../components/TennisGraphics.jsx';

function SkeletonMarket() {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton" style={{ width: 28, height: 14, borderRadius: 'var(--radius-sm)' }} />
          <div className="skeleton skeleton-avatar" style={{ width: 28, height: 28 }} />
          <div className="skeleton skeleton-text" style={{ width: '30%', marginBottom: 0 }} />
          <div className="skeleton skeleton-text" style={{ width: 40, marginBottom: 0 }} />
          <div className="skeleton skeleton-text" style={{ width: 50, marginBottom: 0, marginLeft: 'auto' }} />
          <div className="skeleton" style={{ width: 48, height: 28, borderRadius: 'var(--radius-md)' }} />
        </div>
      ))}
    </div>
  );
}

export default function PlayerMarket({ league, onRefresh, imageMap, addToast }) {
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [tour, setTour] = useState('');
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState('rank'); // rank | price | name

  const manager = league?.managers?.find(m => m.id === 'user');
  const rosterIds = new Set(manager?.roster?.map(r => r.player.id) || []);

  useEffect(() => {
    loadPlayers();
  }, [tour]);

  const loadPlayers = async () => {
    setLoading(true);
    try {
      const data = await api.getPlayers(tour, '');
      setPlayers(data);
    } catch (err) {
      console.error('Failed to load players:', err);
    }
    setLoading(false);
  };

  const filtered = players.filter(p => {
    if (search) {
      return p.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'price': return b.currentPrice - a.currentPrice;
      case 'name': return a.name.localeCompare(b.name);
      case 'rank':
      default: return a.rank - b.rank;
    }
  });

  const handleBuy = async (player) => {
    try {
      await api.buyPlayer('user', player);
      onRefresh();
      addToast?.(`Added ${player.name} to your roster!`, 'success');
    } catch (err) {
      addToast?.(err.message, 'error');
    }
  };

  const getDisabledReason = (player) => {
    if (!manager) return null;
    if (manager.roster.length >= 8) return 'Roster full (8/8)';
    if (manager.coins < player.currentPrice) return 'Not enough credits';
    return null;
  };

  return (
    <div className="page">
      <h2 style={{ fontFamily: 'var(--font-heading)' }}>Player Market</h2>

      {/* Search + filter bar */}
      <div style={{
        display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)',
        flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 'min(180px, 100%)' }}>
          <Search size={16} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--color-text-tertiary)', pointerEvents: 'none',
          }} />
          <input
            placeholder="Search players..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 36 }}
          />
        </div>
        <select value={tour} onChange={e => setTour(e.target.value)}>
          <option value="">All Tours</option>
          <option value="ATP">ATP</option>
          <option value="WTA">WTA</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <ArrowUpDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ minWidth: 'min(100px, 100%)' }}>
            <option value="rank">By Rank</option>
            <option value="price">By Price</option>
            <option value="name">By Name</option>
          </select>
        </div>
      </div>

      {/* Balance bar */}
      {manager && (
        <div style={{
          display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)',
          padding: 'var(--space-2) var(--space-3)',
          background: 'var(--color-surface-1)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border-subtle)',
          fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)',
        }}>
          <span>Balance: <span className="font-mono" style={{ fontWeight: 600, color: 'var(--color-text)' }}>{manager.coins} cr</span></span>
          <span>Roster: <span className="font-mono" style={{ fontWeight: 600, color: 'var(--color-text)' }}>{manager.roster.length}/8</span></span>
        </div>
      )}

      {loading ? (
        <SkeletonMarket />
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Tour</th>
                <th>Price</th>
                <th className="hide-mobile">Country</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 100).map(p => {
                const owned = rosterIds.has(p.id);
                const disabledReason = getDisabledReason(p);
                return (
                  <tr key={p.id} style={{
                    opacity: owned ? 0.5 : 1,
                  }}>
                    <td>
                      <span className="font-mono" style={{ fontWeight: 600 }}>#{p.rank}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <PlayerAvatar name={p.name} imageMap={imageMap} size={28} />
                        <div>
                          <span style={{ fontWeight: 500 }}>{p.name}</span>
                          {p.recentMatches?.length > 0 && (
                            <div style={{ display: 'flex', gap: 'var(--space-0-5)', marginTop: 'var(--space-0-5)' }}>
                              {p.recentMatches.slice(0, 5).map((m, i) => (
                                <span key={i} style={{
                                  width: 8, height: 8, borderRadius: 2, display: 'inline-block',
                                  background: m.won ? 'var(--color-success)' : 'var(--color-error)',
                                }} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge badge-${p.tour.toLowerCase()}`}>{p.tour}</span></td>
                    <td>
                      <span className="font-mono" style={{ fontWeight: 600 }}>{p.currentPrice} cr</span>
                    </td>
                    <td className="hide-mobile" style={{ color: 'var(--color-text-tertiary)' }}>{p.country}</td>
                    <td>
                      {owned ? (
                        <span style={{
                          fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
                          fontWeight: 500,
                        }}>Owned</span>
                      ) : (
                        <div style={{ position: 'relative' }}>
                          <button
                            className="btn-primary btn-compact"
                            disabled={!!disabledReason}
                            onClick={() => handleBuy(p)}
                            title={disabledReason || undefined}
                          >
                            Buy
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sorted.length === 0 && search && (
            <div style={{
              textAlign: 'center', padding: 'var(--space-8)',
              color: 'var(--color-text-secondary)', position: 'relative', overflow: 'hidden',
            }}>
              <TennisBallPattern count={3} />
              <TennisBall size={32} opacity={0.25} style={{ margin: '0 auto var(--space-3)', display: 'block', position: 'relative' }} />
              <p style={{ position: 'relative' }}>No players match "{search}"</p>
              <button className="btn-ghost" onClick={() => setSearch('')} style={{ marginTop: 'var(--space-2)', position: 'relative' }}>
                Clear search
              </button>
            </div>
          )}
          {sorted.length > 100 && (
            <p style={{
              padding: 'var(--space-3)', fontSize: 'var(--text-xs)',
              color: 'var(--color-text-tertiary)', textAlign: 'center',
            }}>
              Showing 100 of {sorted.length}. Use search to narrow results.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
