import { useEffect, useState } from 'react';
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
import { useUIStore } from './store/ui-store';
import { AboutModal } from './components/ui/AboutModal';
import { IndexingNotification } from './components/ui/IndexingNotification';
import { useIndexingRestoration } from './hooks/use-indexing-restoration';
import { isTauri } from './lib/native-notifications';

function App() {
  const [showAboutModal, setShowAboutModal] = useState(false);
  const openCreateModal = useUIStore((state) => state.openCreateModal);

  // Restore any active indexing jobs on app mount
  useIndexingRestoration();

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
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => {
          setShowAboutModal(false);
        }}
      />
      <IndexingNotification />
    </>
  );
}

export default App;
