import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import * as api from '../api.js';

const CATEGORY_BADGE_CLASS = {
  major: 'badge-major',
  masters1000: 'badge-masters',
  atp500: 'badge-500',
  atp250: 'badge-250',
};

const CATEGORY_LABELS = {
  major: 'Grand Slam',
  masters1000: 'Masters 1000',
  atp500: 'ATP 500',
  atp250: 'ATP 250',
};

const SWING_COLORS = {
  clay: 'var(--color-court-clay)',
  grass: 'var(--color-court-grass)',
  na_hard: 'var(--color-court-hard)',
  race: 'var(--color-court-indoor)',
};

export default function TournamentCalendar() {
  const [calendar, setCalendar] = useState(null);
  const [currentInfo, setCurrentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsedSwings, setCollapsedSwings] = useState({});
  const currentWeekRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.getTournamentCalendar(),
      api.getCurrentTournament(),
    ]).then(([cal, cur]) => {
      setCalendar(cal);
      setCurrentInfo(cur);
      setLoading(false);

      // Auto-collapse past swings
      if (cal && cur?.week) {
        const pastSwings = {};
        for (const swing of cal.swings) {
          const swingWeeks = cal.weeks.filter(w => w.swing === swing.id);
          const allPast = swingWeeks.every(w => w.week < cur.week.week);
          if (allPast) pastSwings[swing.id] = true;
        }
        setCollapsedSwings(pastSwings);
      }
    }).catch(() => setLoading(false));
  }, []);

  const scrollToCurrentWeek = () => {
    if (currentWeekRef.current) {
      // Expand any collapsed swing containing current week
      if (currentInfo?.swing) {
        setCollapsedSwings(prev => ({ ...prev, [currentInfo.swing.id]: false }));
      }
      setTimeout(() => {
        currentWeekRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const toggleSwing = (swingId) => {
    setCollapsedSwings(prev => ({ ...prev, [swingId]: !prev[swingId] }));
  };

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-tertiary)' }}>
          <Loader2 size={18} className="spinner" />
          Loading calendar...
        </div>
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
            Failed to load calendar.
          </p>
          <button className="btn-secondary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { swings, weeks } = calendar;
  const currentWeekNum = currentInfo?.week?.week;

  return (
    <div className="page">
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)',
      }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>Tournament Calendar</h2>
        {currentWeekNum && (
          <button className="btn-secondary btn-compact" onClick={scrollToCurrentWeek}>
            <MapPin size={14} />
            Jump to current week
          </button>
        )}
      </div>

      {/* Current status */}
      {currentInfo?.swing && (
        <div className="card" style={{
          marginBottom: 'var(--space-6)',
          borderLeft: `3px solid ${SWING_COLORS[currentInfo.swing.id] || 'var(--color-primary)'}`,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 'var(--space-2)',
          }}>
            <div>
              <div style={{
                fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Current Swing
              </div>
              <div style={{
                fontSize: 'var(--text-xl)', fontWeight: 700,
                color: SWING_COLORS[currentInfo.swing.id],
                fontFamily: 'var(--font-heading)',
              }}>
                {currentInfo.swing.name}
              </div>
            </div>
            {currentInfo.week && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                  Tournament Week <span className="font-mono">{currentInfo.week.week}</span>
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                  {formatDateRange(currentInfo.week.startDate, currentInfo.week.endDate)}
                </div>
              </div>
            )}
          </div>
          {currentInfo.tournaments?.length > 0 && (
            <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {currentInfo.tournaments.map(t => (
                <div key={t.name} style={{
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'var(--color-surface-2)',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: `3px solid ${getCategoryColor(t.category)}`,
                }}>
                  <div style={{
                    fontWeight: 600, fontSize: 'var(--text-sm)',
                    fontFamily: 'var(--font-heading)',
                  }}>{t.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                    {t.city} -- <span style={{ color: getCategoryColor(t.category) }}>{CATEGORY_LABELS[t.category]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category legend */}
      <div style={{
        display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)',
        flexWrap: 'wrap',
      }}>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-1-5)',
            fontSize: 'var(--text-xs)',
          }}>
            <span style={{
              width: 10, height: 10, borderRadius: 2,
              background: getCategoryColor(key), display: 'inline-block',
            }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Swings */}
      {swings.map(swing => {
        const swingWeeks = weeks.filter(w => w.swing === swing.id);
        const swingColor = SWING_COLORS[swing.id] || 'var(--color-primary)';
        const isCollapsed = collapsedSwings[swing.id];
        const isPast = swingWeeks.every(w => currentWeekNum && w.week < currentWeekNum);

        return (
          <div key={swing.id} style={{
            marginBottom: 'var(--space-6)',
            opacity: isPast ? 0.7 : 1,
          }}>
            <div
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 'var(--space-2)', paddingBottom: 'var(--space-1-5)',
                borderBottom: `2px solid ${swingColor}`,
                cursor: 'pointer',
                minHeight: 44,
              }}
              onClick={() => toggleSwing(swing.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <h3 style={{
                  margin: 0, color: swingColor,
                  fontSize: 'var(--text-base)', fontFamily: 'var(--font-heading)',
                  fontWeight: 600,
                }}>
                  {swing.name}
                </h3>
                {isPast && (
                  <span className="badge" style={{
                    background: 'var(--color-surface-3)', color: 'var(--color-text-tertiary)',
                    fontSize: 'var(--text-2xs)',
                  }}>
                    PAST
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                  {formatDateRange(swing.startDate, swing.endDate)}
                </span>
                <span style={{ color: 'var(--color-text-tertiary)' }}>
                  {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </span>
              </div>
            </div>

            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1-5)' }}>
                {swingWeeks.map(week => {
                  const isCurrent = week.week === currentWeekNum;
                  return (
                    <div
                      key={week.week}
                      ref={isCurrent ? currentWeekRef : undefined}
                      className="card"
                      style={{
                        padding: 'var(--space-2) var(--space-3)',
                        background: isCurrent ? 'var(--color-primary-dim)' : 'var(--color-surface-1)',
                        border: isCurrent ? '1px solid var(--color-primary-muted)' : '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                          <span className="font-mono" style={{
                            fontSize: 'var(--text-2xs)', fontWeight: 700,
                            background: isCurrent ? 'var(--color-primary)' : 'var(--color-surface-3)',
                            color: isCurrent ? 'var(--color-text-inverse)' : 'var(--color-text-tertiary)',
                            padding: '2px var(--space-2)', borderRadius: 'var(--radius-sm)',
                            minWidth: 28, textAlign: 'center',
                          }}>
                            W{week.week}
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1-5)' }}>
                            {week.tournaments.map(tName => {
                              const t = swing.tournaments.find(st => st.name === tName);
                              const cat = t?.category || 'atp250';
                              return (
                                <span key={tName} className={`badge ${CATEGORY_BADGE_CLASS[cat] || 'badge-250'}`}>
                                  {tName}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <span className="font-mono" style={{
                          fontSize: 'var(--text-2xs)', color: 'var(--color-text-tertiary)',
                          whiteSpace: 'nowrap', marginLeft: 'var(--space-2)',
                        }}>
                          {formatDateShort(week.startDate)} - {formatDateShort(week.endDate)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getCategoryColor(cat) {
  const map = {
    major: 'var(--color-cat-major)',
    masters1000: 'var(--color-cat-masters)',
    atp500: 'var(--color-cat-500)',
    atp250: 'var(--color-cat-250)',
  };
  return map[cat] || 'var(--color-cat-250)';
}

function formatDateRange(start, end) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} - ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
