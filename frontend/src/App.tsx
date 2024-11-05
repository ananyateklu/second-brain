import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotesProvider } from './contexts/NotesContext';
import { TasksProvider } from './contexts/TasksContext';
import { RemindersProvider } from './contexts/RemindersContext';
import { ActivityProvider } from './contexts/ActivityContext';
import { TrashProvider } from './contexts/TrashContext';
import { AIProvider } from './contexts/AIContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './components/LoginPage';
import { RegistrationPage } from './components/RegistrationPage';
import { Dashboard } from './components/Dashboard';
import { DashboardProvider } from './contexts/DashboardContext';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ActivityProvider>
          <TrashProvider>
            <NotesProvider>
              <TasksProvider>
                <DashboardProvider>
                  <BrowserRouter>
                    <Routes>
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegistrationPage />} />
                      <Route
                        path="/dashboard/*"
                        element={
                          <ProtectedRoute>
                            <RemindersProvider>
                              <AIProvider>
                                <Dashboard />
                              </AIProvider>
                            </RemindersProvider>
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </BrowserRouter>
                </DashboardProvider>
              </TasksProvider>
            </NotesProvider>
          </TrashProvider>
        </ActivityProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}