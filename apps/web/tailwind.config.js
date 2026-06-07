/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        canvas: '#0b1110',
        surface: '#111a17',
        panel: '#17231f',
        border: '#26352f',

        green: {
          DEFAULT: '#2f7d46',
          light: '#4fa866',
          dark: '#1f5c33',
          subtle: '#13251a',
        },

        earth: {
          DEFAULT: '#b88746',
          light: '#d1a66a',
          dark: '#76542d',
          subtle: '#24190e',
        },

        ink: {
          primary: '#f3f4ec',
          secondary: '#b5b8a8',
          muted: '#74796a',
        },

        ok: {
          DEFAULT: '#38a169',
          subtle: '#10281a',
        },

        warn: {
          DEFAULT: '#d69e2e',
          subtle: '#2a1f0a',
        },

        err: {
          DEFAULT: '#e53e3e',
          subtle: '#2a0f0f',
        },
      },
      backgroundImage: {
        noise:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'green-glow': '0 0 24px -4px rgba(47,125,70,0.32)',
        panel:
          '0 1px 0 rgba(255,255,255,0.04), 0 -1px 0 rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}