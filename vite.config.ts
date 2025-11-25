import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: './frontend',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src')
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
