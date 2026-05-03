<<<<<<< D:/propguard/axionax-monolith/apps/os-dashboard/tailwind.config.ts
import type { Config } from "tailwindcss";

/**
 * Axionax-Dark — "Obsidian Matte Black" design tokens.
 *
 * Surfaces (obsidian / matte) are tuned for low eye-strain in long sessions.
 * Accents are the only colors that should appear in critical UI; everything
 * else stays in the gray ladder.
 *
 * Contrast (WCAG):
 *   text-zinc-200 on obsidian-950   = 14.6 : 1  (AAA)
 *   text-zinc-400 on obsidian-950   =  7.2 : 1  (AAA large / AA normal)
 *   text-zinc-500 on obsidian-950   =  4.5 : 1  (AA normal — caption-only)
 *   accent-ai    on obsidian-950    =  9.8 : 1  (AAA)
 *   accent-chain on obsidian-950    =  5.1 : 1  (AA)
 *
 * Spacing / type scale:
 *   Use `p-os-4`, `gap-os-6`, `text-display`, `text-body`, etc. for Obsidian OS layout.
 *   Default Tailwind spacing (rem) stays available — os-* is an additive 4px grid.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Legacy aliases — kept so existing components keep working.
        bg: {
          DEFAULT: "#0a0e14",
          card: "#11161d",
          elev: "#161c25",
        },
        border: "#1f2731",
        accent: {
          DEFAULT: "#5eead4",
          dim: "#14b8a6",
          ai: "#5eead4", // teal — Neural / Worker / DeAI actions
          chain: "#6366f1", // indigo — Blockchain / consensus
          warn: "#f59e0b", // amber — soft warnings, "outdated", "behind"
          danger: "#f43f5e", // rose — errors, slashing, fatal states
          ok: "#22c55e", // emerald — explicit success/healthy
        },
        // Surfaces — go from absolute black up to elevated cards.
        obsidian: {
          950: "#05060a",
          900: "#080a10",
          800: "#0c0f17",
          700: "#11151f",
        },
        // Borders, dividers, hairlines.
        matte: {
          900: "#1a1f2a",
          800: "#222936",
          700: "#2c3441",
        },
      },
      borderColor: {
        hairline: "rgba(255, 255, 255, 0.06)",
      },
      boxShadow: {
        glass:
          "0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 30px rgba(0,0,0,0.35)",
        "glass-strong":
          "0 1px 0 rgba(255,255,255,0.06) inset, 0 16px 48px rgba(0,0,0,0.5)",
        "icon-app":
          "0 1px 0 rgba(255,255,255,0.12) inset, 0 8px 20px rgba(0,0,0,0.45)",
        "neon-ai": "0 0 24px rgba(94, 234, 212, 0.55)",
        "neon-chain": "0 0 24px rgba(99, 102, 241, 0.45)",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      transitionDuration: {
        instant: "100ms",
        fast: "150ms",
        thoughtful: "400ms",
      },
      transitionTimingFunction: {
        os: "cubic-bezier(0.2, 0.8, 0.2, 1)", // Apple-ish ease-out for window motion
      },
      spacing: {
        "os-0": "0",
        "os-px": "1px",
        "os-0.5": "2px",
        "os-1": "4px",
        "os-2": "8px",
        "os-3": "12px",
        "os-4": "16px",
        "os-5": "20px",
        "os-6": "24px",
        "os-8": "32px",
        "os-10": "40px",
        "os-12": "48px",
        "os-16": "64px",
        "os-section": "40px",
        "os-panel": "24px",
      },
      fontSize: {
        /** Hero / shell titles */
        display: ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.02em" }],
        headline: ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.015em" }],
        title: ["1.125rem", { lineHeight: "1.5rem", letterSpacing: "-0.01em" }],
        body: ["0.875rem", { lineHeight: "1.5rem" }],
        caption: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.06em" }],
        overline: ["0.625rem", { lineHeight: "0.875rem", letterSpacing: "0.12em" }],
      },
      lineHeight: {
        tight: "1.2",
        normal: "1.5",
        relaxed: "1.75",
      },
      keyframes: {
        "neon-pulse": {
          "0%, 100%": { opacity: "0.85" },
          "50%": { opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "neon-pulse": "neon-pulse 2.5s ease-in-out infinite",
        "fade-in": "fade-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
    },
  },
  plugins: [],
};
export default config;
=======
import type { Config } from "tailwindcss";

/**
 * Axionax-Dark — "Obsidian Matte Black" design tokens.
 *
 * Surfaces (obsidian / matte) are tuned for low eye-strain in long sessions.
 * Accents are the only colors that should appear in critical UI; everything
 * else stays in the gray ladder.
 *
 * Contrast (WCAG):
 *   text-zinc-200 on obsidian-950   = 14.6 : 1  (AAA)
 *   text-zinc-400 on obsidian-950   =  7.2 : 1  (AAA large / AA normal)
 *   text-zinc-500 on obsidian-950   =  4.5 : 1  (AA normal — caption-only)
 *   accent-ai    on obsidian-950    =  9.8 : 1  (AAA)
 *   accent-chain on obsidian-950    =  5.1 : 1  (AA)
 *
 * Spacing / type scale:
 *   Use `p-os-4`, `gap-os-6`, `text-display`, `text-body`, etc. for Obsidian OS layout.
 *   Default Tailwind spacing (rem) stays available — os-* is an additive 4px grid.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Legacy aliases — kept so existing components keep working.
        bg: {
          DEFAULT: "#0a0e14",
          card: "#11161d",
          elev: "#161c25",
        },
        border: "#1f2731",
        accent: {
          DEFAULT: "#5eead4",
          dim: "#14b8a6",
          ai: "#5eead4", // teal — Neural / Worker / DeAI actions
          chain: "#6366f1", // indigo — Blockchain / consensus
          warn: "#f59e0b", // amber — soft warnings, "outdated", "behind"
          danger: "#f43f5e", // rose — errors, slashing, fatal states
          ok: "#22c55e", // emerald — explicit success/healthy
        },
        // Surfaces — go from absolute black up to elevated cards.
        obsidian: {
          950: "#05060a",
          900: "#080a10",
          800: "#0c0f17",
          700: "#11151f",
        },
        // Borders, dividers, hairlines.
        matte: {
          900: "#1a1f2a",
          800: "#222936",
          700: "#2c3441",
        },
      },
      borderColor: {
        hairline: "rgba(255, 255, 255, 0.06)",
      },
      boxShadow: {
        glass:
          "0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 24px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.2)",
        "glass-strong":
          "0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 32px rgba(0,0,0,0.5)",
        "icon-app":
          "0 1px 0 rgba(255,255,255,0.15) inset, 0 4px 12px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.35)",
        "neon-ai": "0 0 40px rgba(94, 234, 212, 0.35)",
        "neon-chain": "0 0 40px rgba(99, 102, 241, 0.30)",
        "neon-rose": "0 0 40px rgba(244, 114, 182, 0.30)",
        "glow-sm": "0 0 20px rgba(255, 255, 255, 0.1)",
        "glow-md": "0 0 40px rgba(255, 255, 255, 0.15)",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      transitionDuration: {
        instant: "100ms",
        fast: "150ms",
        thoughtful: "400ms",
      },
      transitionTimingFunction: {
        os: "cubic-bezier(0.2, 0.8, 0.2, 1)", // Apple-ish ease-out for window motion
      },
      spacing: {
        "os-0": "0",
        "os-px": "1px",
        "os-0.5": "2px",
        "os-1": "4px",
        "os-2": "8px",
        "os-3": "12px",
        "os-4": "16px",
        "os-5": "20px",
        "os-6": "24px",
        "os-8": "32px",
        "os-10": "40px",
        "os-12": "48px",
        "os-16": "64px",
        "os-section": "40px",
        "os-panel": "24px",
      },
      fontSize: {
        /** Hero / shell titles */
        display: ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.02em" }],
        headline: ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.015em" }],
        title: ["1.125rem", { lineHeight: "1.5rem", letterSpacing: "-0.01em" }],
        body: ["0.875rem", { lineHeight: "1.5rem" }],
        caption: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.06em" }],
        overline: ["0.625rem", { lineHeight: "0.875rem", letterSpacing: "0.12em" }],
      },
      lineHeight: {
        tight: "1.2",
        normal: "1.5",
        relaxed: "1.75",
      },
      keyframes: {
        "neon-pulse": {
          "0%, 100%": { opacity: "0.85" },
          "50%": { opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
      },
      animation: {
        "neon-pulse": "neon-pulse 2.5s ease-in-out infinite",
        "fade-in": "fade-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "slide-up": "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
        "float": "float 4s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
>>>>>>> C:/Users/kong/.windsurf/worktrees/axionax-monolith/axionax-monolith-93dd2c56/apps/os-dashboard/tailwind.config.ts
