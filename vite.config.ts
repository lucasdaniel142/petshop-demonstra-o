// vite.config.ts
// Correção: Removido `define: { 'process.env.GEMINI_API_KEY': ... }`
// — resíduo do template AI Studio. O projeto não usa Gemini.
// Em produção, esse `define` injetava `undefined` no bundle desnecessariamente.

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
