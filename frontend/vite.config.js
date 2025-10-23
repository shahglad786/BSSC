import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API requests to the Node.js backend running on port 5000
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})
