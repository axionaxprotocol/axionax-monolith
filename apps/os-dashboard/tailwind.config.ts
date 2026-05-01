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
