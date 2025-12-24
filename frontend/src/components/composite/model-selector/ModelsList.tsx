import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { formatModelName } from '@/utils/model-name-formatter';
import type { ModelsListProps } from './types';

/**
 * List of models grouped by category with keyboard navigation support.
 */
export function ModelsList({
  groupedModels,
  flatModelList,
  selectedModel,
  focusedIndex,
  onModelSelect,
  onModelHover,
  isBlueTheme,
}: ModelsListProps) {
  const selectedModelRef = useRef<HTMLButtonElement>(null);

  // Scroll to selected model when list opens
  useEffect(() => {
    if (selectedModelRef.current) {
      requestAnimationFrame(() => {
        selectedModelRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      });
    }
  }, [selectedModel]);

  if (groupedModels.length === 0) {
    return (
      <div
        className="px-4 py-8 text-center text-sm"
        style={{ color: 'var(--text-tertiary)' }}
      >
        No models available
      </div>
    );
  }

  return (
    <>
      {groupedModels.map((group) => (
        <div key={group.category}>
          {/* Category Header */}
          <div
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider sticky top-0"
            style={{
              backgroundColor: isBlueTheme
                ? 'rgba(10, 22, 40, 0.98)'
                : 'var(--surface-card-solid)',
              color: 'var(--text-secondary)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {group.displayName}
          </div>

          {/* Models */}
          {group.models.map((model) => {
            const flatIndex = flatModelList.findIndex(
              (item) => item.type === 'model' && item.value === model
            );
            const isSelected = model === selectedModel;
            const isFocused = focusedIndex === flatIndex;

            return (
              <button
                key={model}
                ref={isSelected ? selectedModelRef : null}
                type="button"
                onClick={() => onModelSelect(model)}
                onMouseEnter={() => onModelHover(flatIndex)}
                className={cn(
                  'w-full text-left px-4 py-2.5 transition-colors duration-150 text-sm',
                  isFocused && 'bg-[var(--surface-elevated)]'
                )}
                style={{
                  backgroundColor: isFocused
                    ? 'var(--surface-elevated)'
                    : 'transparent',
                  color: isSelected
                    ? 'var(--color-brand-400)'
                    : 'var(--text-primary)',
                }}
                role="option"
                aria-selected={isSelected}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">
                    {formatModelName(model)}
                  </span>
                  {isSelected && (
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      style={{ color: 'var(--color-brand-400)' }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </>
  );
}
