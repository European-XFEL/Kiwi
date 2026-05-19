import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import { execSync } from 'child_process';

// Fetch the latest git tag. Falls back to '0.0.0' if no tag exists.
const getGitVersion = () => {
  try {
    return execSync('git describe --tags --always').toString().trim();
  } catch (e) {
    return '0.0.0';
  }
};

// https://vite.dev/config/
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 10240,
    rollupOptions: {
      external: [
        // Exclude files that depend on nodejs specific objects like fs
        // from the build image
        'src/karabo/data/xml_file_io.ts',
        // Exclude test files from the build image
        '/*.test.ts$/',
        '**/__mocks__/**',
        '**/__tests__/**',
      ],
    },
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
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(getGitVersion()),
  },
  resolve: {
    alias: {
      path: 'path-browserify',
      '@': path.resolve(__dirname, './src'),
    },
  },
});
