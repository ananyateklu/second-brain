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
 */
export const TimeRangeSelector = () => {
  const selectedTimeRange = useBoundStore((state) => state.selectedTimeRange);
  const setSelectedTimeRange = useBoundStore((state) => state.setSelectedTimeRange);

  return (
    <div className="w-full">
      <div
        className="flex items-center p-1 rounded-xl backdrop-blur-md w-fit"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
        }}
      >
        {TIME_RANGES.map((range) => (
          <button
            key={range.label}
            onClick={() => { setSelectedTimeRange(range.days); }}
            className="px-4 py-2 text-sm rounded-xl transition-all duration-200"
            style={{
              backgroundColor: selectedTimeRange === range.days
                ? 'var(--surface-card)'
                : 'transparent',
              color: selectedTimeRange === range.days
                ? 'var(--text-primary)'
                : 'var(--text-tertiary)',
              fontWeight: selectedTimeRange === range.days ? 600 : 400,
              boxShadow: selectedTimeRange === range.days
                ? 'var(--shadow-sm)'
                : 'none',
            }}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export type { TimeRange };
