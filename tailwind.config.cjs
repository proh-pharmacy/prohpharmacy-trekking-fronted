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

        // Portal & Dark Theme System
        'portal-canvas': '#22272e',
        'portal-surface': '#2d333b',
        'portal-border': '#444c56',
        'portal-muted': '#768390',
        'portal-text': '#adbac7',
        'portal-accent': '#41cc84',
        'portal-accent-hover': '#38b273',
        'portal-orange': '#f0883e',

        // Card & Modal Dark Surface (Matches Login Card & Popups)
        'portal-card': '#333e38',
        'portal-card-border': '#48564e',
        'card-dark': '#333e38',
        'card-dark-border': '#48564e',

        // Semantic Dark Canvas Aliases
        'dark-canvas': '#22272e',
        'dark-surface': '#2d333b',
        'dark-border': '#444c56',
        'dark-muted': '#768390',
        'dark-text': '#adbac7',
      },
    },
  },
  plugins: [],
};
