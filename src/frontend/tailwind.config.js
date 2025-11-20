/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        spotify: {
          green: '#1DB954',
          'green-dark': '#1AA34A',
          'green-light': '#1ED760',
          black: '#191414',
          'gray-dark': '#121212',
          'gray-medium': '#282828',
          'gray-light': '#B3B3B3',
          white: '#FFFFFF',
        },
        primary: {
          DEFAULT: '#1DB954',
          light: '#1ED760',
          dark: '#1AA34A',
        }
      }
    },
  },
  plugins: [],
}

