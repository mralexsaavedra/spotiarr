/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Montserrat", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        // Paleta principal Spotify
        primary: {
          DEFAULT: "#1DB954", // Spotify Green
          light: "#1ed760",
          dark: "#1AA34A",
        },
        // Fondos
        background: {
          DEFAULT: "#121212", // Fondo principal
          elevated: "#181818", // Cards, superficies elevadas
          hover: "#282828", // Hover state
          input: "#242424", // Inputs, selects
        },
        // Textos
        text: {
          primary: "#ffffff", // Texto principal
          secondary: "#b3b3b3", // Texto secundario
          subtle: "#a7a7a7", // Texto sutil (metadata)
          muted: "#535353", // Texto muy discreto
        },
        // Bordes y divisores
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.1)", // Bordes sutiles
          light: "rgba(255, 255, 255, 0.05)",
        },
      },
    },
  },
  plugins: [],
};
