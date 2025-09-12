import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow external connections (mobile devices)
    port: 5173,
    open: true, // Auto-open browser on start
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // Avoid CORS preflight complexities during dev
        secure: false,
      },
    },
  },
})
