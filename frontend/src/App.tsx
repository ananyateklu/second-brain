import React from 'react';
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

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ActivityProvider>
          <TrashProvider>
            <NotesProvider>
              <TasksProvider>
                <RemindersProvider>
                  <AIProvider>
                    <BrowserRouter>
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
                    </BrowserRouter>
                  </AIProvider>
                </RemindersProvider>
              </TasksProvider>
            </NotesProvider>
          </TrashProvider>
        </ActivityProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}