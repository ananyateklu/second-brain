import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotesWithRemindersProvider } from './contexts/NotesContext';
import { IdeasProvider } from './contexts/IdeasContext';
import { TasksProvider } from './contexts/TasksContext';
import { RemindersProvider } from './contexts/RemindersContext';
import { ActivityProvider } from './contexts/ActivityContext';
import { TrashProvider } from './contexts/TrashContext';
import { AIProvider } from './contexts/AIContext';
import { DashboardProvider } from './contexts/DashboardContext';
import { ModalProvider } from './contexts/ModalContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RecordingProvider } from './contexts/RecordingContext';
import { LoadingScreen } from './components/shared/LoadingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load components
const LoginPage = lazy(() => import('./components/LoginPage').then(module => ({ default: module.LoginPage })));
const RegistrationPage = lazy(() => import('./components/RegistrationPage').then(module => ({ default: module.RegistrationPage })));
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));

// Error logging function for the error boundary
const logError = (error: Error, errorInfo: React.ErrorInfo) => {
  console.error('Application error:', error);
  console.error('Component stack:', errorInfo.componentStack);

  // In a production app, you would send this to a logging service
  // e.g., Sentry, LogRocket, etc.
};

// Centralized context provider component to improve organization and performance
const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary onError={logError}>
    <ThemeProvider>
      <BrowserRouter future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </ErrorBoundary>
);

// Feature-specific providers that are only loaded when needed
const FeatureProviders = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary onError={logError}>
    <AIProvider>
      <RecordingProvider>
        <ActivityProvider>
          <ModalProvider>
            <TrashProvider>
              <RemindersProvider>
                <NotesWithRemindersProvider>
                  <TasksProvider>
                    <IdeasProvider>
                      <DashboardProvider>
                        {children}
                      </DashboardProvider>
                    </IdeasProvider>
                  </TasksProvider>
                </NotesWithRemindersProvider>
              </RemindersProvider>
            </TrashProvider>
          </ModalProvider>
        </ActivityProvider>
      </RecordingProvider>
    </AIProvider>
  </ErrorBoundary>
);

// Application routes component
const AppRoutes = () => (
  <Suspense fallback={<LoadingScreen message="Loading application..." />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegistrationPage />} />
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <FeatureProviders>
              <Dashboard />
            </FeatureProviders>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);

export const App = () => {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}