import React, { useState } from 'react';
import { Trash2, ArrowRightLeft, ShoppingBag } from 'lucide-react';
import * as api from '../api.js';
import PlayerAvatar from '../components/PlayerAvatar.jsx';
import { TennisBall, TennisRacket, TennisBallPattern } from '../components/TennisGraphics.jsx';

function SlotIndicator({ filled, total, color }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
      {[...Array(total)].map((_, i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: i < filled ? color : 'var(--color-surface-3)',
          border: `1px solid ${i < filled ? color : 'var(--color-border)'}`,
        }} />
      ))}
    </div>
  );
}

function SellConfirmModal({ player, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Sell {player.name}?</div>
        <div className="modal-body">
          You will receive <span className="font-mono" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{player.currentPrice} cr</span>. This cannot be undone.
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Sell</button>
        </div>
      </div>
    </div>
  );
}

export default function MyTeam({ league, onRefresh, imageMap, addToast }) {
  const manager = league?.managers?.find(m => m.id === 'user');
  const [sellTarget, setSellTarget] = useState(null);

  if (!manager) {
    return (
      <div className="page">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card" style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <div className="skeleton skeleton-avatar" />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text-lg" style={{ width: '60%' }} />
                <div className="skeleton skeleton-text" style={{ width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const active = manager.roster.filter(r => !r.benched);
  const benched = manager.roster.filter(r => r.benched);

  const handleSell = async (playerId) => {
    const player = manager.roster.find(r => r.player.id === playerId)?.player;
    try {
      await api.sellPlayer('user', playerId);
      onRefresh();
      addToast?.(`Sold ${player?.name || 'player'} for ${player?.currentPrice || '?'} cr`, 'success');
    } catch (err) {
      addToast?.(err.message, 'error');
    }
    setSellTarget(null);
  };

  const handleToggle = async (playerId) => {
    const slot = manager.roster.find(r => r.player.id === playerId);
    try {
      await api.toggleBench('user', playerId);
      onRefresh();
      addToast?.(`${slot?.player?.name} ${slot?.benched ? 'activated' : 'moved to bench'}`, 'success');
    } catch (err) {
      addToast?.(err.message, 'error');
    }
  };

  const weekResults = league.weeklyResults?.[league.currentWeek]?.user;

  return (
    <div className="page">
      {/* Header stats */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)',
      }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>{manager.name}</h2>
        <div style={{
          display: 'flex', gap: 'var(--space-3)', fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)', flexWrap: 'wrap',
        }}>
          <span><span className="font-mono" style={{ fontWeight: 600, color: 'var(--color-text)' }}>{manager.coins}</span> cr</span>
          <span><span className="font-mono" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{manager.totalPoints}</span> pts</span>
          <span>Week: <span className="font-mono" style={{ fontWeight: 600 }}>{manager.weeklyPoints}</span></span>
        </div>
      </div>

      {/* Active Players */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        marginBottom: 'var(--space-3)',
      }}>
        <h3 style={{
          fontSize: 'var(--text-base)', color: 'var(--color-primary)',
          fontFamily: 'var(--font-heading)', fontWeight: 600,
        }}>
          Active ({active.length}/6)
        </h3>
        <SlotIndicator filled={active.length} total={6} color="var(--color-primary)" />
      </div>
      <div className="grid-2" style={{ marginBottom: 'var(--space-6)' }}>
        {active.map(slot => (
          <PlayerCard
            key={slot.player.id}
            slot={slot}
            weekScore={weekResults?.playerScores?.find(ps => ps.playerId === slot.player.id)}
            onSell={() => setSellTarget(slot.player)}
            onToggle={() => handleToggle(slot.player.id)}
            imageMap={imageMap}
          />
        ))}
        {active.length === 0 && (
          <div className="card" style={{
            gridColumn: '1/-1', textAlign: 'center',
            padding: 'var(--space-8)', border: '2px dashed var(--color-border)',
            background: 'transparent', position: 'relative', overflow: 'hidden',
          }}>
            <TennisBallPattern count={4} />
            <TennisRacket size={48} color="var(--color-text-tertiary)" style={{ margin: '0 auto var(--space-3)', display: 'block', position: 'relative' }} />
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)', position: 'relative' }}>
              Your roster is empty
            </p>
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', position: 'relative' }}>
              Visit the Market to buy players
            </p>
          </div>
        )}
      </div>

      {/* Bench */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        marginBottom: 'var(--space-3)',
      }}>
        <h3 style={{
          fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-heading)', fontWeight: 600,
        }}>
          Bench ({benched.length}/2)
        </h3>
        <SlotIndicator filled={benched.length} total={2} color="var(--color-text-tertiary)" />
      </div>
      <div className="grid-2">
        {benched.map(slot => (
          <PlayerCard
            key={slot.player.id}
            slot={slot}
            onSell={() => setSellTarget(slot.player)}
            onToggle={() => handleToggle(slot.player.id)}
            imageMap={imageMap}
          />
        ))}
        {benched.length === 0 && (
          <div style={{
            gridColumn: '1/-1', padding: 'var(--space-4)',
            border: '1px dashed var(--color-border-subtle)',
            borderRadius: 'var(--radius-xl)', textAlign: 'center',
            color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)',
          }}>
            Bench slot available
          </div>
        )}
      </div>

      {/* Sell confirmation modal */}
      {sellTarget && (
        <SellConfirmModal
          player={sellTarget}
          onConfirm={() => handleSell(sellTarget.id)}
          onCancel={() => setSellTarget(null)}
        />
      )}
    </div>
  );
}

function PlayerCard({ slot, weekScore, onSell, onToggle, imageMap }) {
  const { player, benched } = slot;
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', minWidth: 0 }}>
          <PlayerAvatar name={player.name} imageMap={imageMap} size={40} />
          <div>
            <div style={{
              fontWeight: 600, fontSize: 'var(--text-base)',
              fontFamily: 'var(--font-heading)',
            }}>{player.name}</div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
              <span className={`badge badge-${player.tour?.toLowerCase()}`}>{player.tour}</span>
              <span className={`badge ${benched ? 'badge-bench' : 'badge-active'}`}>
                {benched ? 'Bench' : 'Active'}
              </span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
            Rank <span className="font-mono">#{player.rank}</span>
          </div>
          <div className="font-mono" style={{ fontWeight: 600 }}>{player.currentPrice} cr</div>
        </div>
      </div>

      {/* Weekly scoring breakdown */}
      {weekScore && weekScore.matches.length > 0 && (
        <div style={{
          borderTop: '1px solid var(--color-border-subtle)',
          paddingTop: 'var(--space-3)',
        }}>
          <div style={{
            fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-1)',
          }}>
            This week: <span className="font-mono" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{weekScore.weeklyPoints} pts</span>
          </div>
          {weekScore.matches.map((m, i) => (
            <div key={i} style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-0-5)' }}>
              {m.event === 'tournament_round' ? (
                <div style={{ color: 'var(--color-primary)' }}>
                  {m.tournamentName || 'Tournament'} ({m.furthestRound}): <span className="font-mono" style={{ fontWeight: 600 }}>+{m.total}pts</span>
                </div>
              ) : (
                <div style={{ color: 'var(--color-text-tertiary)' }}>
                  vs {m.opponent}: {m.breakdown.map(b =>
                    `${b.points > 0 ? '+' : ''}${b.points} ${b.event}`
                  ).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'auto' }}>
        <button className="btn-secondary" onClick={onToggle} style={{ flex: 1 }}>
          <ArrowRightLeft size={14} />
          {benched ? 'Activate' : 'Bench'}
        </button>
        <button
          className="btn-ghost"
          onClick={onSell}
          style={{
            color: 'var(--color-error)',
            padding: 'var(--space-2)',
            minHeight: 44,
            minWidth: 44,
          }}
          aria-label={`Sell ${player.name}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
