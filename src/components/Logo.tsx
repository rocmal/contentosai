import React from 'react';

let sparkGradientId = 0;

/** The "Spark" mark (design option 8a): a radial-gradient circle containing
 * a single original 8-point abstract spark - 4 white rounded bars at
 * 0/45/90/135deg through the center. Used in the nav, footer, and favicon. */
export const Logo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className }) => {
  const gradId = React.useMemo(() => `sparkGrad${++sparkGradientId}`, []);
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" className={className} style={{ flexShrink: 0 }}>
      <defs>
        <radialGradient id={gradId} cx="35%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </radialGradient>
      </defs>
      <circle cx="36" cy="36" r="32" fill={`url(#${gradId})`} />
      <rect x="33" y="14" width="6" height="44" rx="3" fill="#fff" />
      <rect x="33" y="14" width="6" height="44" rx="3" fill="#fff" transform="rotate(45 36 36)" />
      <rect x="33" y="14" width="6" height="44" rx="3" fill="#fff" transform="rotate(90 36 36)" />
      <rect x="33" y="14" width="6" height="44" rx="3" fill="#fff" transform="rotate(135 36 36)" />
    </svg>
  );
};

/** Wordmark used next to the Logo mark in the nav/footer. */
export const Wordmark: React.FC<{ className?: string }> = ({ className }) => (
  <span className={className}>
    Lumora<span className="text-blue-400">OS</span>
  </span>
);
