import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5174,
  },
  build: {
    target: 'es2020',
  },
});
