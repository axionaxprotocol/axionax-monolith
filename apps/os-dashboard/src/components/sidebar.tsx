"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  Wallet,
  Server,
  Settings,
  Activity,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/nodes", label: "Nodes", icon: Server },
  { href: "/apps", label: "Apps", icon: Boxes },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-bg-card">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-border">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
          <Zap size={18} />
        </div>
        <div className="leading-tight">
          <div className="font-semibold">Axionax OS</div>
          <div className="text-xs text-zinc-500">v0.1 alpha</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-zinc-400 hover:bg-bg-elev hover:text-zinc-100"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border text-xs text-zinc-500">
        <div className="rounded-lg bg-bg-elev p-3">
          <div className="font-medium text-zinc-300">Chain ID</div>
          <div className="font-mono">86137 · testnet</div>
        </div>
      </div>
    </aside>
  );
}
