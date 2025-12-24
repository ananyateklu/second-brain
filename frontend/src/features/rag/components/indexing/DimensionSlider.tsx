import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui';
import type { DimensionSliderProps } from './types';
import { PINECONE_REQUIRED_DIMENSIONS } from './types';

/**
 * Custom dimension slider for models that support variable output dimensions.
 * Shows quick-select buttons for common dimension values.
 */
export function DimensionSlider({
  currentModelInfo,
  customDimensions,
  effectiveDimensions,
  handleDimensionChange,
  isDisabled,
}: DimensionSliderProps) {
  // Only render if model supports custom dimensions
  if (!currentModelInfo?.supportsCustomDimensions || !currentModelInfo.minDimensions || !currentModelInfo.maxDimensions) {
    return null;
  }

  const { minDimensions, maxDimensions, dimensions: defaultDimensions } = currentModelInfo;
  const currentValue = customDimensions ?? defaultDimensions;
  const isPineconeValue = effectiveDimensions === PINECONE_REQUIRED_DIMENSIONS;

  // Calculate position percentages for quick-select buttons
  const getPositionPercent = (value: number) => {
    return ((value - minDimensions) / (maxDimensions - minDimensions)) * 100;
  };

  return (
    <div className="mt-3 max-w-3xl">
      <div className="flex items-center justify-between mb-1.5">
        <label
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.2em]",
            isDisabled ? "text-[var(--text-muted)]" : "text-[var(--text-secondary)]"
          )}
        >
          Output Dimensions
        </label>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-mono px-2 py-0.5 rounded-lg border",
              isPineconeValue
                ? "bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] text-[var(--color-success)] border-[var(--color-success)]"
                : "bg-[var(--surface-elevated)] text-[var(--text-primary)] border-[var(--border)]"
            )}
          >
            {effectiveDimensions}d
          </span>
          {isPineconeValue && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-lg bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] text-[var(--color-success)]">
              Pinecone OK
            </span>
          )}
        </div>
      </div>

      {/* Slider with min/max labels */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] opacity-60 min-w-[32px]">
          {minDimensions}
        </span>
        <Slider
          value={[currentValue]}
          min={minDimensions}
          max={maxDimensions}
          step={256}
          onValueChange={(values) => handleDimensionChange(values[0])}
          disabled={isDisabled}
          className="flex-1"
        />
        <span className="text-[10px] opacity-60 min-w-[32px] text-right">
          {maxDimensions}
        </span>
      </div>

      {/* Value labels below slider - offset to align with slider track (32px label + 12px gap = 44px each side) */}
      <div className="relative h-5 mt-1 ml-[44px] mr-[44px]">
        {/* Current value indicator */}
        <span
          className="absolute text-[10px] font-mono px-1 py-0.5 rounded whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity"
          style={{
            left: `calc(${getPositionPercent(currentValue)}% + ${(50 - getPositionPercent(currentValue)) * 0.12}px)`,
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--surface-card)',
            color: 'var(--color-brand-600)',
          }}
          onClick={() => !isDisabled && handleDimensionChange(currentValue)}
        >
          {currentValue}d
        </span>

        {/* Pinecone OK indicator at 1536 position (only show if not at 1536) */}
        {currentValue !== PINECONE_REQUIRED_DIMENSIONS && (
          <button
            type="button"
            onClick={() => !isDisabled && handleDimensionChange(PINECONE_REQUIRED_DIMENSIONS)}
            disabled={isDisabled}
            className="absolute text-[10px] font-mono px-1 py-0.5 rounded whitespace-nowrap transition-opacity hover:opacity-100 disabled:opacity-30"
            style={{
              left: `calc(${getPositionPercent(PINECONE_REQUIRED_DIMENSIONS)}% + ${(50 - getPositionPercent(PINECONE_REQUIRED_DIMENSIONS)) * 0.12}px)`,
              transform: 'translateX(-50%)',
              backgroundColor: 'var(--surface-card)',
              color: 'var(--color-success)',
            }}
          >
            Pinecone:1536
          </button>
        )}
      </div>
    </div>
  );
}
