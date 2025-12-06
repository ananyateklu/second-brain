import { AppLoadingScreen } from '../components/ui/AppLoadingScreen';

/**
 * Page Loader Component
 * Loading fallback for lazy-loaded pages
 */
export function PageLoader() {
  return (
    <AppLoadingScreen
      message="Loading page..."
      showLogo={true}
    />
  );
}
