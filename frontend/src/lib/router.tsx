import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NotesPage } from '../pages/NotesPage';
import { ChatPage } from '../pages/ChatPage';
import { GeneralSettings } from '../pages/settings/GeneralSettings';
import { AISettings } from '../pages/settings/AISettings';
import { RAGSettings } from '../pages/settings/RAGSettings';
import { NotFoundPage } from '../pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <ErrorBoundary>
        <LoginPage />
      </ErrorBoundary>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <ErrorBoundary>
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        </ErrorBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/notes',
    element: (
      <ProtectedRoute>
        <ErrorBoundary>
          <AppLayout>
            <NotesPage />
          </AppLayout>
        </ErrorBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/chat',
    element: (
      <ProtectedRoute>
        <ErrorBoundary>
          <AppLayout>
            <ChatPage />
          </AppLayout>
        </ErrorBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: <Navigate to="/settings/general" replace />,
  },
  {
    path: '/settings/general',
    element: (
      <ProtectedRoute>
        <ErrorBoundary>
          <AppLayout>
            <GeneralSettings />
          </AppLayout>
        </ErrorBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings/ai',
    element: (
      <ProtectedRoute>
        <ErrorBoundary>
          <AppLayout>
            <AISettings />
          </AppLayout>
        </ErrorBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings/rag',
    element: (
      <ProtectedRoute>
        <ErrorBoundary>
          <AppLayout>
            <RAGSettings />
          </AppLayout>
        </ErrorBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
