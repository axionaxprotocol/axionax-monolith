
const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/OracleChat.tsx',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', ...fontFamily.sans],
        mono: ['var(--font-source-code-pro)', ...fontFamily.mono],
        display: ['var(--font-inter)', ...fontFamily.sans],
      },
      colors: {
        'axionax-background': '#121212',
        'axionax-surface': '#1E1E1E',
        'axionax-primary': '#00AEEF', // Bright Cyan/Blue
        'axionax-secondary': '#8A8A8A',
        'axionax-on-background': '#E0E0E0',
        'axionax-on-surface': '#FFFFFF',
        'axionax-gold-highlight': '#FFD700',
        'deep-space': 'var(--deep-space)',
        'black-hole': 'var(--black-hole)',
        starlight: 'var(--starlight)',
        'space-dust': 'var(--space-dust)',
        'tech-cyan': '#60a5fa',
        'tech-success': '#22c55e',
        'tech-warning': '#f59e0b',
        'tech-error': '#ef4444',
      },
      boxShadow: {
        plasma: '0 0 20px rgba(96, 165, 250, 0.35)',
        horizon: '0 0 24px rgba(96, 165, 250, 0.45)',
        'horizon-sm': '0 0 12px rgba(96, 165, 250, 0.3)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #60a5fa 0%, #a855f7 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
