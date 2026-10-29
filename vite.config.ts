import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app from https://fiodesygp.github.io/bright-ideas/,
// Vercel from the domain root. Vercel sets VERCEL=1 during its builds.
const base = process.env.VERCEL ? '/' : '/bright-ideas/'

// https://vite.dev/config/
export default defineConfig({
  base,
  // Export libraries load lazily; pre-bundle them so dev doesn't reload mid-export.
  optimizeDeps: { include: ['html-to-image', 'pdfkit', 'pdfkit/output'] },
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
        theme_color: '#2e7d3e',
        background_color: '#ffffff',
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
        // woff files are the PDF fonts; woff2 are the page fonts.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff,woff2}'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
})
