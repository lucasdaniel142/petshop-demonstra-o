// vite.config.ts
// Correção: Removido `define: { 'process.env.GEMINI_API_KEY': ... }`
// — resíduo do template AI Studio. O projeto não usa Gemini.
// Em produção, esse `define` injetava `undefined` no bundle desnecessariamente.

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'icons/*.svg', 'icons/*.png'],
      manifest: {
        name: 'Supermercado Sagrada Família',
        short_name: 'Sagrada Família',
        description: 'Seu supermercado na palma da mão - Peça e receba em casa.',
        theme_color: '#1a4e22', // Cor predominante da marca
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // Impede o Vite de tentar processar pacotes Node.js server-side
  optimizeDeps: {
    exclude: ['mercadopago', 'firebase-admin'],
  },
  server: {
    port: 3000,
    host: true, // Era '0.0.0.0' — 'true' é equivalente mas resolve mais rápido
    hmr: process.env.DISABLE_HMR !== 'true',
    // Rotas Vercel `/api/*` não existem no Vite puro; em dev o script `dev:api` sobe o Express local.
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.DEV_API_PORT || '8787'}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    // Alerta se qualquer chunk ultrapassar 500KB
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Separar Firebase em chunk próprio para melhor cache no browser
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
