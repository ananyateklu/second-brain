import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Check if SSL certs exist (only for local development)
const keyPath = path.resolve(__dirname, 'certs/nginx-selfsigned.key')
const certPath = path.resolve(__dirname, 'certs/nginx-selfsigned.crt')
const certsExist = fs.existsSync(keyPath) && fs.existsSync(certPath)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ["babel-plugin-react-compiler", {}],
        ],
      },
    })
  ],
  // Use relative paths for Tauri production builds
  base: './',
  server: {
    port: 3000,
    https: certsExist ? {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    } : undefined,
    host: '0.0.0.0', // Allow access from network
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    // Let Vite/Rollup handle chunk splitting automatically
    // Manual chunking was causing React dependency issues where
    // vendor-markdown loaded before React was available
  },
})
