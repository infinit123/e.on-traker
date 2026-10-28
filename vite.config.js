import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Works on both username.github.io and username.github.io/repository/
  base: mode === 'production' ? './' : '/',
  build: { target: 'safari15', outDir: 'dist' }
}));
