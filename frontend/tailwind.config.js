module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Fourdoor AI design system (see design handoff tokens.css)
        surface: {
          base: '#0A0A0B',
          raised: '#111113',
          elevated: '#18181B',
          overlay: '#1E1E22',
        },
        brand: {
          DEFAULT: '#F97316',
          hover: '#FB923C',
        },
        accent: {
          DEFAULT: '#14B8A6',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(249,115,22,0.35)',
        card: '0 4px 16px rgba(0,0,0,0.5)',
      },
      transitionTimingFunction: {
        snap: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
