/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', 
  theme: {
    extend: {},
  },
  plugins: [
    // eslint-disable-next-line no-undef -- file config diproses PostCSS (CommonJS interop)
    require('tailwindcss-animate'),
  ],
}