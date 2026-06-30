import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: { outDir: 'dist', minify: 'esbuild' },
  server: { port: 3000, host: true }
});
