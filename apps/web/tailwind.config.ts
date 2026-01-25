import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Industrial dark palette
        navy: {
          950: '#0d1520',
          900: '#1a2744',
          800: '#243352',
          700: '#2e4060',
          600: '#3d5275',
          500: '#516689',
        },
        // Accent - Safety Orange
        accent: {
          DEFAULT: '#ff6b00',
          light: '#ff8533',
          dark: '#cc5500',
          muted: '#ff6b0020',
        },
        // Status colors - vivid for visibility
        success: {
          DEFAULT: '#22c55e',
          dark: '#16a34a',
          muted: '#22c55e20',
        },
        danger: {
          DEFAULT: '#ef4444',
          dark: '#dc2626',
          muted: '#ef444420',
        },
        warning: {
          DEFAULT: '#f59e0b',
          dark: '#d97706',
          muted: '#f59e0b20',
        },
        // Surface colors for cards/sections
        surface: {
          DEFAULT: '#1e2a3e',
          light: '#253448',
          dark: '#151d2b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'metric': ['3rem', { lineHeight: '1', fontWeight: '700' }],
        'metric-lg': ['3.5rem', { lineHeight: '1', fontWeight: '700' }],
        'metric-xl': ['4rem', { lineHeight: '1', fontWeight: '700' }],
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        'grid-pattern-light': 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '24px 24px',
      },
    },
  },
  plugins: [],
};

export default config;
