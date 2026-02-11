import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /games requests to the FastAPI backend
    proxy: {
      '/games': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
