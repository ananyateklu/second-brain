import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ToastProviderWithRef, ToastContainer } from './components/ui/Toast';
import { queryClient } from './lib/query-client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BackendReadyProvider } from './components/BackendReadyProvider';
// Import bound-store first to register it before other stores are accessed
import './store/bound-store';
import { useThemeStore } from './store/theme-store';
import { isTauri } from './lib/native-notifications';
import { getBackendUrl, onBackendEvent } from './lib/tauri-bridge';
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

// Render the app with BackendReadyProvider to prevent requests before backend is ready
const renderApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <BackendReadyProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProviderWithRef maxToasts={5}>
              <App />
              <ToastContainer position="top-right" gap={12} />
            </ToastProviderWithRef>
          </QueryClientProvider>
        </BackendReadyProvider>
      </ErrorBoundary>
    </StrictMode>
  );
};

// Initialize the application
async function initApp() {
  initializeTheme();

  // Configure API URL for Tauri
  if (isTauri()) {
    console.warn('[Debug] Running in Tauri mode, configuring API URL...');

    try {
      // Get backend URL from Tauri
      const backendUrl = await getBackendUrl();
      console.warn('[Debug] Backend URL from Tauri:', backendUrl);
      
      // In development mode with HTTPS, use the Vite proxy to avoid mixed content issues
      // The Vite dev server proxies /api/* requests to the backend
      if (import.meta.env.DEV && window.location.protocol === 'https:') {
        console.warn('[Debug] Using Vite proxy for HTTPS dev mode');
        setApiBaseUrl('/api');
      } else {
        setApiBaseUrl(backendUrl);
      }

      // Listen for backend events
      void onBackendEvent('backend-error', (error) => {
        console.error('Backend error:', error);
      });

      void onBackendEvent('backend-terminated', () => {
        console.warn('Backend terminated unexpectedly');
      });
    } catch (error) {
      console.error('Failed to initialize Tauri:', error);
    }
  }

  // Render the app - BackendReadyProvider will handle waiting for backend
  renderApp();
}

void initApp();
