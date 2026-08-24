const { colors } = require('./src/theme/palette');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // `class` (not the preset default of `media`) so the in-app appearance
  // toggle drives `dark:`, not the OS. Kept in sync from app/_layout.tsx.
  darkMode: 'class',
  theme: {
    extend: {
      // Colours live in src/theme/palette.js so this config and the runtime
      // theme in src/theme/colors.ts cannot drift apart.
      colors,
    },
  },
  plugins: [],
};
