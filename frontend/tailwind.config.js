/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          deep: '#08090d',
          surface: '#0e111a',
          card: 'rgba(17, 21, 34, 0.75)',
          elevated: '#181d2e',
          accent: '#6366f1',
          cyan: '#06b6d4',
          emerald: '#10b981',
          magenta: '#d946ef'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
