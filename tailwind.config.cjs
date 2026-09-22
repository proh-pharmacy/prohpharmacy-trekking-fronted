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

        // Portal Dynamic Theme System
        'portal-canvas': 'var(--color-portal-canvas)',
        'portal-surface': 'var(--color-portal-surface)',
        'portal-border': 'var(--color-portal-border)',
        'portal-muted': 'var(--color-portal-muted)',
        'portal-text': 'var(--color-portal-text)',
        'portal-heading': 'var(--color-portal-heading)',
        'portal-accent': 'var(--color-portal-accent)',
        'portal-accent-hover': 'var(--color-portal-accent-hover)',
        'portal-orange': 'var(--color-portal-orange)',
        'portal-hover': 'var(--color-portal-hover)',
        'portal-active': 'var(--color-portal-active)',

        // Card & Modal Surfaces
        'portal-card': 'var(--color-portal-card)',
        'portal-card-border': 'var(--color-portal-card-border)',
        'card-dark': 'var(--color-card-dark)',
        'card-dark-border': 'var(--color-card-dark-border)',

        // Semantic Canvas Aliases
        'dark-canvas': 'var(--color-dark-canvas)',
        'dark-surface': 'var(--color-dark-surface)',
        'dark-border': 'var(--color-dark-border)',
        'dark-muted': 'var(--color-dark-muted)',
        'dark-text': 'var(--color-dark-text)',

        // Sidebar Dynamic Palette
        'sidebar-surface': 'var(--color-sidebar-surface)',
        'sidebar-border': 'var(--color-sidebar-border)',
        'sidebar-heading': 'var(--color-sidebar-heading)',
        'sidebar-text': 'var(--color-sidebar-text)',
        'sidebar-muted': 'var(--color-sidebar-muted)',
        'sidebar-canvas': 'var(--color-sidebar-canvas)',
        'sidebar-hover': 'var(--color-sidebar-hover)',
        'sidebar-accent': 'var(--color-sidebar-accent)',

        // Table Header Dynamic Palette
        'table-header': 'var(--color-table-header-bg)',
        'table-header-text': 'var(--color-table-header-text)',

        // Portal Header Dynamic Palette
        'header-surface': 'var(--color-header-surface)',
        'header-border': 'var(--color-header-border)',
        'header-text': 'var(--color-header-text)',
        'header-heading': 'var(--color-header-heading)',
        'header-muted': 'var(--color-header-muted)',
      },
    },
  },
  plugins: [],
};
