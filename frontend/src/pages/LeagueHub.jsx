import React from 'react';
import { Medal } from 'lucide-react';
import { TennisBall, TennisRacket, CourtLines, NetDivider, TennisBallPattern } from '../components/TennisGraphics.jsx';

const SWING_COLORS = {
  clay: 'var(--color-court-clay)',
  grass: 'var(--color-court-grass)',
  na_hard: 'var(--color-court-hard)',
  race: 'var(--color-court-indoor)',
};

const CATEGORY_BADGE_CLASS = {
  major: 'badge-major',
  masters1000: 'badge-masters',
  atp500: 'badge-500',
  atp250: 'badge-250',
};

function SkeletonTable() {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton" style={{ width: 24, height: 24, borderRadius: 'var(--radius-sm)' }} />
          <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: 0 }} />
          <div className="skeleton skeleton-text" style={{ width: 60, marginBottom: 0, marginLeft: 'auto' }} />
          <div className="skeleton skeleton-text" style={{ width: 40, marginBottom: 0 }} />
        </div>
      ))}
    </div>
  );
}

export default function LeagueHub({ league, tournamentData }) {
  if (!league) return <div className="page"><SkeletonTable /></div>;

  const managers = [...league.managers].sort((a, b) => b.totalPoints - a.totalPoints);
  const swing = tournamentData?.swing;
  const week = tournamentData?.week;
  const tournaments = tournamentData?.tournaments || [];

  const getMedalColor = (i) => {
    if (i === 0) return 'var(--color-gold)';
    if (i === 1) return 'var(--color-silver)';
    if (i === 2) return 'var(--color-bronze)';
    return null;
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <TennisBall size={28} />
        <h2 style={{ fontFamily: 'var(--font-heading)' }}>League Hub</h2>
      </div>

      {/* Tournament context banner */}
      {swing ? (
        <div className="card" style={{
          marginBottom: 'var(--space-4)',
          padding: 'var(--space-3) var(--space-4)',
          borderLeft: `3px solid ${SWING_COLORS[swing.id] || 'var(--color-primary)'}`,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 'var(--space-2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                Week {league.currentWeek}
              </span>
              <span style={{ color: 'var(--color-border)', fontSize: 'var(--text-xs)' }}>|</span>
              <span style={{
                fontWeight: 600, color: SWING_COLORS[swing.id],
                fontFamily: 'var(--font-heading)',
              }}>
                {swing.name}
              </span>
              {week && (
                <>
                  <span style={{ color: 'var(--color-border)', fontSize: 'var(--text-xs)' }}>|</span>
                  <span className="font-mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    TW{week.week}
                  </span>
                </>
              )}
            </div>
            {tournaments.length > 0 && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {tournaments.map(t => (
                  <span key={t.name} className={`badge ${CATEGORY_BADGE_CLASS[t.category] || 'badge-250'}`}>
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
          Week {league.currentWeek}
        </p>
      )}

      {managers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)', position: 'relative', overflow: 'hidden' }}>
          <TennisBallPattern count={5} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <TennisRacket size={48} color="var(--color-text-tertiary)" style={{ margin: '0 auto var(--space-3)', display: 'block' }} />
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
              No managers yet
            </p>
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
              The league will initialize automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="card tennis-court-bg" style={{ overflowX: 'auto', padding: 0 }}>
          <div className="scoreboard-header">
            <TennisBall size={14} />
            Standings
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Manager</th>
                <th>Total Pts</th>
                <th>Week Pts</th>
                <th className="hide-mobile">Credits</th>
                <th className="hide-mobile">Roster</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((m, i) => {
                const medalColor = getMedalColor(i);
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
                    <td>
                      <span style={{ fontWeight: isUser ? 700 : 400 }}>
                        {m.name}
                      </span>
                      {isUser && (
                        <span style={{
                          color: 'var(--color-primary)', fontSize: 'var(--text-xs)',
                          marginLeft: 'var(--space-1-5)', fontWeight: 600,
                        }}>
                          (You)
                        </span>
                      )}
                      {m.isBot && (
                        <span style={{
                          color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)',
                          marginLeft: 'var(--space-1-5)',
                        }}>
                          BOT
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                        {m.totalPoints}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono">{m.weeklyPoints}</span>
                    </td>
                    <td className="hide-mobile">
                      <span className="font-mono">{m.coins} cr</span>
                    </td>
                    <td className="hide-mobile">
                      <span className="font-mono">{m.roster?.length || 0}/8</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
