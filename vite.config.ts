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

