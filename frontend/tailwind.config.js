/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        vault: {
          bg: '#0a0d14',
          card: '#111726',
          border: '#1f293d',
          accent: '#3b82f6',
          danger: '#ef4444',
          warning: '#f59e0b',
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'siren-strobe': 'sirenStrobe 0.8s infinite alternate',
      },
      keyframes: {
        sirenStrobe: {
          '0%': { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.5)' },
          '100%': { backgroundColor: 'rgba(239, 68, 68, 0.45)', borderColor: 'rgba(239, 68, 68, 1)' }
        }
      }
    },
  },
  plugins: [],
}
