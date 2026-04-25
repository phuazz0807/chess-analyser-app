import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/games': {
        target: process.env.VITE_DEV_API || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api': {
        target: process.env.VITE_DEV_API || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      threshold: {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85,
      },
    },
  },
})
