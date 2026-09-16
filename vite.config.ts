import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@app': path.resolve(__dirname, './src/app'),
      '@features': path.resolve(__dirname, './src/features'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@i18n': path.resolve(__dirname, './src/i18n'),
      '@data': path.resolve(__dirname, './src/data'),
    },
  },
  server: {
    port: 3000,
    // Dev parity with nginx in production: forward same-origin /api/* to the
    // backend so fetch('/api/v1/...') and OAuth redirects work on vite dev too.
    // Without this, visiting /api/v1/auth/google on :3002 serves the SPA
    // fallback (NotFound page in the screenshot) instead of the API.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/ready': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (
            id.includes('node_modules/react-router-dom') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/')
          ) return 'vendor';
          if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n';
          if (id.includes('lucide-react')) return 'icons';
          return undefined;
        },
      },
    },
  },
});

