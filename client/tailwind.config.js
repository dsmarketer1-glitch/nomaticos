/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        head: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: '#f59e0b',
          light: '#d97706',
          hover: '#d97706',
        },
        surface: {
          dark: '#0d1320',
          light: '#ffffff',
        },
        card: {
          dark: '#111827',
          light: '#f1f5f9',
        },
        input: {
          dark: '#1a2236',
          light: '#ffffff',
        },
        border: {
          dark: '#1e2d45',
          light: '#e2e8f0',
          'dark-hover': '#253550',
          'light-hover': '#cbd5e1',
        },
      },
      borderRadius: {
        card: '14px',
        input: '10px',
        pill: '20px',
      },
    },
  },
  plugins: [],
};
