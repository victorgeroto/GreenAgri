/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Verde floresta sóbrio: primário em ações e navegação, nunca como fundo de página.
        brand: {
          50: '#f1f6f2',
          100: '#dfece3',
          200: '#bfd9c7',
          300: '#93bfa1',
          500: '#3d8559',
          600: '#2c6c45',
          700: '#235737',
          800: '#1b452c',
          900: '#143521',
          950: '#0b1f14',
        },
        canvas: '#f5f5f3',
        solo: {
          50: '#faf7f2',
          100: '#f3ece0',
          500: '#a16207',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(28 25 23 / 0.04)',
        pop: '0 8px 24px -6px rgb(28 25 23 / 0.18), 0 2px 6px -2px rgb(28 25 23 / 0.08)',
      },
    },
  },
  plugins: [],
}
