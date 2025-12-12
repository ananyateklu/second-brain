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
    }),
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Only split node_modules - let app code be handled by Vite
          if (!id.includes('node_modules')) {
            return undefined;
          }

          // Charting library (recharts + d3) - large, only used in Dashboard
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor') ||
              id.includes('internmap') || id.includes('delaunator') || id.includes('robust-predicates')) {
            return 'vendor-charts';
          }

          // Rich text editor (TipTap + ProseMirror) - large, only used in Notes
          if (id.includes('@tiptap') || id.includes('prosemirror') || id.includes('tippy.js') || id.includes('@popperjs')) {
            return 'vendor-editor';
          }

          // File icons - large SVG bundle, only used in Git pages
          if (id.includes('material-file-icons')) {
            return 'vendor-file-icons';
          }

          // Syntax highlighting - large, used by markdown rendering
          if (id.includes('react-syntax-highlighter') || id.includes('refractor') || id.includes('prismjs') ||
              id.includes('highlight.js') || id.includes('lowlight')) {
            return 'vendor-syntax';
          }

          // Markdown ecosystem - medium size, used in Chat & Notes
          if (id.includes('react-markdown') || id.includes('remark-') || id.includes('unified') ||
              id.includes('marked') || id.includes('hast-') || id.includes('mdast-') || id.includes('micromark') ||
              id.includes('unist-') || id.includes('vfile') || id.includes('property-information') ||
              id.includes('space-separated-tokens') || id.includes('comma-separated-tokens') ||
              id.includes('decode-named-character-reference') || id.includes('character-entities') ||
              id.includes('stringify-entities') || id.includes('ccount') || id.includes('escape-string-regexp') ||
              id.includes('markdown-table') || id.includes('zwitch') || id.includes('longest-streak')) {
            return 'vendor-markdown';
          }

          // Date utilities - medium size
          if (id.includes('date-fns')) {
            return 'vendor-date';
          }

          // Lucide icons - medium size, used across app
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }

          // TanStack Query - data fetching
          if (id.includes('@tanstack/react-query') || id.includes('@tanstack/react-virtual')) {
            return 'vendor-query';
          }

          // React Router
          if (id.includes('react-router')) {
            return 'vendor-router';
          }

          // Zustand state management
          if (id.includes('zustand')) {
            return 'vendor-zustand';
          }

          // React Hook Form
          if (id.includes('react-hook-form')) {
            return 'vendor-forms';
          }

          // Tauri APIs
          if (id.includes('@tauri-apps')) {
            return 'vendor-tauri';
          }

          // ES toolkit utilities
          if (id.includes('es-toolkit')) {
            return 'vendor-utils';
          }

          // Other small utilities that can be safely split
          if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
            return 'vendor-utils';
          }

          // Cookie/session utilities
          if (id.includes('cookie') || id.includes('set-cookie-parser')) {
            return 'vendor-utils';
          }

          // Style utilities
          if (id.includes('style-to-js') || id.includes('style-to-object')) {
            return 'vendor-utils';
          }

          // Let Vite handle React core together with app code to ensure proper initialization
          return undefined;
        },
      },
    },
  },
})
