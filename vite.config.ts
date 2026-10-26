import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// The landing page lives at https://<user>.github.io/rastro/ and the app under /rastro/app/.
// Set BASE_PATH (e.g. /app/) when hosting elsewhere.
const base = process.env.BASE_PATH ?? '/rastro/app/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Rastro',
        short_name: 'Rastro',
        description: 'Real actions, signed by who did them, confirmed by who was there.',
        lang: 'en-US',
        theme_color: '#1f4d2b',
        background_color: '#f6f3ea',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
