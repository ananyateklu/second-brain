import { useEffect, useState, lazy, Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './lib/router';
import {
  onNavigateToSettings,
  onShowAboutDialog,
  onCreateNewNote,
  onCreateNewChat,
  onOpenDocumentation,
  onOpenReportIssue
} from './lib/tauri-bridge';
import { useBoundStore } from './store/bound-store';
import { useIndexingRestoration } from './hooks/use-indexing-restoration';
import { useSummaryRestoration } from './hooks/use-summary-restoration';
import { useUserSettingsEffect } from './hooks/use-user-settings-effect';
import { isTauri } from './lib/native-notifications';

// Lazy load notification components - they're not needed immediately
const AboutModal = lazy(() => import('./components/ui/AboutModal').then(m => ({ default: m.AboutModal })));
const IndexingNotification = lazy(() => import('./components/ui/IndexingNotification').then(m => ({ default: m.IndexingNotification })));
const SummaryNotification = lazy(() => import('./components/ui/SummaryNotification').then(m => ({ default: m.SummaryNotification })));

function App() {
  const [showAboutModal, setShowAboutModal] = useState(false);
  const openCreateModal = useBoundStore((state) => state.openCreateModal);

  // Restore any active indexing jobs on app mount
  useIndexingRestoration();

  // Restore any active summary generation jobs on app mount
  useSummaryRestoration();

  // Apply user settings (fontSize, defaultNoteView, etc.) to the document
  useUserSettingsEffect();

  // Listen for macOS app menu events
  useEffect(() => {
    if (!isTauri()) return;

    const unsubscribers: (() => void)[] = [];

    const setupMenuListeners = async () => {
      // Navigate to settings (from tray or app menu)
      const unsubSettings = await onNavigateToSettings(() => {
        void router.navigate('/settings/general');
      });
      unsubscribers.push(unsubSettings);

      // Show About dialog
      const unsubAbout = await onShowAboutDialog(() => {
        setShowAboutModal(true);
      });
      unsubscribers.push(unsubAbout);

      // Create new note
      const unsubNewNote = await onCreateNewNote(() => {
        openCreateModal();
      });
      unsubscribers.push(unsubNewNote);

      // Create new chat
      const unsubNewChat = await onCreateNewChat(() => {
        void router.navigate('/chat');
      });
      unsubscribers.push(unsubNewChat);

      // Open documentation
      const unsubDocs = await onOpenDocumentation(() => {
        void (async () => {
          try {
            const { open } = await import('@tauri-apps/plugin-shell');
            await open('https://github.com/ananyateklu/second-brain#readme');
          } catch (e) {
            console.error('Failed to open documentation:', e);
            window.open('https://github.com/ananyateklu/second-brain#readme', '_blank');
          }
        })();
      });
      unsubscribers.push(unsubDocs);

      // Open report issue
      const unsubReport = await onOpenReportIssue(() => {
        void (async () => {
          try {
            const { open } = await import('@tauri-apps/plugin-shell');
            await open('https://github.com/ananyateklu/second-brain/issues/new');
          } catch (e) {
            console.error('Failed to open issue reporter:', e);
            window.open('https://github.com/ananyateklu/second-brain/issues/new', '_blank');
          }
        })();
      });
      unsubscribers.push(unsubReport);
    };

    void setupMenuListeners();

    return () => {
      unsubscribers.forEach(unsub => {
        unsub();
      });
    };
  }, [openCreateModal]);

  return (
    <>
      <RouterProvider router={router} />
      <Suspense fallback={null}>
        <AboutModal
          isOpen={showAboutModal}
          onClose={() => {
            setShowAboutModal(false);
          }}
        />
        <IndexingNotification />
        <SummaryNotification />
      </Suspense>
    </>
  );
}

export default App;
