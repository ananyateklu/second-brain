import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, createHashRouter, Navigate } from 'react-router-dom';
import { useBoundStore } from '../store/bound-store';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PageLoader } from './PageLoader';

// Lazy load login page - users only see it once per session
const LoginPage = lazy(() => import('../pages/LoginPage').then(m => ({ default: m.LoginPage })));

// Lazy load skeleton components - they're only needed during route transitions
const DashboardSkeleton = lazy(() => import('../features/dashboard/components/DashboardSkeleton').then(m => ({ default: m.DashboardSkeleton })));
const NotesSkeleton = lazy(() => import('../features/notes/components/NotesSkeleton').then(m => ({ default: m.NotesSkeleton })));
const DirectorySkeleton = lazy(() => import('../features/notes/components/DirectorySkeleton').then(m => ({ default: m.DirectorySkeleton })));
const ChatSkeleton = lazy(() => import('../components/skeletons').then(m => ({ default: m.ChatSkeleton })));
const RagAnalyticsSkeleton = lazy(() => import('../features/rag/components/RagAnalyticsSkeleton').then(m => ({ default: m.RagAnalyticsSkeleton })));
const GitHubPageSkeleton = lazy(() => import('../features/github/components/GitHubPageSkeleton').then(m => ({ default: m.GitHubPageSkeleton })));
const GeneralSettingsSkeleton = lazy(() => import('../pages/settings/components').then(m => ({ default: m.GeneralSettingsSkeleton })));
const AISettingsSkeleton = lazy(() => import('../pages/settings/components').then(m => ({ default: m.AISettingsSkeleton })));
const RAGSettingsSkeleton = lazy(() => import('../pages/settings/components').then(m => ({ default: m.RAGSettingsSkeleton })));
const IndexingSettingsSkeleton = lazy(() => import('../pages/settings/components').then(m => ({ default: m.IndexingSettingsSkeleton })));
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

// Git redirect component - redirects /git to /github with local-changes tab
function GitRedirect() {
  const setGitHubActiveTab = useBoundStore((state) => state.setGitHubActiveTab);

  useEffect(() => {
    setGitHubActiveTab('local-changes');
  }, [setGitHubActiveTab]);

  return <Navigate to="/github" replace />;
}

// Lazy load GitHub page
const GitHubPage = lazy(() => import('../pages/GitHubPage').then(m => ({ default: m.GitHubPage })));

// Route definitions (shared between browser and hash routers)
const routes = [
  {
    path: '/login',
    element: (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <LoginPage />
        </Suspense>
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
            <Suspense fallback={<DashboardSkeleton />}>
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
            <Suspense fallback={<NotesSkeleton />}>
              <NotesPage />
            </Suspense>
          </AppLayout>
        </ErrorBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/directory',
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
            <Suspense fallback={<DirectorySkeleton />}>
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
            <Suspense fallback={<ChatSkeleton />}>
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
            <Suspense fallback={<RagAnalyticsSkeleton />}>
              <RagAnalyticsPage />
            </Suspense>
          </AppLayout>
        </ErrorBoundary>
      </ProtectedRoute>
    ),
  },
  {
    path: '/git',
    element: <GitRedirect />,
  },
  {
    path: '/github',
    element: (
      <ProtectedRoute>
        <ErrorBoundary>
          <AppLayout>
            <Suspense fallback={<GitHubPageSkeleton />}>
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
            <Suspense fallback={<GeneralSettingsSkeleton />}>
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
            <Suspense fallback={<AISettingsSkeleton />}>
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
            <Suspense fallback={<RAGSettingsSkeleton />}>
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
            <Suspense fallback={<IndexingSettingsSkeleton />}>
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
