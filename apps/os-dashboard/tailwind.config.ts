import type { Config } from "tailwindcss";

/**
 * Axionax OS — "Data-Dense Dashboard" design tokens.
 *
 * Pattern: Real-Time / Operations Landing
 * Colors: Primary #0F172A, Background #020617, Accent #22C55E
 * Typography: Fira Code (Mono/Heading), Fira Sans (Body)
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Base — slate/navy theme for data density
        bg: {
          DEFAULT: "#020617",
          card: "#0F172A",
          elev: "#1E293B",
        },
        border: "#334155",
        accent: {
          DEFAULT: "#22C55E",
          dim: "#16A34A",
          ai: "#5eead4", // teal — Neural / Worker / DeAI actions
          chain: "#6366f1", // indigo — Blockchain / consensus
          warn: "#f59e0b", // amber — soft warnings, "outdated", "behind"
          danger: "#EF4444", // rose/red — errors, slashing, fatal states
          ok: "#22C55E", // emerald — explicit success/healthy
        },
        // Surfaces
        obsidian: {
          950: "#020617",
          900: "#0F172A",
          800: "#1E293B",
          700: "#334155",
        },
        matte: {
          900: "#0F172A",
          800: "#1A1E2F",
          700: "#1E293B",
        },
      },
      borderColor: {
        hairline: "rgba(255, 255, 255, 0.06)",
      },
      boxShadow: {
        // Solid/minimal shadows for data-dense look, less glow
        glass: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "glass-strong": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "glass-xl": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        "icon-app": "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        "neon-ai": "0 0 16px rgba(94, 234, 212, 0.25)",
        "neon-chain": "0 0 16px rgba(99, 102, 241, 0.20)",
        "neon-rose": "0 0 16px rgba(239, 68, 68, 0.20)",
        "glow-sm": "0 0 8px rgba(255, 255, 255, 0.05)",
        "glow-md": "0 0 16px rgba(255, 255, 255, 0.08)",
      },
      fontFamily: {
        sans: [
          '"Fira Sans"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          '"Fira Code"',
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      transitionDuration: {
        instant: "100ms",
        fast: "150ms",
        base: "200ms",
        thoughtful: "300ms", // faster animations
      },
      transitionTimingFunction: {
        os: "cubic-bezier(0.4, 0, 0.2, 1)", // Standard ease
        spring: "cubic-bezier(0.16, 1, 0.3, 1)", 
      },
      spacing: {
        // Tighter spacing for data-dense design
        "os-0": "0",
        "os-px": "1px",
        "os-0.5": "2px",
        "os-1": "4px",
        "os-2": "6px",
        "os-3": "8px",
        "os-4": "12px",
        "os-5": "16px",
        "os-6": "20px",
        "os-8": "24px",
        "os-10": "32px",
        "os-12": "40px",
        "os-16": "48px",
        "os-section": "32px",
        "os-panel": "16px",
      },
      fontSize: {
        display: ["2rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em", fontWeight: "600" }],
        headline: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em", fontWeight: "600" }],
        title: ["1rem", { lineHeight: "1.5rem", fontWeight: "500" }],
        body: ["0.875rem", { lineHeight: "1.25rem" }],
        caption: ["0.75rem", { lineHeight: "1rem" }],
        overline: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.05em", fontWeight: "500" }],
      },
      lineHeight: {
        tight: "1.2",
        normal: "1.5",
        relaxed: "1.75",
      },
      borderRadius: {
        "os-sm": "4px",
        "os-md": "6px",
        "os-lg": "8px",
        "os-xl": "12px",
        "os-2xl": "16px",
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
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.8", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
      },
      animation: {
        "neon-pulse": "neon-pulse 2.5s ease-in-out infinite",
        "fade-in": "fade-in 150ms ease-out both",
        "slide-up": "slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
        float: "float 4s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
      },
      zIndex: {
        menubar: "40",
        dock: "30",
        window: "20",
        "window-active": "25",
      },
    },
  },
  plugins: [],
};
export default config;
