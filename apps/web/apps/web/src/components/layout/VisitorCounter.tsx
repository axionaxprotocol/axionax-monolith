'use client';

import React, { useEffect, useState } from 'react';

const SESSION_KEY = 'axionax_visit_recorded_v1';

function formatCount(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

/**
 * Records one hit per browser tab session (POST), then shows cumulative total.
 * Renders at the bottom of ExplorerLayout.
 */
export default function VisitorCounter(): React.JSX.Element {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const already =
          typeof window !== 'undefined' &&
          sessionStorage.getItem(SESSION_KEY) === '1';

        if (!already) {
          const post = await fetch('/api/visitors', { method: 'POST' });
          if (!post.ok) throw new Error('post failed');
          const data = (await post.json()) as { count?: number };
          if (!cancelled && typeof data.count === 'number') {
            setCount(data.count);
            sessionStorage.setItem(SESSION_KEY, '1');
            return;
          }
        }

        const get = await fetch('/api/visitors', { method: 'GET' });
        if (!get.ok) throw new Error('get failed');
        const data = (await get.json()) as { count?: number };
        if (!cancelled && typeof data.count === 'number') {
          setCount(data.count);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="border-t border-amber-500/15 bg-[#05050a]/90 backdrop-blur-sm py-3 px-4 sm:px-6 lg:px-8"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 text-center">
        <span className="text-xs uppercase tracking-widest text-amber-500/50 font-medium">
          Site visits
        </span>
        <span className="hidden sm:inline text-starlight/30">·</span>
        <span className="text-sm text-starlight/70">
          <span className="text-starlight/50">ผู้เข้าชมสะสม</span>
          {': '}
          {error ? (
            <span className="text-starlight/40 tabular-nums">—</span>
          ) : count === null ? (
            <span className="inline-block w-16 h-4 rounded bg-starlight/10 animate-pulse align-middle" />
          ) : (
            <span className="font-mono tabular-nums text-amber-400/90 font-semibold">
              {formatCount(count)}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
