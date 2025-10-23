import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // REMOVED: Proxy is no longer needed as the app will call Vercel API routes directly.
  }
})
