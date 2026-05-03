"use client";

import { useEffect, useState } from "react";
import { Activity, Bell, Search, Wifi } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";

/**
 * MenuBar — the persistent top chrome for Axionax OS.
 *
 * Information architecture (left → right):
 *   brand · menus · right cluster (status, actions, clock)
 *
 * Design intent:
 *   - Keep the bar a single source of "where am I?" signal.
 *   - Surface one live status (Testnet) + one live metric (network).
 *     Avoid parallel pills competing for attention.
 *   - Controls are icon-only, 32×32, with hover tints only.
 */
export function MenuBar() {
  const [time, setTime] = useState<string>("");
  const [date, setDate] = useState<string>("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      setDate(
        now.toLocaleDateString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      );
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed top-0 inset-x-0 z-40 h-11 glass-strong border-b border-white/5">
      <div className="flex h-full items-center px-os-5 text-xs text-zinc-300">
        {/* Brand */}
        <div className="flex items-center gap-2.5 font-semibold tracking-tight">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Axionax"
              className="h-5 w-5 object-contain invert brightness-125 contrast-125 drop-shadow-[0_0_8px_rgba(94,234,212,0.8)]"
            />
            <span
              className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(34,197,94,0.8)] animate-pulse"
              aria-label="Node online"
            />
          </div>
          <span className="text-zinc-100">Axionax OS</span>
        </div>

        {/* App menus */}
        <nav className="ml-os-6 flex items-center gap-0.5 text-zinc-400" aria-label="Application menu">
          {["File", "View", "Network", "Help"].map((item) => (
            <button
              key={item}
              type="button"
              className="px-3 py-1 rounded-md hover:bg-white/5 hover:text-zinc-100 transition-colors duration-fast"
            >
              {item}
            </button>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-1">
          {/* Single live status — no parallel pills */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-400/20 bg-emerald-400/5 text-emerald-300 text-[10px] font-medium">
            <Activity size={11} />
            <span className="tracking-wide uppercase">Testnet</span>
          </span>

          <span className="w-px h-5 bg-white/10 mx-2" aria-hidden="true" />

          <MenuIconButton label="Notifications" icon={<Bell size={14} />} />
          <MenuIconButton label="Spotlight search" icon={<Search size={14} />} />

          <ThemeSwitcher />

          <span className="w-px h-5 bg-white/10 mx-2" aria-hidden="true" />

          {/* Date · time — compact cluster */}
          <div className="flex items-center gap-2 px-1 text-[11px]">
            <span className="text-zinc-500">{date}</span>
            <span className="font-mono tabular-nums text-zinc-100 font-medium">
              {time || "--:--"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuIconButton({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid h-8 w-8 place-items-center rounded-md hover:bg-white/5 text-zinc-400 hover:text-zinc-100 transition-colors duration-fast"
    >
      {icon}
    </button>
  );
}
