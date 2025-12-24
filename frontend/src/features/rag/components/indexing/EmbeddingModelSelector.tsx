import { cn } from '@/lib/utils';
import type { EmbeddingModelSelectorProps } from './types';

/**
 * Embedding model selection component with pill-style buttons.
 * Shows dimension info and compatibility badges for each model.
 */
export function EmbeddingModelSelector({
  availableModels,
  effectiveSelectedModel,
  handleModelChange,
  isDisabled,
  needsPinecone,
  isPineconeCompatible,
  currentModelInfo,
  effectiveDimensions,
}: EmbeddingModelSelectorProps) {
  if (availableModels.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.2em]",
            isDisabled ? "text-[var(--text-muted)]" : "text-[var(--text-secondary)]"
          )}
        >
          Embedding Model
        </label>
        {/* Dimension compatibility hint - inline */}
        {!isPineconeCompatible && currentModelInfo && (
          <span className="text-[10px] text-[var(--text-warning)]">
            · {currentModelInfo.displayName} ({effectiveDimensions}d) = PostgreSQL only
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {availableModels.map((model) => {
          const isActive = effectiveSelectedModel === model.modelId;
          const modelDisabled = isDisabled || (needsPinecone && !model.supportsPinecone);

          return (
            <button
              type="button"
              key={model.modelId}
              onClick={() => { if (!modelDisabled) handleModelChange(model.modelId); }}
              disabled={modelDisabled}
              title={model.description || `${model.displayName}: ${model.dimensions} dimensions`}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-brand-500)]",
                "disabled:cursor-not-allowed",
                isActive && [
                  "bg-[var(--color-brand-600)] border-[var(--color-brand-600)] text-[var(--color-brand-50)]",
                  "shadow-[0_10px_22px_color-mix(in_srgb,var(--color-brand-900)_30%,transparent)]",
                  "-translate-y-px"
                ],
                !isActive && !modelDisabled && [
                  "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--text-primary)]",
                  "shadow-[0_1px_3px_color-mix(in_srgb,var(--color-brand-950)_12%,transparent)]",
                  "hover:bg-[color-mix(in_srgb,var(--color-brand-600)_12%,var(--surface-elevated))]",
                  "hover:border-[color-mix(in_srgb,var(--color-brand-600)_60%,var(--border))]",
                  "hover:shadow-[0_4px_12px_color-mix(in_srgb,var(--color-brand-900)_18%,transparent)]",
                  "hover:-translate-y-[0.5px]"
                ],
                modelDisabled && !isDisabled && "opacity-50 line-through",
                isDisabled && "opacity-60"
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className="truncate max-w-[120px]">{model.displayName}</span>
                <span className="text-[10px] opacity-70 shrink-0 font-normal">
                  {model.dimensions}d
                </span>
                {model.supportsPinecone ? (
                  <span
                    className={cn(
                      "text-[9px] px-1 py-0.5 rounded shrink-0",
                      isActive
                        ? "bg-white/20 text-[var(--color-brand-50)]"
                        : "bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] text-[var(--color-success)]"
                    )}
                    title="Pinecone compatible"
                  >
                    P
                  </span>
                ) : (
                  <span
                    className={cn(
                      "text-[9px] px-1 py-0.5 rounded shrink-0",
                      isActive
                        ? "bg-white/20 text-[var(--color-brand-50)]"
                        : "bg-[color-mix(in_srgb,var(--text-warning)_15%,transparent)] text-[var(--text-warning)]"
                    )}
                    title="PostgreSQL only"
                  >
                    PG
                  </span>
                )}
                {model.isDefault && (
                  <span
                    className={cn(
                      "text-[9px] px-1 py-0.5 rounded shrink-0",
                      isActive
                        ? "bg-white/20 text-[var(--color-brand-50)]"
                        : "bg-[color-mix(in_srgb,var(--color-brand-500)_15%,transparent)] text-[var(--color-brand-500)]"
                    )}
                  >
                    *
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
