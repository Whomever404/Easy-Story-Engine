import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@engine': path.resolve(import.meta.dirname, './src/engine'),
      '@project': path.resolve(import.meta.dirname, './src/project'),
      '@editor': path.resolve(import.meta.dirname, './src/editor'),
    },
  },
  test: {
    environment: 'happy-dom',
  },
  server: {
    port: 3000,
    open: false,
  },
  build: {
    target: 'esnext',
    sourcemap: true,
  },
});
