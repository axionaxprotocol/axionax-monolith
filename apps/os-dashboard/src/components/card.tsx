import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/**
 * Card — the primary surface primitive for Axionax OS pages.
 *
 * Defaults:
 *   - `glass` background with the unified radius token
 *   - `p-os-5` padding (matches spacing scale)
 *   - No border by default — `glass` already paints a hairline
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
        "glass rounded-os-xl",
        padded && "p-os-5",
        interactive &&
          "transition-colors duration-base hover:border-white/15 hover:bg-white/[0.04]",
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
          <div className="text-overline text-zinc-500">{label}</div>
          <div className="mt-os-2 text-headline font-semibold tabular-nums text-zinc-100">
            {value}
          </div>
          {hint && (
            <div className="mt-os-1 text-caption text-zinc-500">{hint}</div>
          )}
        </div>
        {icon && <div className="text-accent-ai shrink-0">{icon}</div>}
      </div>
    </Card>
  );
}
