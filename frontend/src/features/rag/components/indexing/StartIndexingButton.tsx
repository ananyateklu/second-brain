import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import type { StartIndexingButtonProps } from './types';

/**
 * Spinner component for loading states
 */
function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Start indexing button with loading states and model info display.
 */
export function StartIndexingButton({
  isDisabled,
  isRestoring,
  isStartingIndexing,
  isSelectedStoreIndexing,
  vectorStore,
  currentModelInfo,
  effectiveDimensions,
  handleStartIndexing,
}: StartIndexingButtonProps) {
  const getButtonContent = () => {
    if (isRestoring) {
      return (
        <>
          <LoadingSpinner />
          Checking...
        </>
      );
    }

    if (isStartingIndexing) {
      return (
        <>
          <LoadingSpinner />
          Starting...
        </>
      );
    }

    if (isSelectedStoreIndexing) {
      return (
        <>
          <LoadingSpinner />
          {vectorStore} Indexing...
        </>
      );
    }

    const modelLabel = currentModelInfo
      ? `(${currentModelInfo.displayName}${currentModelInfo.supportsCustomDimensions ? ` @ ${effectiveDimensions}d` : ''})`
      : '';

    return <>Start Indexing {modelLabel}</>;
  };

  return (
    <Button
      onClick={() => { void handleStartIndexing(); }}
      disabled={isDisabled}
      variant="primary"
      size="md"
      className={cn(
        "whitespace-nowrap",
        isDisabled && "bg-[var(--border)] text-[var(--text-secondary)] border-[var(--border)]"
      )}
    >
      {getButtonContent()}
    </Button>
  );
}
