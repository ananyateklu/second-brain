import { cn } from '@/lib/utils';
import type { EmbeddingProviderSelectorProps } from './types';

/**
 * Embedding provider selection component with pill-style buttons.
 * Shows compatibility badges for each provider.
 */
export function EmbeddingProviderSelector({
  providers,
  effectiveProvider,
  handleProviderChange,
  isDisabled,
}: EmbeddingProviderSelectorProps) {
  return (
    <div className="flex-1 min-w-[200px]">
      <label
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.2em] mb-1.5 block",
          isDisabled ? "text-[var(--text-muted)]" : "text-[var(--text-secondary)]"
        )}
      >
        Embedding Provider
      </label>
      <div className="flex flex-wrap gap-2">
        {providers?.filter(p => p.isEnabled).map((provider) => {
          const isActive = effectiveProvider === provider.name;
          // Check if this provider has any Pinecone-compatible models
          const hasCompatibleModels = provider.availableModels.some(m => m.supportsPinecone);

          return (
            <button
              type="button"
              key={provider.name}
              onClick={() => { if (!isDisabled) handleProviderChange(provider.name); }}
              disabled={isDisabled}
              title={`${provider.name}: ${provider.availableModels.length} model(s) available`}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-brand-500)]",
                "disabled:cursor-not-allowed disabled:opacity-60",
                isActive && [
                  "bg-[var(--color-brand-600)] border-[var(--color-brand-600)] text-[var(--color-brand-50)]",
                  "shadow-[0_10px_22px_color-mix(in_srgb,var(--color-brand-900)_30%,transparent)]",
                  "-translate-y-px"
                ],
                !isActive && [
                  "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--text-primary)]",
                  "shadow-[0_1px_3px_color-mix(in_srgb,var(--color-brand-950)_12%,transparent)]",
                  "hover:bg-[color-mix(in_srgb,var(--color-brand-600)_12%,var(--surface-elevated))]",
                  "hover:border-[color-mix(in_srgb,var(--color-brand-600)_60%,var(--border))]",
                  "hover:shadow-[0_4px_12px_color-mix(in_srgb,var(--color-brand-900)_18%,transparent)]",
                  "hover:-translate-y-[0.5px]"
                ]
              )}
            >
              <span className="flex items-center gap-1.5">
                {provider.name}
                {hasCompatibleModels ? (
                  <span
                    className={cn(
                      "text-[9px] px-1 py-0.5 rounded-lg",
                      isActive
                        ? "bg-white/20 text-[var(--color-brand-50)]"
                        : "bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] text-[var(--color-success)]"
                    )}
                    title="Has Pinecone-compatible models"
                  >
                    P+PG
                  </span>
                ) : (
                  <span
                    className={cn(
                      "text-[9px] px-1 py-0.5 rounded-lg",
                      isActive
                        ? "bg-white/20 text-[var(--color-brand-50)]"
                        : "bg-[color-mix(in_srgb,var(--text-warning)_15%,transparent)] text-[var(--text-warning)]"
                    )}
                    title="PostgreSQL only"
                  >
                    PG
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
