import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['lexiloop-icon.svg', 'lexiloop-192.png', 'lexiloop-512.png'],
      manifest: {
        name: 'Lexiloop — GRE Vocab',
        short_name: 'Lexiloop',
        description: 'GRE vocabulary flashcards with spaced repetition.',
        theme_color: '#102a36',
        background_color: '#f4f9fa',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/lexiloop-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/lexiloop-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/lexiloop-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
