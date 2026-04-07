import React, { useState } from 'react';
import { Trophy, User, ShoppingBag, Radio, Calendar, BarChart3, Settings, AlertTriangle, RefreshCw, MoreHorizontal, X } from 'lucide-react';
import { TennisBall } from './TennisGraphics.jsx';

// Primary tabs shown in bottom bar on mobile (max 5)
const primaryTabs = [
  { id: 'hub', label: 'Hub', icon: Trophy },
  { id: 'team', label: 'Team', icon: User },
  { id: 'market', label: 'Market', icon: ShoppingBag },
  { id: 'matches', label: 'Matches', icon: Radio },
];

// Secondary tabs shown in "More" menu on mobile, inline on desktop
const secondaryTabs = [
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'history', label: 'History', icon: BarChart3 },
  { id: 'admin', label: 'Admin', icon: Settings },
];

const allTabs = [...primaryTabs, ...secondaryTabs];

export default function Navigation({ active, onNavigate, staleWarning }) {
  const [moreOpen, setMoreOpen] = useState(false);

  const handleNavigate = (id) => {
    onNavigate(id);
    setMoreOpen(false);
  };

  const isSecondaryActive = secondaryTabs.some(t => t.id === active);

  return (
    <>
      {/* === Desktop top nav (hidden on mobile) === */}
      <nav className="nav-desktop">
        <div style={{ maxWidth: 'var(--container-default)', margin: '0 auto', padding: '0 var(--space-4)' }}>
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

            {/* All tabs inline on desktop */}
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              {allTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = active === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleNavigate(tab.id)}
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
        </div>
      </nav>

      {/* === Mobile top bar (brand only, hidden on desktop) === */}
      <div className="nav-mobile-header">
        <TennisBall size={22} />
        <span style={{
          fontFamily: 'var(--font-heading)', fontWeight: 700,
          fontSize: 'var(--text-base)',
          color: 'var(--color-text)',
        }}>
          Fantasy Tennis
        </span>
      </div>

      {/* Stale data banner */}
      {staleWarning && (
        <div className="stale-banner">
          <AlertTriangle size={16} />
          <span>Offline -- data from {staleWarning}</span>
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

      {/* === Mobile bottom tab bar (hidden on desktop) === */}
      <div className="nav-mobile-bottom">
        {primaryTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleNavigate(tab.id)}
              className="nav-mobile-tab"
              data-active={isActive || undefined}
            >
              <Icon size={20} />
              <span className="nav-mobile-label">{tab.label}</span>
            </button>
          );
        })}
        {/* More button */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className="nav-mobile-tab"
          data-active={isSecondaryActive || moreOpen || undefined}
        >
          {moreOpen ? <X size={20} /> : <MoreHorizontal size={20} />}
          <span className="nav-mobile-label">More</span>
        </button>
      </div>

      {/* === More menu overlay (mobile) === */}
      {moreOpen && (
        <>
          <div className="nav-more-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="nav-more-menu">
            {secondaryTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = active === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleNavigate(tab.id)}
                  className="nav-more-item"
                  data-active={isActive || undefined}
                >
                  <Icon size={20} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
