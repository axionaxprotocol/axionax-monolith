import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/**
 * Card — the primary surface primitive for Axionax OS pages.
 *
 * Defaults:
 *   - `bg-bg-card` with `glass` shadow and `rounded-os-md`
 *   - `p-os-4` or `p-os-5` padding
 *   - `interactive` opt-in adds hover lift + border brighten
 */
export function Card({
  className,
  children,
  interactive = false,
  padded = true,
}: {
  className?: string;
  children: ReactNode;
  interactive?: boolean;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-bg-card border border-border shadow-glass rounded-os-md",
        padded && "p-os-4",
        interactive &&
          "transition-colors duration-fast hover:border-white/15 hover:bg-bg-elev cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-os-3">
        <div className="min-w-0">
          <div className="text-overline text-zinc-500 uppercase tracking-wider">{label}</div>
          <div className="mt-os-2 text-headline font-mono font-semibold tabular-nums text-zinc-100">
            {value}
          </div>
          {hint && (
            <div className="mt-os-1 text-caption text-zinc-500">{hint}</div>
          )}
        </div>
        {icon && <div className="text-accent-ai shrink-0 opacity-80">{icon}</div>}
      </div>
    </Card>
  );
}
