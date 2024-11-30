import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotesProvider } from './contexts/NotesContext';
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

// Lazy load components
const LoginPage = lazy(() => import('./components/LoginPage').then(module => ({ default: module.LoginPage })));
const RegistrationPage = lazy(() => import('./components/RegistrationPage').then(module => ({ default: module.RegistrationPage })));
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));

// Create a separate component for the authenticated routes
const AuthenticatedApp = () => {
  return (
    <AIProvider>
      <RecordingProvider>
        <ActivityProvider>
          <ModalProvider>
            <TrashProvider>
              <NotesProvider>
                <TasksProvider>
                  <RemindersProvider>
                    <DashboardProvider>
                      <Suspense fallback={<LoadingScreen message="Loading application..." />}>
                        <Routes>
                          <Route path="/login" element={<LoginPage />} />
                          <Route path="/register" element={<RegistrationPage />} />
                          <Route
                            path="/dashboard/*"
                            element={
                              <ProtectedRoute>
                                <Dashboard />
                              </ProtectedRoute>
                            }
                          />
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                      </Suspense>
                    </DashboardProvider>
                  </RemindersProvider>
                </TasksProvider>
              </NotesProvider>
            </TrashProvider>
          </ModalProvider>
        </ActivityProvider>
      </RecordingProvider>
    </AIProvider>
  );
}

export const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}