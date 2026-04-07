import React from 'react';

// Normalize "C. Alcaraz" → "alcaraz c." to match imageMap keys
function normalizeForLookup(name) {
  if (!name) return '';
  const raw = name.toLowerCase().trim();
  // Already in "lastname f." format
  if (/^[a-z].*\s[a-z]\.$/.test(raw)) return raw;
  // Convert "F. Lastname" or "First Lastname" → "lastname f."
  const parts = raw.split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0].replace('.', '');
    const last = parts.slice(1).join(' ');
    return `${last} ${first.charAt(0)}.`;
  }
  return raw;
}

// Shared player avatar component
// imageMap is { "player name lowercase": { url, localFile } }
export default function PlayerAvatar({ name, imageMap, size = 32 }) {
  const directKey = (name || '').toLowerCase().trim();
  const normalizedKey = normalizeForLookup(name);
  const entry = imageMap?.[directKey] || imageMap?.[normalizedKey];

  let src = null;
  if (entry?.localFile) {
    src = `/player-images/${entry.localFile}`;
  } else if (entry?.url) {
    src = entry.url;
  }

  const sizeStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    border: '2px solid var(--color-border)',
    transition: 'border-color var(--duration-normal) var(--ease-default)',
  };

  if (!src) {
    const initials = (name || '?')
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div style={{
        ...sizeStyle,
        background: 'var(--color-surface-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 600,
        color: 'var(--color-text-secondary)',
        fontFamily: 'var(--font-body)',
      }}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      style={{
        ...sizeStyle,
        objectFit: 'cover',
        background: 'var(--color-surface-3)',
      }}
      onError={(e) => {
        e.target.style.display = 'none';
      }}
    />
  );
}
