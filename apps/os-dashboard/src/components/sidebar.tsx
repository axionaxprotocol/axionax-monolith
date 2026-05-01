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
    <aside className="hidden md:flex sticky top-10 h-[calc(100vh-2.5rem)] w-20 shrink-0 flex-col items-center py-4">
      <div className="glass rounded-2xl flex flex-col items-center gap-1 p-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "group relative grid h-12 w-12 place-items-center rounded-xl transition",
                active
                  ? "bg-accent/15 text-accent"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              )}
            >
              <Icon size={18} />
              <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-xs text-zinc-100 opacity-0 group-hover:opacity-100 transition">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mt-auto glass rounded-2xl p-2 text-center text-[10px] text-zinc-500 leading-tight">
        <div className="text-zinc-300 font-mono">86137</div>
        <div>testnet</div>
      </div>
    </aside>
  );
}
