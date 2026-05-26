import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-ibm-plex-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'monospace'],
      },
      colors: {
        bg: {
          base: '#06070d',
          surface: '#0d0f1a',
          elevated: '#131629',
          overlay: '#1a1e30',
        },
        border: {
          subtle: '#1e2236',
          DEFAULT: '#252a3e',
          strong: '#2f3650',
        },
        accent: {
          blue: '#3b82f6',
          'blue-dim': '#1d4ed8',
          cyan: '#22d3ee',
          'cyan-dim': '#0891b2',
        },
        tx: {
          primary: '#e2e8f0',
          secondary: '#8892a4',
          muted: '#4a5568',
          inverse: '#06070d',
        },
        status: {
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
        vis: {
          compare: '#f59e0b',
          swap: '#ef4444',
          sorted: '#10b981',
          current: '#3b82f6',
          highlight: '#a78bfa',
          normal: '#374151',
        }
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(30,34,54,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(30,34,54,0.4) 1px, transparent 1px)",
        'radial-glow': 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 60%)',
      },
      backgroundSize: {
        'grid-sm': '24px 24px',
        'grid-md': '32px 32px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'typewriter': 'typewriter 0.05s steps(1) forwards',
        'shimmer': 'shimmer 1.5s infinite',
        'bar-grow': 'barGrow 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        barGrow: {
          '0%': { transform: 'scaleY(0)', transformOrigin: 'bottom' },
          '100%': { transform: 'scaleY(1)', transformOrigin: 'bottom' },
        },
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59,130,246,0.25)',
        'glow-cyan': '0 0 20px rgba(34,211,238,0.2)',
        'glow-green': '0 0 16px rgba(16,185,129,0.2)',
        'panel': '0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(30,34,54,0.8)',
      }
    },
  },
  plugins: [],
}

export default config
