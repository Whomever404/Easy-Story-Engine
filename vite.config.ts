import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@engine': path.resolve(import.meta.dirname, './src/engine'),
      '@project': path.resolve(import.meta.dirname, './src/project'),
      '@editor': path.resolve(import.meta.dirname, './src/editor'),
    },
  },
  plugins: [
    {
      name: 'html-classic-script-transform',
      transformIndexHtml(html) {
        // Strip type="module" and crossorigin so file:// protocol can load without CORS errors
        return html
          .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
          .replace(/<script type="module" src="[^"]+"><\/script>/g, '<script defer src="./bundle.js"></script>');
      },
      closeBundle() {
        const src = path.resolve(import.meta.dirname, 'dist/bundle.js');
        const dest = path.resolve(import.meta.dirname, 'bundle.js');
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'EasyStoryEngineApp',
        entryFileNames: 'bundle.js',
        inlineDynamicImports: true,
      },
    },
  },
  test: {
    environment: 'happy-dom',
  },
  server: {
    port: 3000,
    open: false,
  },
});
