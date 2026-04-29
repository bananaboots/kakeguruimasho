/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// Base path. Served from the site root.
const BASE = '/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png', 'splash/*.png'],
      manifest: {
        name: 'Kakegurui Masho',
        short_name: 'Kakegurui',
        description: 'Slot-machine habit system',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        background_color: '#0A0A0B',
        theme_color: '#E53935',
        orientation: 'portrait',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,webm}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks: {
          'framer-motion': ['framer-motion'],
          zod: ['zod'],
        },
      },
    },
  },
  server: {
    host: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Exclude Playwright E2E specs — they need a running browser, not jsdom.
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
  },
});
