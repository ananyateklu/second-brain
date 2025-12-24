import { cn } from '@/lib/utils';
import type { VectorStoreSelectorProps } from './types';
import { PINECONE_REQUIRED_DIMENSIONS } from './types';

const VECTOR_STORES = ['PostgreSQL', 'Pinecone', 'Both'] as const;

/**
 * Vector store selection component with pill-style buttons.
 * Handles Pinecone compatibility warnings and disabled states.
 */
export function VectorStoreSelector({
  vectorStore,
  setVectorStore,
  isDisabled,
  isVectorStoreDisabled,
  isPineconeCompatible,
  currentModelInfo,
  effectiveSelectedModel,
  effectiveDimensions,
}: VectorStoreSelectorProps) {
  // Use effectiveDimensions in tooltip for more accurate info
  const dimInfo = effectiveDimensions || currentModelInfo?.dimensions || '?';
  return (
    <div className="flex-1 min-w-[200px]">
      <label
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.2em] mb-1.5 block",
          isDisabled ? "text-[var(--text-muted)]" : "text-[var(--text-secondary)]"
        )}
      >
        Vector Store
      </label>
      <div className="flex flex-wrap gap-2">
        {VECTOR_STORES.map((store) => {
          const isActive = vectorStore === store;
          const storeDisabled = isVectorStoreDisabled(store);
          const showPineconeWarning = (store === 'Pinecone' || store === 'Both') && !isPineconeCompatible;

          return (
            <div key={store} className="relative">
              <button
                type="button"
                onClick={() => { if (!storeDisabled) setVectorStore(store); }}
                disabled={storeDisabled}
                title={showPineconeWarning
                  ? `${currentModelInfo?.displayName ?? effectiveSelectedModel} (${dimInfo} dims) doesn't support Pinecone (requires ${PINECONE_REQUIRED_DIMENSIONS} dimensions)`
                  : undefined
                }
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-brand-500)]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  isActive && [
                    "bg-[var(--color-brand-600)] border-[var(--color-brand-600)] text-[var(--color-brand-50)]",
                    "shadow-[0_10px_22px_color-mix(in_srgb,var(--color-brand-900)_30%,transparent)]",
                    "-translate-y-px"
                  ],
                  !isActive && !showPineconeWarning && [
                    "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--text-primary)]",
                    "shadow-[0_1px_3px_color-mix(in_srgb,var(--color-brand-950)_12%,transparent)]",
                    "hover:bg-[color-mix(in_srgb,var(--color-brand-600)_12%,var(--surface-elevated))]",
                    "hover:border-[color-mix(in_srgb,var(--color-brand-600)_60%,var(--border))]",
                    "hover:shadow-[0_4px_12px_color-mix(in_srgb,var(--color-brand-900)_18%,transparent)]",
                    "hover:-translate-y-[0.5px]"
                  ],
                  showPineconeWarning && [
                    "bg-[var(--surface-base)] border-[var(--border)] text-[var(--text-muted)] line-through"
                  ]
                )}
              >
                <span className="flex items-center gap-1.5">
                  {showPineconeWarning && (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v5m4 0h-4" />
                    </svg>
                  )}
                  {store}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
