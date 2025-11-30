/**
 * Page Loader Component
 * Loading fallback for lazy-loaded pages
 */

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--btn-primary-bg)]" />
    </div>
  );
}

