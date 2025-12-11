import { lazy, Suspense } from 'react';
import { createBrowserRouter, createHashRouter, Navigate } from 'react-router-dom';
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

// Check if we're running in Tauri production mode
// In development, Tauri uses the Vite dev server which supports browser routing
// In production, Tauri uses a custom protocol that requires hash routing
const isTauriProduction = '__TAURI_INTERNALS__' in window && import.meta.env.PROD;

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
const IndexingSettings = lazy(() => import('../pages/settings/IndexingSettings').then(m => ({ default: m.IndexingSettings })));

// Lazy load Git page
const GitPage = lazy(() => import('../pages/GitPage').then(m => ({ default: m.GitPage })));

// Lazy load GitHub page
const GitHubPage = lazy(() => import('../pages/GitHubPage').then(m => ({ default: m.GitHubPage })));

// Route definitions (shared between browser and hash routers)
const routes = [
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
    path: '/git',
    element: (
      <ProtectedRoute>
        <ErrorBoundary>
          <AppLayout>
            <Suspense fallback={<PageLoader />}>
              <GitPage />
            </Suspense>
          </AppLayout>
        </ErrorBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/github',
    element: (
      <ProtectedRoute>
        <ErrorBoundary>
          <AppLayout>
            <Suspense fallback={<PageLoader />}>
              <GitHubPage />
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
    path: '/settings/indexing',
    element: (
      <ProtectedRoute>
        <ErrorBoundary>
          <AppLayout>
            <Suspense fallback={<PageLoader />}>
              <IndexingSettings />
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
];

// Use hash router for Tauri production builds, browser router otherwise
// Hash router uses URL fragments (e.g., /#/notes) which work with custom protocols
export const router = isTauriProduction
  ? createHashRouter(routes)
  : createBrowserRouter(routes);
