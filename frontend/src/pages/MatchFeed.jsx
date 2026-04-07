import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, Check, Loader2 } from 'lucide-react';
import * as api from '../api.js';
import PlayerAvatar from '../components/PlayerAvatar.jsx';
import { TennisBall, TennisRacket, TennisBallPattern } from '../components/TennisGraphics.jsx';

const CATEGORY_BADGE_CLASS = {
  major: 'badge-major',
  masters1000: 'badge-masters',
  atp500: 'badge-500',
  atp250: 'badge-250',
};

// Client-side scoring calculator (mirrors backend ATP rules)
function calcPoints(match, side) {
  const items = [];
  let total = 0;
  const isWinner = match.winner === side;

  if (!match.isComplete) return { total: 0, items: [{ label: 'In progress', pts: 0 }] };

  if (isWinner && match.isStraightSets) {
    total += 10;
    items.push({ label: 'Straight sets', pts: 10 });
  }

  if (match.sets) {
    for (const set of match.sets) {
      const pg = side === 'home' ? set.home : set.away;
      const og = side === 'home' ? set.away : set.home;
      if (pg === 0 && og === 6) {
        total -= 10;
        items.push({ label: 'Bagel lost (0-6)', pts: -10 });
      }
    }
  }

  const aces = side === 'home' ? match.homeAces : match.awayAces;
  if (aces !== null && aces !== undefined) {
    const acePts = aces * 2;
    total += acePts;
    items.push({ label: `${aces} aces (x2)`, pts: acePts });
  } else if (match.limitedData) {
    items.push({ label: 'Aces n/a', pts: 0, limited: true });
  }

  const dfs = side === 'home' ? match.homeDFs : match.awayDFs;
  if (dfs !== null && dfs !== undefined) {
    const dfPts = dfs * 2;
    total -= dfPts;
    items.push({ label: `${dfs} DFs (x2)`, pts: -dfPts });
  } else if (match.limitedData) {
    items.push({ label: 'DFs n/a', pts: 0, limited: true });
  }

  return { total, items };
}

function SkeletonMatches() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <div className="skeleton skeleton-avatar" style={{ width: 28, height: 28 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-text" style={{ width: '50%' }} />
              <div className="skeleton skeleton-text" style={{ width: '40%' }} />
            </div>
            <div className="skeleton" style={{ width: 40, height: 24, borderRadius: 'var(--radius-sm)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MatchFeed({ league, imageMap }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [filter, setFilter] = useState('all');

  const manager = league?.managers?.find(m => m.id === 'user');
  const rosterNames = new Set(manager?.roster?.map(r => r.player.name.toLowerCase()) || []);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await api.getMatchesByDate(today);
      setMatches(data.matches || []);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      try {
        const cached = await api.getCachedMatches();
        setMatches(cached.matches || []);
        setLastRefresh('cached');
      } catch {
        console.error('Failed to load matches');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMatches();
    const interval = setInterval(() => {
      if (rosterNames.size > 0) loadMatches();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadMatches, rosterNames.size]);

  const isRosterMatch = (match) => {
    const home = match.homePlayer?.toLowerCase() || '';
    const away = match.awayPlayer?.toLowerCase() || '';
    for (const name of rosterNames) {
      const lastName = name.split(' ').pop();
      if (home.includes(lastName) || away.includes(lastName)) return true;
    }
    return false;
  };

  const displayed = filter === 'mine' ? matches.filter(isRosterMatch) : matches;

  return (
    <div className="page">
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)',
      }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>Match Feed</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {lastRefresh && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
              {lastRefresh === 'cached' ? 'Showing cached data' : lastRefresh}
            </span>
          )}
          <button className="btn-secondary btn-compact" onClick={loadMatches} disabled={loading}>
            {loading ? <Loader2 size={14} className="spinner" /> : <RefreshCw size={14} />}
            Refresh
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 'var(--space-1)', marginBottom: 'var(--space-4)' }}>
        {[
          { id: 'all', label: `All (${matches.length})` },
          { id: 'mine', label: `My Players (${matches.filter(isRosterMatch).length})` },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="btn-ghost"
            style={{
              background: filter === f.id ? 'var(--color-primary-dim)' : 'transparent',
              color: filter === f.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: filter === f.id ? 600 : 500,
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${filter === f.id ? 'var(--color-primary-muted)' : 'var(--color-border)'}`,
              fontSize: 'var(--text-sm)',
              minHeight: 44,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter === 'mine' && rosterNames.size === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)', position: 'relative', overflow: 'hidden' }}>
          <TennisBallPattern count={3} />
          <TennisRacket size={44} color="var(--color-text-tertiary)" style={{ margin: '0 auto var(--space-3)', display: 'block', position: 'relative' }} />
          <p style={{ color: 'var(--color-text-secondary)', position: 'relative' }}>No players on your roster yet. Visit the Market to buy some!</p>
        </div>
      )}

      {filter === 'mine' && rosterNames.size > 0 && displayed.length === 0 && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)', position: 'relative', overflow: 'hidden' }}>
          <TennisBallPattern count={3} />
          <TennisBall size={36} opacity={0.3} style={{ margin: '0 auto var(--space-3)', display: 'block', position: 'relative' }} />
          <p style={{ color: 'var(--color-text-secondary)', position: 'relative' }}>None of your players had matches today.</p>
        </div>
      )}

      {displayed.length === 0 && filter === 'all' && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)', position: 'relative', overflow: 'hidden' }}>
          <TennisBallPattern count={4} />
          <TennisBall size={36} opacity={0.3} style={{ margin: '0 auto var(--space-3)', display: 'block', position: 'relative' }} />
          <p style={{ color: 'var(--color-text-secondary)', position: 'relative' }}>No matches found for today.</p>
        </div>
      )}

      {loading && matches.length === 0 ? (
        <SkeletonMatches />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {displayed.slice(0, 100).map((m, i) => (
            <MatchCard
              key={m.matchId || i}
              match={m}
              highlight={isRosterMatch(m)}
              imageMap={imageMap}
            />
          ))}
        </div>
      )}

      {displayed.length > 100 && (
        <p style={{
          fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
          textAlign: 'center', marginTop: 'var(--space-3)',
        }}>
          Showing 100 of {displayed.length}
        </p>
      )}
    </div>
  );
}

function MatchCard({ match, highlight, imageMap }) {
  const [expanded, setExpanded] = useState(false);
  const isComplete = match.isComplete;

  const homeScore = calcPoints(match, 'home');
  const awayScore = calcPoints(match, 'away');

  return (
    <div
      className={`card card-interactive ${highlight ? 'card-highlight' : ''}`}
      style={{ padding: 'var(--space-3) var(--space-4)' }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Main row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
            <PlayerAvatar name={match.homePlayer} imageMap={imageMap} size={28} />
            <PlayerAvatar name={match.awayPlayer} imageMap={imageMap} size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <span style={{
                fontWeight: match.winner === 'home' ? 700 : 400,
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-sm)',
                wordBreak: 'break-word',
              }}>
                {match.homePlayer}
                {match.winner === 'home' && isComplete && (
                  <Check size={14} style={{ marginLeft: 4, color: 'var(--color-success)', verticalAlign: 'middle' }} />
                )}
              </span>
              <PointsBadge pts={homeScore.total} isComplete={isComplete} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 2, flexWrap: 'wrap' }}>
              <span style={{
                fontWeight: match.winner === 'away' ? 700 : 400,
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-sm)',
                color: match.winner === 'away' ? 'var(--color-text)' : 'var(--color-text-secondary)',
                wordBreak: 'break-word',
              }}>
                {match.awayPlayer}
                {match.winner === 'away' && isComplete && (
                  <Check size={14} style={{ marginLeft: 4, color: 'var(--color-success)', verticalAlign: 'middle' }} />
                )}
              </span>
              <PointsBadge pts={awayScore.total} isComplete={isComplete} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ textAlign: 'right' }}>
            <div className="font-mono" style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>
              {match.homeSets} - {match.awaySets}
            </div>
            {match.tournamentName && (
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                {match.tournamentName}{match.round ? ` - ${match.round}` : ''}
              </div>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end', marginTop: 'var(--space-1)' }}>
              {match.tournamentCategory && (
                <span className={`badge ${CATEGORY_BADGE_CLASS[match.tournamentCategory] || 'badge-250'}`}>
                  {match.tournamentCategory.toUpperCase()}
                </span>
              )}
              {match.dataSource && (
                <span className={`badge badge-${match.dataSource}`}>{match.dataSource.toUpperCase()}</span>
              )}
              {match.limitedData && <span className="badge badge-limited">Limited</span>}
              {!isComplete && <span className="badge badge-live">LIVE</span>}
            </div>
          </div>
          {/* Expand/collapse chevron */}
          <div style={{ color: 'var(--color-text-tertiary)' }}>
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--color-border-subtle)',
          marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)',
        }}>
          {match.sets?.length > 0 && (
            <div className="font-mono" style={{
              fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-3)',
            }}>
              Sets:{' '}
              {match.sets.map((s, i) => (
                <span key={i} style={{
                  display: 'inline-block',
                  background: 'var(--color-surface-3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2px 8px',
                  marginRight: i < match.sets.length - 1 ? 6 : 0,
                  letterSpacing: '0.05em',
                }}>
                  {s.home}<span style={{ color: 'var(--color-text-tertiary)', margin: '0 2px' }}>–</span>{s.away}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 'var(--space-3)' }}>
            <ScoreBreakdown name={match.homePlayer} score={homeScore} isWinner={match.winner === 'home'} />
            <ScoreBreakdown name={match.awayPlayer} score={awayScore} isWinner={match.winner === 'away'} />
          </div>

          {match.homeAces !== null && (
            <div className="font-mono" style={{
              fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
              marginTop: 'var(--space-3)',
            }}>
              Aces: {match.homePlayer}: {match.homeAces} | {match.awayPlayer}: {match.awayAces}
            </div>
          )}
          {match.homeDFs !== null && (
            <div className="font-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
              DFs: {match.homePlayer}: {match.homeDFs} | {match.awayPlayer}: {match.awayDFs}
            </div>
          )}
          {match.timestamp && (
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
              {new Date(match.timestamp).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PointsBadge({ pts, isComplete }) {
  if (!isComplete) return null;
  const cls = pts > 0 ? 'points-positive' : pts < 0 ? 'points-negative' : 'points-zero';
  return (
    <span className={cls}>
      {pts > 0 ? '+' : ''}{pts}pts
    </span>
  );
}

function ScoreBreakdown({ name, score, isWinner }) {
  const short = name.length > 15 ? name.split(' ').pop() : name;
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        marginBottom: 'var(--space-2)',
      }}>
        <span style={{
          fontSize: 'var(--text-sm)', fontWeight: 600,
          color: isWinner ? 'var(--color-primary)' : 'var(--color-text)',
          fontFamily: 'var(--font-heading)',
        }}>
          {short}
        </span>
        <span className={score.total > 0 ? 'points-positive' : score.total < 0 ? 'points-negative' : 'points-zero'}
          style={{ fontSize: 'var(--text-xs)' }}>
          {score.total > 0 ? '+' : ''}{score.total}pts
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {score.items.map((item, i) => {
          const color = item.limited ? 'var(--color-warning)' : item.pts > 0 ? 'var(--color-success)' : item.pts < 0 ? 'var(--color-error)' : 'var(--color-text-tertiary)';
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              fontSize: 'var(--text-2xs)',
            }}>
              <span className="font-mono" style={{
                color,
                fontWeight: 600,
                minWidth: 36,
                textAlign: 'right',
              }}>
                {item.pts > 0 ? '+' : ''}{item.pts}
              </span>
              <span style={{
                color: 'var(--color-text-tertiary)',
                fontSize: 'var(--text-2xs)',
                fontFamily: 'var(--font-body)',
              }}>
                {item.label}
                {item.limited && <span style={{ color: 'var(--color-warning)', marginLeft: 4 }}>*</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
