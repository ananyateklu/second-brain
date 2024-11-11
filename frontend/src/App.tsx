import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { LoginPage } from './components/LoginPage';
import { RegistrationPage } from './components/RegistrationPage';
import { Dashboard } from './components/Dashboard';

// Create a separate component for the authenticated routes
function AuthenticatedApp() {
  return (
    <ActivityProvider>
      <ModalProvider>
        <TrashProvider>
          <NotesProvider>
            <TasksProvider>
              <RemindersProvider>
                <AIProvider>
                  <DashboardProvider>
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
                  </DashboardProvider>
                </AIProvider>
              </RemindersProvider>
            </TasksProvider>
          </NotesProvider>
        </TrashProvider>
      </ModalProvider>
    </ActivityProvider>
  );
}

export function App() {
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