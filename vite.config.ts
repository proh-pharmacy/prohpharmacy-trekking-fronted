import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'favicon-32x32.png', 'favicon-16x16.png', 'apple-touch-icon.png', 'images/**'],
      manifest: false, // we use our own public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB
        runtimeCaching: [
          {
            // Network-first for API calls — fresh data when online, cached when offline
            urlPattern: /\/api\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache-first for static images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Stale-while-revalidate for Google Fonts / CDN assets
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
            },
          },
        ],
        // Offline fallback: serve shell for navigation requests
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: false, // keep dev fast; enable manually when testing SW
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // All portal pages → one chunk (loads once after login)
          if (id.includes('/pages/portal/')) return 'chunk-portal';

          // Login → its own small chunk
          if (id.includes('/pages/auth/')) return 'chunk-auth';

          // Driver page → standalone chunk (no auth needed)
          if (id.includes('/pages/driver/')) return 'chunk-driver';

          // Dev showcases → separate chunk (never hits prod users)
          if (id.includes('/pages/preview/')) return 'chunk-preview';
        },
      },
    },
  },
})
