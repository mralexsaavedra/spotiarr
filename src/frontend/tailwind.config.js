/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(141, 73%, 42%)',
          light: 'hsl(141, 73%, 52%)',
          dark: 'hsl(141, 73%, 32%)',
        }
      }
    },
  },
  plugins: [],
}

