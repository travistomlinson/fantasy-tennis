import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Medal } from 'lucide-react';
import * as api from '../api.js';
import PlayerAvatar from '../components/PlayerAvatar.jsx';

function SkeletonStandings() {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton" style={{ width: 24, height: 24, borderRadius: 'var(--radius-sm)' }} />
          <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: 0 }} />
          <div className="skeleton skeleton-text" style={{ width: 50, marginBottom: 0, marginLeft: 'auto' }} />
          <div className="skeleton skeleton-text" style={{ width: 50, marginBottom: 0 }} />
        </div>
      ))}
    </div>
  );
}

export default function History({ imageMap }) {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('standings');

  useEffect(() => {
    api.getAvailableWeeks().then(w => {
      setWeeks(w);
      if (w.length > 0) setSelectedWeek(w[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedWeek === null) return;
    setLoading(true);
    api.getWeekSnapshot(selectedWeek).then(data => {
      setSnapshot(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedWeek]);

  if (weeks.length === 0) {
    return (
      <div className="page">
        <h2 style={{ fontFamily: 'var(--font-heading)' }}>History</h2>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>No historical data yet.</p>
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
            Enter match results and hit <strong>Recalculate Scores</strong> in the Admin panel to record a week's results.
            Each recalculation snapshots the current week for historical viewing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)',
      }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>History</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>Week:</span>
          {weeks.length <= 10 ? (
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              {weeks.map(w => (
                <button
                  key={w}
                  onClick={() => setSelectedWeek(w)}
                  className={selectedWeek === w ? 'btn-primary btn-compact' : 'btn-ghost btn-compact'}
                  style={{
                    minWidth: 44,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: selectedWeek === w ? 700 : 500,
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
          ) : (
            <select
              value={selectedWeek || ''}
              onChange={e => setSelectedWeek(Number(e.target.value))}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {weeks.map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonStandings />
      ) : snapshot ? (
        <>
          <p style={{
            fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
            marginBottom: 'var(--space-4)',
          }}>
            Recorded {new Date(snapshot.timestamp).toLocaleString()}
          </p>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 'var(--space-1)', marginBottom: 'var(--space-4)' }}>
            {[
              { id: 'standings', label: 'Standings' },
              { id: 'matches', label: `Matches (${snapshot.matches?.length || 0})` },
              { id: 'roster', label: 'Rosters' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="btn-ghost"
                style={{
                  background: tab === t.id ? 'var(--color-primary-dim)' : 'transparent',
                  color: tab === t.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontWeight: tab === t.id ? 600 : 500,
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${tab === t.id ? 'var(--color-primary-muted)' : 'var(--color-border)'}`,
                  fontSize: 'var(--text-sm)',
                  minHeight: 44,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'standings' && <StandingsTab snapshot={snapshot} />}
          {tab === 'matches' && <MatchesTab snapshot={snapshot} imageMap={imageMap} />}
          {tab === 'roster' && <RostersTab snapshot={snapshot} imageMap={imageMap} />}
        </>
      ) : null}
    </div>
  );
}

function StandingsTab({ snapshot }) {
  const { standings, scores } = snapshot;

  const getMedalColor = (i) => {
    if (i === 0) return 'var(--color-gold)';
    if (i === 1) return 'var(--color-silver)';
    if (i === 2) return 'var(--color-bronze)';
    return null;
  };

  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Manager</th>
            <th>Week Pts</th>
            <th>Total Pts</th>
            <th className="hide-mobile">Top Scorer</th>
          </tr>
        </thead>
        <tbody>
          {standings?.map((m, i) => {
            const medalColor = getMedalColor(i);
            const managerScores = scores?.[m.id];
            const topScorer = managerScores?.playerScores
              ?.filter(ps => ps.weeklyPoints > 0)
              ?.sort((a, b) => b.weeklyPoints - a.weeklyPoints)?.[0];
            const isUser = m.id === 'user';

            return (
              <tr key={m.id} style={{
                background: isUser ? 'var(--color-primary-dim)' : 'transparent',
                borderLeft: isUser ? '3px solid var(--color-primary)' : undefined,
              }}>
                <td style={{ fontWeight: 600 }} aria-label={`Rank ${i + 1}`}>
                  {medalColor ? (
                    <Medal size={18} style={{ color: medalColor }} />
                  ) : (
                    <span className="font-mono">{i + 1}</span>
                  )}
                </td>
                <td style={{ fontWeight: isUser ? 700 : 400 }}>
                  {m.name}
                  {isUser && <span style={{ color: 'var(--color-primary)', fontSize: 'var(--text-xs)', marginLeft: 'var(--space-1)' }}>(You)</span>}
                </td>
                <td>
                  <span className={m.weeklyPoints > 0 ? 'points-positive' : m.weeklyPoints < 0 ? 'points-negative' : 'points-zero'}>
                    {m.weeklyPoints > 0 ? '+' : ''}{m.weeklyPoints}
                  </span>
                </td>
                <td>
                  <span className="font-mono" style={{ fontWeight: 600 }}>{m.totalPoints}</span>
                </td>
                <td className="hide-mobile" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
                  {topScorer ? (
                    <span>{topScorer.playerName} (<span className="font-mono">{topScorer.weeklyPoints}pts</span>)</span>
                  ) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MatchesTab({ snapshot, imageMap }) {
  const { matches, scores } = snapshot;

  if (!matches || matches.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-secondary)' }}>
        No matches recorded this week.
      </div>
    );
  }

  const matchImpacts = {};
  if (scores) {
    for (const [managerId, result] of Object.entries(scores)) {
      for (const ps of result.playerScores || []) {
        for (const m of ps.matches || []) {
          if (!matchImpacts[m.matchId]) matchImpacts[m.matchId] = [];
          matchImpacts[m.matchId].push({
            managerId,
            playerName: ps.playerName,
            points: m.total,
            breakdown: m.breakdown,
          });
        }
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {matches.map((m, i) => (
        <MatchHistoryCard key={m.matchId || i} match={m} impacts={matchImpacts[m.matchId]} imageMap={imageMap} />
      ))}
    </div>
  );
}

function MatchHistoryCard({ match, impacts, imageMap }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card card-interactive" style={{ padding: 'var(--space-3) var(--space-4)' }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <PlayerAvatar name={match.homePlayer} imageMap={imageMap} size={24} />
            <PlayerAvatar name={match.awayPlayer} imageMap={imageMap} size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
                fontWeight: match.winner === 'home' ? 700 : 400,
                fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)',
                wordBreak: 'break-word',
              }}>
                {match.homePlayer}
              </span>
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>vs</span>
              <span style={{
                fontWeight: match.winner === 'away' ? 700 : 400,
                fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)',
                wordBreak: 'break-word',
              }}>
                {match.awayPlayer}
              </span>
            </div>
            {match.tournamentName && (
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                {match.tournamentName}{match.round ? ` - ${match.round}` : ''}
              </div>
            )}
            {match.sets?.length > 0 && (
              <div className="font-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                {match.sets.map((s, i) => `${s.home}-${s.away}`).join(' ')}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ textAlign: 'right' }}>
            <span className="font-mono" style={{ fontWeight: 600 }}>{match.homeSets}-{match.awaySets}</span>
            <div style={{ display: 'flex', gap: 'var(--space-1)', marginTop: 'var(--space-0-5)' }}>
              {match.dataSource && (
                <span className={`badge badge-${match.dataSource}`}>{match.dataSource.toUpperCase()}</span>
              )}
              {match.limitedData && <span className="badge badge-limited">Limited</span>}
            </div>
          </div>
          <div style={{ color: 'var(--color-text-tertiary)' }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Fantasy impact summary */}
      {impacts?.length > 0 && (
        <div style={{
          marginTop: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)',
          background: 'var(--color-primary-dim)', borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-xs)',
        }}>
          {impacts.map((imp, i) => (
            <span key={i} style={{ marginRight: 'var(--space-3)' }}>
              {imp.playerName}: <span className={imp.points >= 0 ? 'font-mono' : 'font-mono'} style={{
                fontWeight: 600,
                color: imp.points >= 0 ? 'var(--color-primary)' : 'var(--color-error)',
              }}>
                {imp.points > 0 ? '+' : ''}{imp.points}pts
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Expanded scoring breakdown */}
      {expanded && impacts?.length > 0 && (
        <div style={{
          borderTop: '1px solid var(--color-border-subtle)',
          marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)',
        }}>
          {impacts.map((imp, i) => (
            <div key={i} style={{ marginBottom: 'var(--space-3)' }}>
              <div style={{
                fontWeight: 600, fontSize: 'var(--text-sm)',
                fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-1)',
              }}>
                {imp.playerName}
                <span style={{
                  fontWeight: 400, color: 'var(--color-text-tertiary)',
                  fontSize: 'var(--text-xs)', marginLeft: 'var(--space-1-5)',
                }}>
                  ({imp.managerId === 'user' ? 'You' : imp.managerId})
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                {imp.breakdown?.map((b, j) => (
                  <span key={j} className={b.points > 0 ? 'points-positive' : b.points < 0 ? 'points-negative' : 'points-zero'}>
                    {b.event}: {b.points > 0 ? '+' : ''}{b.points}
                    {b.limited && ' *'}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {expanded && (!impacts || impacts.length === 0) && (
        <div style={{
          borderTop: '1px solid var(--color-border-subtle)',
          marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)',
          fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)',
        }}>
          No fantasy impact -- no rostered players in this match.
        </div>
      )}
    </div>
  );
}

function RostersTab({ snapshot, imageMap }) {
  const { rosters, scores } = snapshot;
  const [expandedManager, setExpandedManager] = useState('user');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {rosters?.map(manager => {
        const isExpanded = expandedManager === manager.id;
        const managerScores = scores?.[manager.id];
        const playerScoreMap = {};
        for (const ps of managerScores?.playerScores || []) {
          playerScoreMap[ps.playerId] = ps;
        }

        const active = manager.roster.filter(r => !r.benched);
        const benched = manager.roster.filter(r => r.benched);
        const isUser = manager.id === 'user';

        return (
          <div key={manager.id} className={`card ${isUser && !isExpanded ? 'card-highlight' : ''}`}>
            <div
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', minHeight: 44,
              }}
              onClick={() => setExpandedManager(isExpanded ? null : manager.id)}
            >
              <div>
                <span style={{
                  fontWeight: 600, fontSize: 'var(--text-base)',
                  fontFamily: 'var(--font-heading)',
                }}>
                  {manager.name}
                </span>
                {isUser && <span style={{ color: 'var(--color-primary)', fontSize: 'var(--text-xs)', marginLeft: 'var(--space-1)' }}>(You)</span>}
                <span style={{
                  color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)',
                  marginLeft: 'var(--space-2)',
                }}>
                  {manager.roster.length} players
                </span>
              </div>
              <div style={{
                display: 'flex', gap: 'var(--space-2)',
                fontSize: 'var(--text-sm)', alignItems: 'center',
                flexWrap: 'wrap', justifyContent: 'flex-end',
              }}>
                <span>
                  Week: <span className={manager.weeklyPoints > 0 ? 'points-positive' : manager.weeklyPoints < 0 ? 'points-negative' : 'points-zero'}>
                    {manager.weeklyPoints > 0 ? '+' : ''}{manager.weeklyPoints}
                  </span>
                </span>
                <span className="font-mono" style={{ color: 'var(--color-text-tertiary)' }}>{manager.coins} cr</span>
                <span style={{ color: 'var(--color-text-tertiary)' }}>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </div>
            </div>

            {isExpanded && (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <div style={{
                  fontSize: 'var(--text-xs)', color: 'var(--color-primary)',
                  fontWeight: 600, marginBottom: 'var(--space-2)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Active ({active.length})
                </div>
                <table style={{ marginBottom: 'var(--space-3)' }}>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Rank</th>
                      <th className="hide-mobile">Tour</th>
                      <th>Week Pts</th>
                      <th className="hide-mobile">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.map(slot => {
                      const ps = playerScoreMap[slot.player.id];
                      return (
                        <tr key={slot.player.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <PlayerAvatar name={slot.player.name} imageMap={imageMap} size={24} />
                              <span style={{ fontWeight: 500 }}>{slot.player.name}</span>
                            </div>
                          </td>
                          <td><span className="font-mono">#{slot.player.rank}</span></td>
                          <td className="hide-mobile">
                            <span className={`badge badge-${slot.player.tour?.toLowerCase()}`}>{slot.player.tour}</span>
                          </td>
                          <td>
                            <span className={(ps?.weeklyPoints || 0) > 0 ? 'points-positive' : (ps?.weeklyPoints || 0) < 0 ? 'points-negative' : 'points-zero'}>
                              {(ps?.weeklyPoints || 0) > 0 ? '+' : ''}{ps?.weeklyPoints || 0}
                            </span>
                          </td>
                          <td className="hide-mobile" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                            {ps?.matches?.length > 0
                              ? ps.matches.map(m =>
                                  m.breakdown?.map(b => `${b.event}:${b.points > 0 ? '+' : ''}${b.points}`).join(', ')
                                ).join(' | ')
                              : 'No matches'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {benched.length > 0 && (
                  <>
                    <div style={{
                      fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
                      fontWeight: 600, marginBottom: 'var(--space-2)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      Bench ({benched.length})
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      {benched.map(slot => (
                        <div key={slot.player.id} style={{
                          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                          fontSize: 'var(--text-sm)', padding: 'var(--space-1-5) var(--space-3)',
                          background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)',
                          color: 'var(--color-text-secondary)',
                        }}>
                          <PlayerAvatar name={slot.player.name} imageMap={imageMap} size={20} />
                          {slot.player.name}
                          <span className={`badge badge-${slot.player.tour?.toLowerCase()}`} style={{ fontSize: 'var(--text-2xs)' }}>{slot.player.tour}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
