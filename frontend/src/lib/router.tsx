import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PageLoader } from './PageLoader';

// Lazy load heavy pages to reduce initial bundle size
const DashboardPage = lazy(() => import('../pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const NotesPage = lazy(() => import('../pages/NotesPage').then(m => ({ default: m.NotesPage })));
const ChatPage = lazy(() => import('../pages/ChatPage').then(m => ({ default: m.ChatPage })));

// Lazy load settings pages (not frequently visited)
const GeneralSettings = lazy(() => import('../pages/settings/GeneralSettings').then(m => ({ default: m.GeneralSettings })));
const AISettings = lazy(() => import('../pages/settings/AISettings').then(m => ({ default: m.AISettings })));
const RAGSettings = lazy(() => import('../pages/settings/RAGSettings').then(m => ({ default: m.RAGSettings })));

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
            <Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </Suspense>
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
            <Suspense fallback={<PageLoader />}>
              <NotesPage />
            </Suspense>
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
            <Suspense fallback={<PageLoader />}>
              <ChatPage />
            </Suspense>
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
            <Suspense fallback={<PageLoader />}>
              <GeneralSettings />
            </Suspense>
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
            <Suspense fallback={<PageLoader />}>
              <AISettings />
            </Suspense>
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
            <Suspense fallback={<PageLoader />}>
              <RAGSettings />
            </Suspense>
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
