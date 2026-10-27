import { defineConfig } from 'vite';

export default defineConfig(({ command, isPreview }) => ({
  // Keep development at /; production and preview mirror the GitHub Pages project path.
  base: command === 'build' || isPreview ? '/pudding-tower/' : '/',
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  build: { rollupOptions: { output: { manualChunks: (id) => id.includes('node_modules/phaser') ? 'phaser' : undefined } } },
}));