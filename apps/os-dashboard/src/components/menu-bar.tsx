"use client";

import { useEffect, useState } from "react";
import { Wifi, Activity, Search } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function MenuBar() {
  const [time, setTime] = useState<string>("");
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed top-0 inset-x-0 z-40 h-10 glass-strong border-b border-white/5">
      <div className="flex h-full items-center px-4 text-xs text-zinc-300">
        <div className="flex items-center gap-2 font-medium">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Axionax"
            className="h-6 w-6 object-contain invert brightness-125 contrast-125 drop-shadow-[0_0_6px_rgba(94,234,212,0.7)]"
          />
          Axionax OS
        </div>
        <nav className="ml-6 flex items-center gap-4 text-zinc-400">
          <button className="hover:text-zinc-100">File</button>
          <button className="hover:text-zinc-100">View</button>
          <button className="hover:text-zinc-100">Network</button>
          <button className="hover:text-zinc-100">Help</button>
        </nav>
        <div className="ml-auto flex items-center gap-4 text-zinc-400">
          <ThemeSwitcher />
          <button className="hover:text-zinc-100" aria-label="Search">
            <Search size={14} />
          </button>
          <span className="inline-flex items-center gap-1">
            <Activity size={13} className="text-emerald-400" /> testnet
          </span>
          <span className="inline-flex items-center gap-1">
            <Wifi size={13} /> online
          </span>
          <span className="font-mono tabular-nums text-zinc-200">
            {time || "--:--"}
          </span>
        </div>
      </div>
    </div>
  );
}
