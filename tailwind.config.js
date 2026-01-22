/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'soft-bg': '#F5F5F0',
        'soft-dark': '#1A1A1A',
      },
      boxShadow: {
        'soft': '6px 6px 12px #d1d9e6, -6px -6px 12px #ffffff',
        'soft-inset': 'inset 6px 6px 12px #d1d9e6, inset -6px -6px 12px #ffffff',
        'soft-dark': '6px 6px 12px #0f0f0f, -6px -6px 12px #252525',
        'soft-dark-inset': 'inset 6px 6px 12px #0f0f0f, inset -6px -6px 12px #252525',
      },
      borderRadius: {
        'soft': '1.5rem',
      },
    },
  },
  plugins: [],
}
