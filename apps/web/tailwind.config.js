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
        canvas: '#F3F1EB',
        surface: '#ECE8DE',
        panel: '#FAF8F3',
        border: '#DDD8CC',

        green: '#2F6B4F',
        'green-light': '#3D8764',

        ok: '#2F6B4F',
        warn: '#C27C2C',
        err: '#C24141',

        ink: {
          primary: '#243126',
          secondary: '#526055',
          muted: '#7B847B',
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