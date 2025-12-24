import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useApiKey } from './hooks/use-api-key';
import type { ApiKeyModalProps } from './types';

/**
 * Modal for generating/regenerating API keys.
 * Uses shadcn Dialog primitive and CSS hover classes.
 */
export function ApiKeyModal({ isOpen, onClose, user, onApiKeyGenerated }: ApiKeyModalProps) {
  const { isGenerating, newApiKey, generateApiKey, copyApiKey, resetNewApiKey } = useApiKey();

  const handleClose = () => {
    if (newApiKey) {
      // Reload user data to get updated API key
      window.location.reload();
    }
    resetNewApiKey();
    onClose();
  };

  const handleGenerate = async () => {
    await generateApiKey();
    onApiKeyGenerated?.();
  };

  const hasExistingKey = Boolean(user.apiKey);
  const title = hasExistingKey ? 'Regenerate API Key' : 'Generate API Key';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="rounded-t-3xl">
          <DialogTitle
            icon={
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            }
          >
            {title}
          </DialogTitle>
          {!newApiKey && (
            <DialogDescription>
              {hasExistingKey
                ? 'This will invalidate your current API key.'
                : 'Generate an API key to import notes from iOS Shortcuts or other external tools.'}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="p-6">
          {!newApiKey ? (
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => void handleGenerate()}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  'Generate'
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Success message */}
              <div
                className={cn(
                  'p-4 rounded-xl mb-6 border flex items-start gap-3',
                  'bg-[color-mix(in_srgb,var(--color-brand-600)_8%,transparent)]',
                  'border-[color-mix(in_srgb,var(--color-brand-600)_20%,transparent)]'
                )}
              >
                <svg
                  className="h-5 w-5 flex-shrink-0 mt-0.5 text-[var(--color-brand-600)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm leading-relaxed text-[var(--text-primary)]">
                  Your new API key has been generated. Copy it now - you won't be able to see it again.
                </p>
              </div>

              {/* API Key display */}
              <div
                className={cn(
                  'p-4 rounded-xl mb-6 border relative group',
                  'bg-[var(--surface-elevated)] border-[var(--border)]'
                )}
              >
                <code className="text-sm font-mono break-all block text-[var(--text-primary)]">
                  {newApiKey}
                </code>
                <button
                  onClick={() => copyApiKey(newApiKey)}
                  className={cn(
                    'absolute top-2 right-2 p-1.5 rounded-lg transition-opacity',
                    'opacity-0 group-hover:opacity-100',
                    'text-[var(--color-brand-600)]',
                    'bg-[color-mix(in_srgb,var(--color-brand-600)_10%,transparent)]',
                    'hover:bg-[color-mix(in_srgb,var(--color-brand-600)_20%,transparent)]'
                  )}
                  aria-label="Copy API key"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1 gap-2"
                  onClick={() => copyApiKey(newApiKey)}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy Key
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleClose}
                >
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
