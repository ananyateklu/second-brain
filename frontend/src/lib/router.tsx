import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
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
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <DashboardPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/notes',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <NotesPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/chat',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ChatPage />
        </AppLayout>
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
        <AppLayout>
          <GeneralSettings />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings/ai',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <AISettings />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings/rag',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <RAGSettings />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
