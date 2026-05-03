<<<<<<< D:/propguard/axionax-monolith/apps/os-dashboard/src/components/menu-bar.tsx
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
=======
"use client";

import { useEffect, useState } from "react";
import { Wifi, Activity, Search, Zap, Bell } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";

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
        })
      );
      setDate(
        now.toLocaleDateString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed top-0 inset-x-0 z-40 h-11 glass-strong border-b border-white/5">
      <div className="flex h-full items-center px-5 text-xs text-zinc-300">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2.5 font-semibold tracking-tight">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Axionax"
              className="h-5 w-5 object-contain invert brightness-125 contrast-125 drop-shadow-[0_0_8px_rgba(94,234,212,0.8)]"
            />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(34,197,94,0.8)] animate-pulse" />
          </div>
          <span className="text-zinc-200">Axionax OS</span>
        </div>
        
        {/* Menu Items */}
        <nav className="ml-6 flex items-center gap-1 text-zinc-400">
          {["File", "View", "Network", "Help"].map((item) => (
            <button 
              key={item}
              className="px-3 py-1.5 rounded-md hover:bg-white/5 hover:text-zinc-200 transition-colors duration-200"
            >
              {item}
            </button>
          ))}
        </nav>
        
        {/* Right Side Items */}
        <div className="ml-auto flex items-center gap-1">
          {/* Status Pills */}
          <div className="flex items-center gap-2 mr-2">
            <StatusPill 
              icon={<Zap size={12} />} 
              label="Active" 
              color="amber"
            />
            <StatusPill 
              icon={<Activity size={12} />} 
              label="Testnet" 
              color="emerald"
            />
          </div>
          
          <div className="w-px h-5 bg-white/10 mx-1" />
          
          {/* Controls */}
          <button className="p-2 rounded-md hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-all duration-200">
            <Bell size={14} />
          </button>
          
          <button className="p-2 rounded-md hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-all duration-200">
            <Search size={14} />
          </button>
          
          <ThemeSwitcher />
          
          <div className="w-px h-5 bg-white/10 mx-1" />
          
          {/* Date & Time */}
          <div className="flex items-center gap-2 px-2">
            <span className="text-zinc-500">{date}</span>
            <span className="font-mono tabular-nums text-zinc-200 font-medium">
              {time || "--:--"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ 
  icon, 
  label, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  color: "emerald" | "amber" | "cyan" | "indigo";
}) {
  const colors = {
    emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    cyan: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    indigo: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  };
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${colors[color]}`}>
      {icon}
      {label}
    </span>
  );
}
<<<<<<< D:/propguard/axionax-monolith/apps/os-dashboard/src/components/menu-bar.tsx
>>>>>>> C:/Users/kong/.windsurf/worktrees/axionax-monolith/axionax-monolith-93dd2c56/apps/os-dashboard/src/components/menu-bar.tsx
=======
>>>>>>> C:/Users/kong/.windsurf/worktrees/axionax-monolith/axionax-monolith-93dd2c56/apps/os-dashboard/src/components/menu-bar.tsx
