/**
 * Loading skeleton for stats cards.
 */
export function StatsCardSkeleton() {
  return (
    <div
      className="p-3 rounded-2xl border animate-pulse"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
        borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className="h-3.5 rounded w-1/3"
          style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)' }}
        />
        <div
          className="h-4 rounded w-16"
          style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)' }}
        />
      </div>
      <div className="grid grid-cols-4 gap-2 mb-2">
        {[1, 2, 3, 4].map((j) => (
          <div
            key={j}
            className="p-2 rounded-xl"
            style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)', opacity: 0.3 }}
          >
            <div
              className="h-2.5 rounded w-2/3 mb-1"
              style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}
            />
            <div
              className="h-4 rounded w-1/2"
              style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 3%, transparent)' }}
            />
          </div>
        ))}
      </div>
      <div
        className="pt-2 border-t grid grid-cols-3 gap-1"
        style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}
      >
        {[1, 2, 3].map((k) => (
          <div key={k} className="text-center">
            <div
              className="h-2 rounded w-2/3 mx-auto mb-0.5"
              style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)' }}
            />
            <div
              className="h-3 rounded w-1/2 mx-auto"
              style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
