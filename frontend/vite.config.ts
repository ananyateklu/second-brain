import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Create individual chunks for settings components
          if (id.includes('/Settings/AISettingsSection')) return 'settings-ai';
          if (id.includes('/Settings/AppearanceSettingsSection')) return 'settings-appearance';
          if (id.includes('/Settings/NotificationSettingsSection')) return 'settings-notifications';
          if (id.includes('/Settings/SecuritySettingsSection')) return 'settings-security';
          if (id.includes('/Settings/DataManagementSettingsSection')) return 'settings-data';
          if (id.includes('/Settings/AccountSettingsSection')) return 'settings-account';
          if (id.includes('/Settings/IntegrationsSettingsSection')) return 'settings-integrations';
          if (id.includes('/Settings/SyncResultModal')) return 'settings-sync-modal';

          // Existing vendor chunks
          if (id.includes('node_modules/react')) return 'vendor-react';
          if (id.includes('node_modules/@headlessui') ||
            id.includes('node_modules/lucide-react') ||
            id.includes('node_modules/framer-motion') ||
            id.includes('node_modules/classnames')) return 'vendor-ui';
          if (id.includes('node_modules/chart.js') ||
            id.includes('node_modules/react-chartjs-2') ||
            id.includes('node_modules/recharts') ||
            id.includes('node_modules/react-circular-progressbar')) return 'vendor-charting';
          if (id.includes('node_modules/marked') ||
            id.includes('node_modules/react-markdown') ||
            id.includes('node_modules/react-syntax-highlighter') ||
            id.includes('node_modules/remark-gfm') ||
            id.includes('node_modules/remark-math') ||
            id.includes('node_modules/rehype-katex')) return 'vendor-markdown';
          if (id.includes('node_modules/date-fns') ||
            id.includes('node_modules/uuid') ||
            id.includes('node_modules/axios')) return 'vendor-utils';
          if (id.includes('node_modules/@microsoft/signalr')) return 'vendor-signalr';
          if (id.includes('node_modules/pdfjs-dist')) return 'vendor-pdf';
        }
      },
      // Ignore these warnings from SignalR and pdf.js
      onwarn(warning, warn) {
        // Ignore specific warnings about SignalR
        if (warning.code === 'SOURCEMAP_ERROR' &&
          warning.message.includes('@microsoft/signalr')) {
          return;
        }

        // Ignore eval warnings from pdf.js
        if (warning.code === 'EVAL' &&
          warning.id?.includes('pdfjs-dist')) {
          return;
        }

        // Ignore pure annotation position warnings from SignalR
        if (warning.message &&
          warning.message.includes('@microsoft/signalr') &&
          warning.message.includes('/*#__PURE__*/')) {
          return;
        }

        // Let Rollup handle all other warnings
        warn(warning);
      }
    }
  }
});
