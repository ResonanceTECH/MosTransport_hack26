import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

const apiProxy = {
  '/api': {
    target: process.env.VITE_API_PROXY ?? 'http://localhost:8000',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  // `vite preview` serves the production build in the container (no nginx).
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT ?? 443),
    strictPort: true,
    allowedHosts: true,
    proxy: apiProxy,
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
  // MapLibre starts its worker with `type: 'module'`.
  worker: {
    format: 'es',
  },
})
