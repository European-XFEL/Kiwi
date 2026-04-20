import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig({
  build: {
    // TODO: Evaluate use of build.rollupOptions.output.manualChunks
    chunkSizeWarningLimit: 10240,
  },
  plugins: [
    react(),
    tailwindcss(),
    svgr({
      svgrOptions: {
        exportType: 'default',
        ref: true,
        svgo: false,
        titleProp: true,
      },

      include: '**/*.svg',
    }),
  ],
  resolve: {
    alias: {
      path: 'path-browserify',
      '@': path.resolve(__dirname, './src'),
    },
  },
});
