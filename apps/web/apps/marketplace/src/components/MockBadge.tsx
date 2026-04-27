import React from 'react';

export interface MockBadgeProps {
  show: boolean;
  label?: string;
  className?: string;
}

/**
 * ป้าย Demo / Mock แบบมี animation – แยกข้อมูลจริง vs mock
 */
export function MockBadge({
  show,
  label,
  className = '',
}: MockBadgeProps): React.JSX.Element | null {
  if (!show) return null;

  return (
    <span
      className={
        'mock-badge inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ' +
        'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/50 ' +
        'ring-1 ring-amber-400/30 ring-offset-1 ring-offset-transparent ' +
        className
      }
      title="ข้อมูลนี้เป็น Demo / Mock – ยังไม่ได้เชื่อมกับ Validator จริง"
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
        aria-hidden
      />
      <span className="font-semibold">Demo</span>
      {label && <span className="opacity-80">/ {label}</span>}
    </span>
  );
}

export default MockBadge;
