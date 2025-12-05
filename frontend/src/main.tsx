import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ToastProviderWithRef, ToastContainer } from './components/ui/Toast';
import { queryClient } from './lib/query-client';
import { ErrorBoundary } from './components/ErrorBoundary';
// Import bound-store first to register it before other stores are accessed
import './store/bound-store';
import { useThemeStore } from './store/theme-store';
import { isTauri } from './lib/native-notifications';
import { getBackendUrl, waitForBackend, onBackendEvent } from './lib/tauri-bridge';
import { setApiBaseUrl } from './lib/constants';
import App from './App';
import './index.css';

// Initialize theme before rendering to prevent FOUC
const initializeTheme = () => {
  const theme = useThemeStore.getState().theme;
  document.documentElement.setAttribute('data-theme', theme);

  // Also set the 'dark' class for Tailwind
  // Both 'dark' and 'blue' themes use dark mode styling
  if (theme === 'dark' || theme === 'blue') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// Render the app
const renderApp = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ToastProviderWithRef maxToasts={5}>
            <App />
            <ToastContainer position="top-right" gap={12} />
          </ToastProviderWithRef>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>
  );
};

// Initialize the application
async function initApp() {
  initializeTheme();

  // If running in Tauri, wait for backend to be ready
  if (isTauri()) {
    console.log('Running in Tauri mode, initializing...');

    try {
      // Get backend URL and set it
      const backendUrl = await getBackendUrl();
      setApiBaseUrl(backendUrl);
      console.log('Backend URL:', backendUrl);

      // Wait for backend to be ready (up to 60 seconds)
      const isReady = await waitForBackend(60000);

      if (!isReady) {
        console.error('Backend failed to start within timeout');
        // Still render the app - it will show connection errors
      } else {
        console.log('Backend is ready!');
      }

      // Listen for backend events
      onBackendEvent('backend-error', (error) => {
        console.error('Backend error:', error);
      });

      onBackendEvent('backend-terminated', () => {
        console.warn('Backend terminated unexpectedly');
      });
    } catch (error) {
      console.error('Failed to initialize Tauri:', error);
    }
  }

  // Render the app
  renderApp();
}

initApp();
