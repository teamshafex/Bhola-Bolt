import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@bhola/database': path.resolve(__dirname, './src/lib/databaseShim.ts'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
