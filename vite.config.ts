import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app from https://fiodesygp.github.io/bright-ideas/
const base = '/bright-ideas/'

// https://vite.dev/config/
export default defineConfig({
  base,
  // Export libraries load lazily; pre-bundle them so dev doesn't reload mid-export.
  optimizeDeps: { include: ['html-to-image', 'jspdf'] },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      base,
      scope: base,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Bright Ideas',
        short_name: 'Bright Ideas',
        description: 'A companion tool for the miniAgriPV kit: log your plant, learn the parts, and build circuits.',
        lang: 'en',
        theme_color: '#1f6b3a',
        background_color: '#fffdf7',
        display: 'standalone',
        scope: base,
        start_url: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
})
