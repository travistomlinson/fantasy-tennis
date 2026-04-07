import React from 'react';

/**
 * SVG tennis ball with realistic seam curve.
 * Use as decorative accent, empty states, or background element.
 */
export function TennisBall({ size = 40, opacity = 1, className = '', style = {} }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 40 40"
      className={className}
      style={{ opacity, ...style }}
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="19" fill="var(--color-primary)" />
      <circle cx="20" cy="20" r="19" fill="url(#ball-gradient)" />
      {/* Tennis ball seam */}
      <path
        d="M8 8 C12 16, 12 24, 8 32"
        stroke="var(--color-primary-dim)" strokeWidth="1.8" fill="none" strokeLinecap="round"
        style={{ filter: 'brightness(2)' }}
      />
      <path
        d="M32 8 C28 16, 28 24, 32 32"
        stroke="var(--color-primary-dim)" strokeWidth="1.8" fill="none" strokeLinecap="round"
        style={{ filter: 'brightness(2)' }}
      />
      <defs>
        <radialGradient id="ball-gradient" cx="35%" cy="35%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/**
 * Tennis racket icon (simplified).
 */
export function TennisRacket({ size = 40, color = 'var(--color-text-tertiary)', style = {} }) {
  const scale = size / 40;
  return (
    <svg
      width={size} height={size} viewBox="0 0 40 40"
      style={style}
      aria-hidden="true"
    >
      <g transform={`scale(${scale})`} style={{ transformOrigin: 'center' }}>
        {/* Racket head (oval) */}
        <ellipse cx="20" cy="14" rx="10" ry="12"
          stroke={color} strokeWidth="2" fill="none" />
        {/* Strings - horizontal */}
        <line x1="12" y1="10" x2="28" y2="10" stroke={color} strokeWidth="0.5" opacity="0.5" />
        <line x1="11" y1="14" x2="29" y2="14" stroke={color} strokeWidth="0.5" opacity="0.5" />
        <line x1="12" y1="18" x2="28" y2="18" stroke={color} strokeWidth="0.5" opacity="0.5" />
        {/* Strings - vertical */}
        <line x1="17" y1="3" x2="17" y2="25" stroke={color} strokeWidth="0.5" opacity="0.5" />
        <line x1="20" y1="2" x2="20" y2="26" stroke={color} strokeWidth="0.5" opacity="0.5" />
        <line x1="23" y1="3" x2="23" y2="25" stroke={color} strokeWidth="0.5" opacity="0.5" />
        {/* Handle */}
        <line x1="20" y1="26" x2="20" y2="38"
          stroke={color} strokeWidth="3" strokeLinecap="round" />
        {/* Grip */}
        <line x1="20" y1="31" x2="20" y2="38"
          stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      </g>
    </svg>
  );
}

/**
 * Tennis court lines background pattern — used as subtle card/page decoration.
 */
export function CourtLines({ surface = 'hard', style = {} }) {
  const surfaceColors = {
    hard: 'var(--color-court-hard)',
    clay: 'var(--color-court-clay)',
    grass: 'var(--color-court-grass)',
  };
  const color = surfaceColors[surface] || surfaceColors.hard;
  return (
    <svg
      width="100%" height="100%" viewBox="0 0 200 100"
      preserveAspectRatio="none"
      style={{ position: 'absolute', top: 0, left: 0, opacity: 0.04, pointerEvents: 'none', ...style }}
      aria-hidden="true"
    >
      {/* Baseline */}
      <line x1="10" y1="10" x2="190" y2="10" stroke={color} strokeWidth="1.5" />
      <line x1="10" y1="90" x2="190" y2="90" stroke={color} strokeWidth="1.5" />
      {/* Sidelines */}
      <line x1="10" y1="10" x2="10" y2="90" stroke={color} strokeWidth="1.5" />
      <line x1="190" y1="10" x2="190" y2="90" stroke={color} strokeWidth="1.5" />
      {/* Service line */}
      <line x1="10" y1="35" x2="190" y2="35" stroke={color} strokeWidth="0.8" />
      <line x1="10" y1="65" x2="190" y2="65" stroke={color} strokeWidth="0.8" />
      {/* Center service line */}
      <line x1="100" y1="35" x2="100" y2="65" stroke={color} strokeWidth="0.8" />
      {/* Net */}
      <line x1="0" y1="50" x2="200" y2="50" stroke={color} strokeWidth="1" strokeDasharray="3,2" />
      {/* Center mark */}
      <line x1="100" y1="8" x2="100" y2="12" stroke={color} strokeWidth="0.8" />
      <line x1="100" y1="88" x2="100" y2="92" stroke={color} strokeWidth="0.8" />
    </svg>
  );
}

/**
 * Tennis net pattern — decorative horizontal divider.
 */
export function NetDivider({ color = 'var(--color-border)', style = {} }) {
  return (
    <svg
      width="100%" height="8" viewBox="0 0 200 8"
      preserveAspectRatio="none"
      style={{ display: 'block', ...style }}
      aria-hidden="true"
    >
      {/* Net mesh - horizontal */}
      <line x1="0" y1="2" x2="200" y2="2" stroke={color} strokeWidth="0.5" />
      <line x1="0" y1="4" x2="200" y2="4" stroke={color} strokeWidth="0.8" />
      <line x1="0" y1="6" x2="200" y2="6" stroke={color} strokeWidth="0.5" />
      {/* Net mesh - vertical posts */}
      {Array.from({ length: 40 }, (_, i) => (
        <line key={i} x1={i * 5} y1="0" x2={i * 5} y2="8"
          stroke={color} strokeWidth="0.3" />
      ))}
    </svg>
  );
}

/**
 * Scoreboard frame — wraps content with a retro tennis scoreboard look.
 */
export function ScoreboardFrame({ children, title, style = {} }) {
  return (
    <div style={{
      background: 'var(--color-surface-1)',
      border: '2px solid var(--color-border-strong)',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      ...style,
    }}>
      {title && (
        <div style={{
          background: 'linear-gradient(135deg, var(--color-surface-3), var(--color-surface-2))',
          padding: 'var(--space-2) var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}>
          <TennisBall size={16} />
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {title}
          </span>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

/**
 * Decorative tennis ball pattern for empty states and backgrounds.
 * Shows faded, scattered tennis balls.
 */
export function TennisBallPattern({ count = 5, style = {} }) {
  const positions = [
    { x: '10%', y: '20%', size: 20, rot: 15 },
    { x: '80%', y: '15%', size: 14, rot: -30 },
    { x: '60%', y: '70%', size: 18, rot: 45 },
    { x: '25%', y: '75%', size: 12, rot: -15 },
    { x: '90%', y: '55%', size: 16, rot: 60 },
  ];
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      pointerEvents: 'none', ...style,
    }} aria-hidden="true">
      {positions.slice(0, count).map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: p.x, top: p.y,
          transform: `rotate(${p.rot}deg)`,
          opacity: 0.06,
        }}>
          <TennisBall size={p.size} />
        </div>
      ))}
    </div>
  );
}

/**
 * Surface indicator badge with tennis court texture
 */
export function CourtSurfaceBadge({ surface, style = {} }) {
  const config = {
    clay: { color: 'var(--color-court-clay)', bg: 'var(--color-tertiary-dim)', label: 'Clay' },
    grass: { color: 'var(--color-court-grass)', bg: '#0d2e14', label: 'Grass' },
    hard: { color: 'var(--color-court-hard)', bg: 'var(--color-secondary-dim)', label: 'Hard' },
    indoor: { color: 'var(--color-court-indoor)', bg: 'var(--color-cat-masters-dim)', label: 'Indoor' },
  };
  const c = config[surface] || config.hard;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px',
      borderRadius: 'var(--radius-sm)',
      background: c.bg,
      color: c.color,
      fontSize: 'var(--text-2xs)',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      ...style,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: c.color,
        flexShrink: 0,
      }} />
      {c.label}
    </span>
  );
}
