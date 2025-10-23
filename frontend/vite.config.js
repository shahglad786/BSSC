import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // CRITICAL FIX: Ensures asset paths are relative (e.g., ./assets/index.js)
  // This prevents the blank screen issue when deployed from a subdirectory on Vercel.
  base: './', 
  plugins: [react()],
});
