import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ToastProviderWithRef, ToastContainer } from './components/ui/Toast';
import { queryClient } from './lib/query-client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useThemeStore } from './store/theme-store';
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

initializeTheme();

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
