import React from 'react';

const CFG = {
  xs: { badge: 22, fontSize: '0.88rem', gap: 6 },
  sm: { badge: 28, fontSize: '1.05rem', gap: 8 },
  md: { badge: 36, fontSize: '1.35rem', gap: 10 },
  lg: { badge: 48, fontSize: '1.85rem', gap: 14 },
};

function Mark({ size }) {
  return (
    <div style={{
      width: size, height: size, minWidth: size,
      borderRadius: Math.round(size * 0.27),
      background: 'linear-gradient(140deg, #6366f1 0%, #8b5cf6 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg viewBox="0 0 48 48" fill="none" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <rect x="9"  y="18" width="30" height="5"  rx="2.5" fill="white"/>
        <rect x="21" y="18" width="6"  height="21" rx="2.5" fill="white"/>
        <circle cx="38" cy="11" r="6" fill="#fbbf24"/>
      </svg>
    </div>
  );
}

/**
 * Logo TeamOff (icône + wordmark)
 * @param {'xs'|'sm'|'md'|'lg'} size
 * @param {'light'|'dark'|'color'} variant  - couleur du fond porteur
 * @param {boolean} markOnly  - affiche uniquement l'icône
 */
export default function TeamOffLogo({ size = 'md', variant = 'light', markOnly = false, className = '', style = {} }) {
  const cfg = CFG[size] ?? CFG.md;

  const teamColor = (variant === 'dark' || variant === 'color')
    ? 'rgba(255,255,255,0.88)'
    : 'var(--dk-text, #0f172a)';

  const offColor = variant === 'dark'  ? '#a5b4fc'
    : variant === 'color' ? '#ffffff'
    : '#6366f1';

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: cfg.gap, userSelect: 'none', whiteSpace: 'nowrap', ...style }}
    >
      <Mark size={cfg.badge} />
      {!markOnly && (
        <span style={{ display: 'flex', alignItems: 'baseline', fontSize: cfg.fontSize, letterSpacing: '-0.045em', lineHeight: 1 }}>
          <span style={{ fontWeight: 200, color: teamColor }}>team</span>
          <span style={{ fontWeight: 900, color: offColor }}>Off</span>
        </span>
      )}
    </div>
  );
}
