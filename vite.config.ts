import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// base подставляется в CI для GitHub Pages (/<repo>/)
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
  },
});
