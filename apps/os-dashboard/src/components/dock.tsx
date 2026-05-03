"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Boxes,
  Briefcase,
  Home,
  Search,
  Server,
  Settings,
  Terminal,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Dock — primary app switcher, bottom-center.
 *
 * Design intent:
 *   - Icons live on a single horizontal strip at the bottom edge.
 *   - Hover is a subtle lift + scale (no mouse-tracked magnification).
 *     Magnification is distracting on a productivity OS; professional shells
 *     (macOS Sonoma default, GNOME, Windows 11) all keep dock motion small.
 *   - Active app is marked by a thin underline indicator — never by a colored
 *     ring that competes with the icon's own gradient.
 */

type DockApp = {
  href: string;
  label: string;
  Icon: LucideIcon;
  color: string;
};

const DOCK_APPS: readonly DockApp[] = [
  { href: "/", label: "Home", Icon: Home, color: "from-violet-400 to-indigo-500" },
  { href: "/nodes", label: "Nodes", Icon: Server, color: "from-emerald-400 to-green-500" },
  { href: "/jobs", label: "Jobs", Icon: Briefcase, color: "from-amber-400 to-yellow-500" },
  { href: "/apps", label: "Apps", Icon: Boxes, color: "from-rose-400 to-red-500" },
  { href: "/wallet", label: "Wallet", Icon: Wallet, color: "from-amber-400 to-orange-500" },
  { href: "/activity", label: "Activity", Icon: Activity, color: "from-cyan-400 to-blue-500" },
  { href: "/logs", label: "Logs", Icon: Terminal, color: "from-lime-400 to-emerald-600" },
  { href: "/settings", label: "Settings", Icon: Settings, color: "from-zinc-400 to-zinc-600" },
];

export function Dock() {
  const pathname = usePathname();

  return (
    <div
      className="fixed bottom-5 inset-x-0 z-30 flex justify-center pointer-events-none"
      aria-label="Application dock"
    >
      <div className="pointer-events-auto glass-strong flex items-end gap-1 rounded-os-2xl px-os-3 py-os-2 shadow-glass-xl">
        <DockButton label="Search" tooltip="Spotlight">
          <Search size={18} />
        </DockButton>

        <span
          className="mx-1.5 h-9 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent self-center"
          aria-hidden="true"
        />

        {DOCK_APPS.map((app) => {
          const active = app.href === "/" ? pathname === "/" : pathname?.startsWith(app.href);
          return <DockAppIcon key={app.href} app={app} active={!!active} />;
        })}
      </div>
    </div>
  );
}

function DockAppIcon({ app, active }: { app: DockApp; active: boolean }) {
  const { href, label, Icon, color } = app;
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="group relative flex flex-col items-center focus:outline-none"
    >
      <div
        className={cn(
          "grid h-11 w-11 place-items-center rounded-os-lg bg-gradient-to-br text-white shadow-icon-app",
          "transition-transform duration-base ease-os",
          "group-hover:-translate-y-1 group-hover:scale-105",
          "group-focus-visible:-translate-y-1 group-focus-visible:scale-105",
          color,
        )}
      >
        <Icon size={19} strokeWidth={2} />
      </div>

      {/* Tooltip */}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[10px] font-medium text-zinc-100 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-fast">
        {label}
      </span>

      {/* Active indicator */}
      <span
        className={cn(
          "mt-1 h-0.5 rounded-full transition-all duration-base",
          active ? "w-4 bg-white/80" : "w-0 bg-transparent",
        )}
        aria-hidden="true"
      />
    </Link>
  );
}

function DockButton({
  children,
  label,
  tooltip,
}: {
  children: React.ReactNode;
  label: string;
  tooltip?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={tooltip ?? label}
      className="group relative flex flex-col items-center focus:outline-none"
    >
      <div className="grid h-11 w-11 place-items-center rounded-os-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-all duration-fast ease-os group-hover:-translate-y-1 group-hover:scale-105 group-focus-visible:-translate-y-1">
        {children}
      </div>
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[10px] font-medium text-zinc-100 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-fast">
        {tooltip ?? label}
      </span>
      <span className="mt-1 h-0.5 w-0" aria-hidden="true" />
    </button>
  );
}
