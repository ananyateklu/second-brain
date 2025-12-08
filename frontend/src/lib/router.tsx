import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PageLoader } from './PageLoader';
import { queryClient } from './query-client';
import { noteKeys, conversationKeys, statsKeys } from './query-keys';
import { notesService, chatService, statsService } from '../services';
import { CACHE } from './constants';

// Lazy load heavy pages to reduce initial bundle size
const DashboardPage = lazy(() => import('../pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const NotesPage = lazy(() => import('../pages/NotesPage').then(m => ({ default: m.NotesPage })));
const NotesDirectoryPage = lazy(() => import('../pages/NotesDirectoryPage').then(m => ({ default: m.NotesDirectoryPage })));
const ChatPage = lazy(() => import('../pages/ChatPage').then(m => ({ default: m.ChatPage })));
const RagAnalyticsPage = lazy(() => import('../pages/RagAnalyticsPage').then(m => ({ default: m.RagAnalyticsPage })));

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
    loader: async () => {
      // Prefetch dashboard data while route loads
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: statsKeys.ai(),
          queryFn: () => statsService.getAIStats(),
          staleTime: CACHE.STALE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: noteKeys.all,
          queryFn: () => notesService.getAll(),
          staleTime: CACHE.STALE_TIME,
        }),
      ]);
      return null;
    },
    hydrateFallbackElement: <PageLoader />,
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
    loader: async () => {
      // Prefetch notes while route loads for instant display
      await queryClient.prefetchQuery({
        queryKey: noteKeys.all,
        queryFn: () => notesService.getAll(),
        staleTime: CACHE.STALE_TIME,
      });
      return null;
    },
    hydrateFallbackElement: <PageLoader />,
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
    path: '/directory',
    element: (
      <ProtectedRoute>
        <ErrorBoundary>
          <AppLayout>
            <Suspense fallback={<PageLoader />}>
              <NotesDirectoryPage />
            </Suspense>
          </AppLayout>
        </ErrorBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/chat',
    loader: async () => {
      // Prefetch conversations list while route loads
      await queryClient.prefetchQuery({
        queryKey: conversationKeys.all,
        queryFn: () => chatService.getConversations(),
        staleTime: CACHE.STALE_TIME,
      });
      return null;
    },
    hydrateFallbackElement: <PageLoader />,
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
    path: '/analytics',
    element: (
      <ProtectedRoute>
        <ErrorBoundary>
          <AppLayout>
            <Suspense fallback={<PageLoader />}>
              <RagAnalyticsPage />
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
