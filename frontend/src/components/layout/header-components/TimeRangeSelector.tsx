import { useBoundStore } from '../../../store/bound-store';

interface TimeRange {
  label: string;
  days: number | null;
}

const TIME_RANGES: TimeRange[] = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'All time', days: null },
];

/**
 * Time range selector for RAG Analytics page
 * Displays horizontal button group for selecting time period
 * Styled to match InsightsTabBar
 */
export const TimeRangeSelector = () => {
  const selectedTimeRange = useBoundStore((state) => state.selectedTimeRange);
  const setSelectedTimeRange = useBoundStore((state) => state.setSelectedTimeRange);

  return (
    <div className="w-full flex justify-center md:justify-start">
      <div
        className="flex items-center gap-1 p-1 my-1 rounded-xl backdrop-blur-md transition-shadow duration-300"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
          border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        {TIME_RANGES.map((range) => {
          const isActive = selectedTimeRange === range.days;
          return (
            <button
              key={range.label}
              onClick={() => { setSelectedTimeRange(range.days); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-all duration-200 relative"
              style={{
                backgroundColor: isActive ? 'var(--color-brand-600)' : undefined,
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 400,
                boxShadow: isActive ? '0 2px 8px color-mix(in srgb, var(--color-brand-600) 30%, transparent)' : undefined,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 6%, transparent)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {range.label}
              {/* Active indicator line */}
              {isActive && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--glass-popup)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export type { TimeRange };
