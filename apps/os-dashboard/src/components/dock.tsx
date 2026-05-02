"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Server,
  Briefcase,
  Boxes,
  Wallet,
  Activity,
  Settings,
  Search,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/cn";

const DOCK_APPS = [
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
    <div className="fixed bottom-4 inset-x-0 z-30 flex justify-center pointer-events-none">
      <div className="pointer-events-auto glass-strong flex items-end gap-2 rounded-2xl px-3 py-2 shadow-2xl">
        <button
          className="grid h-12 w-12 place-items-center rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 transition"
          title="Search"
          aria-label="Search"
        >
          <Search size={18} />
        </button>
        <span className="mx-1 h-10 w-px bg-white/10 self-center" />
        {DOCK_APPS.map(({ href, label, Icon, color }) => {
          const active =
            href === "/" ? pathname === "/" : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "group relative grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br text-white app-icon-shadow transition hover:-translate-y-1",
                color,
                active && "ring-2 ring-white/40"
              )}
            >
              <Icon size={20} />
              <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[10px] text-zinc-100 opacity-0 group-hover:opacity-100 transition">
                {label}
              </span>
              {active && (
                <span className="absolute -bottom-1.5 h-1 w-1 rounded-full bg-white/80" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
