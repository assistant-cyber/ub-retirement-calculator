/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#21205f",
        mulberry: "#9c221f",
        gold: "#c9a227",
        track: "#2e7d4f",
        ivory: "#f7f7f9",
      },
      fontFamily: {
        heading: ["var(--font-playfair)", "serif"],
        body: ["var(--font-opensans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
