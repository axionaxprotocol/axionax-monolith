"use client";

import { useEffect, useRef, useState } from "react";
import { Palette, Check, Moon, Sun, Sparkles, Pause } from "lucide-react";

type Theme = { id: string; name: string; swatch: string };

const THEMES: Theme[] = [
  { id: "aurora", name: "Aurora", swatch: "linear-gradient(135deg, #5eead4 0%, #6366f1 50%, #ec4899 100%)" },
  { id: "sunset", name: "Sunset", swatch: "linear-gradient(135deg, #fb923c 0%, #f43f5e 50%, #a855f7 100%)" },
  { id: "ocean", name: "Ocean", swatch: "linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #22d3ee 100%)" },
  { id: "forest", name: "Forest", swatch: "linear-gradient(135deg, #22c55e 0%, #10b981 50%, #14b8a6 100%)" },
  { id: "rose", name: "Rose", swatch: "linear-gradient(135deg, #f472b6 0%, #ec4899 50%, #a855f7 100%)" },
  { id: "midnight", name: "Midnight", swatch: "linear-gradient(135deg, #1f2937 0%, #0f172a 50%, #020617 100%)" },
  { id: "cyberpunk", name: "Cyberpunk", swatch: "linear-gradient(135deg, #ec4899 0%, #22d3ee 50%, #facc15 100%)" },
  { id: "pastel", name: "Pastel", swatch: "linear-gradient(135deg, #c4b5fd 0%, #fcd3c4 50%, #a5f3fc 100%)" },
];

type Mode = "dark" | "light";
type Anim = "on" | "off";

type CustomColors = {
  base: string;
  blob1: string;
  blob2: string;
  blob3: string;
  blob4: string;
};

const KEY_THEME = "axionax-theme";
const KEY_MODE = "axionax-mode";
const KEY_ANIM = "axionax-anim";
const KEY_CUSTOM = "axionax-custom";

const DEFAULT_CUSTOM: CustomColors = {
  base: "#050810",
  blob1: "#5eead4",
  blob2: "#6366f1",
  blob3: "#ec4899",
  blob4: "#14b8a6",
};

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length < 3) return `rgba(0,0,0,${alpha})`;
  const [r, g, b] = m.map((x) => parseInt(x, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyTheme(id: string) {
  const html = document.documentElement;
  // clear inline custom vars whenever picking a preset
  ["--wp-base-from", "--wp-base-to", "--wp-blob-1", "--wp-blob-2", "--wp-blob-3", "--wp-blob-4"].forEach(
    (v) => html.style.removeProperty(v)
  );
  if (id === "aurora") html.removeAttribute("data-theme");
  else html.setAttribute("data-theme", id);
}

function applyCustom(c: CustomColors) {
  const html = document.documentElement;
  html.setAttribute("data-theme", "custom");
  html.style.setProperty("--wp-base-from", c.base);
  html.style.setProperty("--wp-base-to", c.base);
  html.style.setProperty("--wp-blob-1", hexToRgba(c.blob1, 0.22));
  html.style.setProperty("--wp-blob-2", hexToRgba(c.blob2, 0.22));
  html.style.setProperty("--wp-blob-3", hexToRgba(c.blob3, 0.2));
  html.style.setProperty("--wp-blob-4", hexToRgba(c.blob4, 0.2));
}

function applyMode(m: Mode) {
  const html = document.documentElement;
  if (m === "light") html.setAttribute("data-mode", "light");
  else html.removeAttribute("data-mode");
}

function applyAnim(a: Anim) {
  const html = document.documentElement;
  if (a === "off") html.setAttribute("data-anim", "off");
  else html.removeAttribute("data-anim");
}

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("aurora");
  const [mode, setMode] = useState<Mode>("dark");
  const [anim, setAnim] = useState<Anim>("on");
  const [custom, setCustom] = useState<CustomColors>(DEFAULT_CUSTOM);
  const [showCustom, setShowCustom] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage
  useEffect(() => {
    const t = localStorage.getItem(KEY_THEME) || "aurora";
    const m = (localStorage.getItem(KEY_MODE) as Mode) || "dark";
    const a = (localStorage.getItem(KEY_ANIM) as Anim) || "on";
    const cRaw = localStorage.getItem(KEY_CUSTOM);
    setActive(t);
    setMode(m);
    setAnim(a);
    applyMode(m);
    applyAnim(a);
    if (t === "custom" && cRaw) {
      try {
        const c = JSON.parse(cRaw) as CustomColors;
        setCustom(c);
        applyCustom(c);
        return;
      } catch {
        /* fallthrough */
      }
    }
    applyTheme(t);
  }, []);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selectTheme = (id: string) => {
    setActive(id);
    applyTheme(id);
    localStorage.setItem(KEY_THEME, id);
    setShowCustom(false);
  };

  const toggleMode = () => {
    const next: Mode = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyMode(next);
    localStorage.setItem(KEY_MODE, next);
  };

  const toggleAnim = () => {
    const next: Anim = anim === "on" ? "off" : "on";
    setAnim(next);
    applyAnim(next);
    localStorage.setItem(KEY_ANIM, next);
  };

  const updateCustom = (patch: Partial<CustomColors>) => {
    const next = { ...custom, ...patch };
    setCustom(next);
    applyCustom(next);
    setActive("custom");
    localStorage.setItem(KEY_CUSTOM, JSON.stringify(next));
    localStorage.setItem(KEY_THEME, "custom");
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 hover:text-zinc-100"
        aria-label="Theme"
        title="Theme"
      >
        <Palette size={14} />
      </button>
      {open && (
        <div className="glass-strong absolute right-0 top-7 w-72 rounded-xl p-3 shadow-2xl">
          {/* Mode + Animation toggles */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={toggleMode}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 px-2 py-1.5 text-xs"
            >
              {mode === "dark" ? <Moon size={13} /> : <Sun size={13} />}
              {mode === "dark" ? "Dark" : "Light"}
            </button>
            <button
              onClick={toggleAnim}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 px-2 py-1.5 text-xs"
            >
              {anim === "on" ? <Sparkles size={13} /> : <Pause size={13} />}
              {anim === "on" ? "Animated" : "Static"}
            </button>
          </div>

          {/* Wallpaper presets */}
          <div className="px-1 py-1 text-[10px] uppercase tracking-wider text-zinc-500">
            Wallpaper
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTheme(t.id)}
                title={t.name}
                className="group relative aspect-square rounded-lg ring-1 ring-white/10 overflow-hidden"
                style={{ background: t.swatch }}
              >
                {active === t.id && (
                  <span className="absolute inset-0 grid place-items-center bg-black/30">
                    <Check size={14} className="text-white" />
                  </span>
                )}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/40 text-[9px] text-white text-center py-0.5 opacity-0 group-hover:opacity-100">
                  {t.name}
                </span>
              </button>
            ))}
          </div>

          {/* Custom picker */}
          <button
            onClick={() => setShowCustom((v) => !v)}
            className="w-full flex items-center justify-between rounded-lg bg-white/5 hover:bg-white/10 px-2 py-1.5 text-xs"
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-sm ring-1 ring-white/20"
                style={{
                  background: `linear-gradient(135deg, ${custom.blob1}, ${custom.blob2}, ${custom.blob3}, ${custom.blob4})`,
                }}
              />
              Custom
            </span>
            <span className="text-zinc-500">{showCustom ? "−" : "+"}</span>
          </button>

          {showCustom && (
            <div className="mt-2 space-y-2 rounded-lg bg-white/5 p-2">
              <ColorRow
                label="Base"
                value={custom.base}
                onChange={(v) => updateCustom({ base: v })}
              />
              <ColorRow
                label="Blob 1"
                value={custom.blob1}
                onChange={(v) => updateCustom({ blob1: v })}
              />
              <ColorRow
                label="Blob 2"
                value={custom.blob2}
                onChange={(v) => updateCustom({ blob2: v })}
              />
              <ColorRow
                label="Blob 3"
                value={custom.blob3}
                onChange={(v) => updateCustom({ blob3: v })}
              />
              <ColorRow
                label="Blob 4"
                value={custom.blob4}
                onChange={(v) => updateCustom({ blob4: v })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-8 cursor-pointer rounded border border-white/10 bg-transparent p-0"
      />
      <span className="flex-1 text-zinc-300">{label}</span>
      <span className="font-mono text-[10px] text-zinc-500">{value}</span>
    </label>
  );
}
