'use client';

import React from 'react';

export interface MockBadgeProps {
  /** When true, shows the animated "Demo / Mock" badge */
  show: boolean;
  /** Optional short label, e.g. "Block data" */
  label?: string;
  /** Inline (badge only) or block (badge + subtle container) */
  variant?: 'inline' | 'block';
  className?: string;
}

/**
 * Animated badge to indicate mock/demo data when APIs are unavailable.
 * Helps users tell real data from fallback data.
 */
export default function MockBadge({
  show,
  label,
  variant = 'inline',
  className = '',
}: MockBadgeProps): React.JSX.Element | null {
  if (!show) return null;

  const badge = (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ' +
        'bg-amber-500/20 text-amber-400 border border-amber-500/50 ' +
        'shadow-[0_0_12px_rgba(245,158,11,0.25)] ' +
        'ring-1 ring-amber-400/30 ring-offset-1 ring-offset-transparent'
      }
      style={{ animation: 'mock-badge-pulse 2s ease-in-out infinite' }}
      title="This is demo/mock data — API or validator not responding"
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"
        aria-hidden
      />
      <span className="font-semibold">Demo</span>
      {label && <span className="opacity-80">/ {label}</span>}
    </span>
  );

  if (variant === 'block') {
    return (
      <div
        className={
          'rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 flex items-center justify-center gap-2 ' +
          className
        }
        style={{ animation: 'mock-badge-shimmer 3s ease-in-out infinite' }}
      >
        {badge}
      </div>
    );
  }

  return <span className={className}>{badge}</span>;
}
