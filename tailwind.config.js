/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        cream: '#FFFDE1',
        golden: '#FBE580',
        fresh: '#93BD57',
        burgundy: '#980404',

        // Light Theme
        background: {
          DEFAULT: '#FFFDE1',
          dark: '#1A1918',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#2D2A26',
        },
        'surface-elevated': {
          DEFAULT: '#FFFFFF',
          dark: '#3D3A36',
        },
        primary: {
          DEFAULT: '#93BD57',
          light: '#A8CE6F',
          dark: '#5C8A32',
          deep: '#3D6B23',
        },
        accent: {
          DEFAULT: '#FBE580',
          dark: '#E8D46D',
        },
        error: {
          DEFAULT: '#980404',
          light: '#C94444',
        },
        text: {
          DEFAULT: '#2D2A26',
          secondary: '#6B6560',
          tertiary: '#8D8680',
          dark: '#FFFDE1',
          'dark-secondary': '#B8B4A9',
        },
        border: {
          DEFAULT: '#E8E4D9',
          dark: '#4A4640',
        },

        // Category Colors
        category: {
          produce: '#93BD57',
          dairy: '#5BA4D9',
          meat: '#980404',
          bakery: '#FBE580',
          beverages: '#8B7EC8',
          frozen: '#4DB6AC',
          pantry: '#E8976C',
          household: '#8D8680',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        'sans-light': ['Inter-Light', 'system-ui', 'sans-serif'],
        'sans-medium': ['Inter-Medium', 'system-ui', 'sans-serif'],
        'sans-semibold': ['Inter-SemiBold', 'system-ui', 'sans-serif'],
        'sans-bold': ['Inter-Bold', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
