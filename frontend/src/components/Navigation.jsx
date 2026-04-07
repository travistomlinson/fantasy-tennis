import React from 'react';
import { Trophy, User, ShoppingBag, Radio, Calendar, BarChart3, Settings, AlertTriangle, RefreshCw } from 'lucide-react';
import { TennisBall } from './TennisGraphics.jsx';

const tabs = [
  { id: 'hub', label: 'Hub', icon: Trophy },
  { id: 'team', label: 'Team', icon: User },
  { id: 'market', label: 'Market', icon: ShoppingBag },
  { id: 'matches', label: 'Matches', icon: Radio },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'history', label: 'History', icon: BarChart3 },
];

export default function Navigation({ active, onNavigate, staleWarning }) {
  return (
    <>
      <nav style={{
        background: 'rgba(28, 28, 32, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: 'var(--container-default)', margin: '0 auto', padding: '0 var(--space-4)' }}>
          {/* Top bar: brand + admin */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            padding: 'var(--space-3) 0',
          }}>
            <TennisBall size={24} />
            <span style={{
              fontFamily: 'var(--font-heading)', fontWeight: 700,
              fontSize: 'var(--text-lg)', marginRight: 'auto',
              color: 'var(--color-text)',
            }}>
              Fantasy Tennis
            </span>
            <button
              onClick={() => onNavigate('admin')}
              className="btn-ghost"
              style={{
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-md)',
                minHeight: 44,
                minWidth: 44,
                background: active === 'admin' ? 'var(--color-primary-dim)' : 'transparent',
                color: active === 'admin' ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
              }}
              aria-label="Admin Settings"
            >
              <Settings size={18} />
            </button>
          </div>

          {/* Tab bar */}
          <div style={{
            display: 'flex',
            gap: 'var(--space-1)',
            overflowX: 'auto',
            paddingBottom: 'var(--space-2)',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            maskImage: 'linear-gradient(to right, transparent 0, black 8px, black calc(100% - 16px), transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0, black 8px, black calc(100% - 16px), transparent 100%)',
            paddingRight: 'var(--space-4)',
          }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = active === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  className="btn-ghost"
                  style={{
                    background: isActive ? 'var(--color-primary-dim)' : 'transparent',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-sm)',
                    whiteSpace: 'nowrap',
                    fontWeight: isActive ? 600 : 500,
                    minHeight: 44,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--space-1-5)',
                    border: 'none',
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Stale data banner */}
      {staleWarning && (
        <div className="stale-banner">
          <AlertTriangle size={16} />
          <span>Offline mode -- showing data from {staleWarning}</span>
          <button
            className="btn-compact"
            style={{
              background: 'var(--color-warning)',
              color: 'var(--color-text-inverse)',
              border: 'none',
              marginLeft: 'var(--space-2)',
            }}
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}
    </>
  );
}
