/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ProH Pharmacy Brand Colors
        'deep-green': '#045E1F',
        'primary-green': '#087A2D',
        'bright-green': '#01A42F',
        'light-green': '#F1FBF4',
        'red-accent': '#DE2512',
        'red-accent-hover': '#C51F0E',
        'main-text': '#102218',
        'muted-text': '#5F6F64',
        'light-border': '#DDE9E0',
      },
    },
  },
  plugins: [],
};
