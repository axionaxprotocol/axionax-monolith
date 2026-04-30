import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-bg-card p-5 shadow-sm",
        className
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
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold">{value}</div>
          {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
        </div>
        {icon && <div className="text-accent">{icon}</div>}
      </div>
    </Card>
  );
}
