import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'certs/nginx-selfsigned.key')),
      cert: fs.readFileSync(path.resolve(__dirname, 'certs/nginx-selfsigned.crt')),
    },
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) {
              return 'vendor-react';
            }
            // React Router
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // State management
            if (id.includes('zustand') || id.includes('@tanstack/react-query')) {
              return 'vendor-state';
            }
            // TipTap editor
            if (id.includes('@tiptap') || id.includes('prosemirror') || id.includes('tippy')) {
              return 'vendor-editor';
            }
            // Markdown
            if (id.includes('react-markdown') || id.includes('marked') || id.includes('remark') || id.includes('react-syntax-highlighter') || id.includes('refractor') || id.includes('prismjs')) {
              return 'vendor-markdown';
            }
          }
        },
      },
    },
  },
})
