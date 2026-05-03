"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback } from "react";
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mouseX, setMouseX] = useState<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouseX(e.clientX - rect.left);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
    setMouseX(null);
  }, []);

  const getScale = (index: number) => {
    if (mouseX === null || hoveredIndex === null) return 1;
    
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return 1.4;
    if (distance === 1) return 1.2;
    if (distance === 2) return 1.1;
    return 1;
  };

  const getTranslateY = (index: number) => {
    const scale = getScale(index);
    return scale > 1 ? -(scale - 1) * 12 : 0;
  };

  return (
    <div className="fixed bottom-6 inset-x-0 z-30 flex justify-center pointer-events-none">
      <div 
        className="pointer-events-auto glass-strong flex items-end gap-1 rounded-3xl px-4 py-3 shadow-2xl"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <button
          className="group relative grid h-12 w-12 place-items-center rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 transition-all duration-300 ease-out hover:scale-110"
          title="Search"
          aria-label="Search"
        >
          <Search size={18} className="transition-transform duration-200 group-hover:scale-110" />
          <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/80 px-2.5 py-1.5 text-[10px] text-zinc-100 opacity-0 group-hover:opacity-100 transition-all duration-200 scale-95 group-hover:scale-100">
            Search
          </span>
        </button>
        
        <span className="mx-2 h-10 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent self-center" />
        
        {DOCK_APPS.map(({ href, label, Icon, color }, index) => {
          const active = href === "/" ? pathname === "/" : pathname?.startsWith(href);
          const scale = getScale(index);
          const translateY = getTranslateY(index);
          
          return (
            <Link
              key={href}
              href={href}
              title={label}
              onMouseEnter={() => setHoveredIndex(index)}
              className={cn(
                "group relative grid place-items-center rounded-2xl bg-gradient-to-br text-white app-icon-shadow transition-all duration-300 ease-out",
                color,
                active && "ring-2 ring-white/40 ring-offset-2 ring-offset-transparent"
              )}
              style={{
                width: 48,
                height: 48,
                transform: `scale(${scale}) translateY(${translateY}px)`,
              }}
            >
              <Icon size={20} className="transition-transform duration-200" style={{ transform: `scale(${1 / Math.sqrt(scale)})` }} />
              
              <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/80 px-2.5 py-1.5 text-[10px] text-zinc-100 opacity-0 group-hover:opacity-100 transition-all duration-200 scale-95 group-hover:scale-100 z-50">
                {label}
              </span>
              
              {active && (
                <span className="absolute -bottom-2 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
