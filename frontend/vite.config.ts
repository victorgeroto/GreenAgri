/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Backend para onde o dev server/preview encaminha /api (ex.: API_PROXY=http://localhost:8090).
const API_PROXY = process.env.API_PROXY ?? 'http://localhost:8080'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg', 'img/*'],
      manifest: {
        name: 'GreenAgri - Gestão Agrícola',
        short_name: 'GreenAgri',
        description: 'Estoque, colheitas, frota e sensores de campo — funciona offline.',
        lang: 'pt-BR',
        theme_color: '#166534',
        background_color: '#f6f8f3',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // O app shell fica em cache; os dados da API são guardados no IndexedDB pela própria aplicação.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        // Imagens do mapa já vistas ficam disponíveis offline. Só guarda o que o usuário abriu
        // (sem pré-download em massa, que a política de uso do OpenStreetMap proíbe).
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(tile\.openstreetmap\.org|server\.arcgisonline\.com)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapa-tiles',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': API_PROXY,
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': API_PROXY,
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['fake-indexeddb/auto'],
  },
})
