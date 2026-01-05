/**
 * Loading skeleton for IndexHealthCard.
 * Matches the structure of the actual card for smooth transitions.
 */
export function IndexHealthCardSkeleton() {
  return (
    <div
      className="relative p-4 rounded-2xl border overflow-hidden animate-pulse"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
        borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
      }}
    >
      <div className="space-y-3">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-20 rounded"
              style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 10%, transparent)' }}
            />
            <div
              className="h-4 w-16 rounded-full"
              style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)' }}
            />
          </div>
        </div>

        {/* Ring progress skeleton */}
        <div className="flex items-center gap-4">
          <div
            className="rounded-full"
            style={{
              width: 72,
              height: 72,
              backgroundColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
            }}
          />
          <div className="flex-1 space-y-2">
            <div
              className="h-7 w-20 rounded"
              style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 10%, transparent)' }}
            />
            <div
              className="h-3 w-24 rounded"
              style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}
            />
          </div>
        </div>

        {/* Metrics row skeleton */}
        <div className="grid grid-cols-4 gap-1.5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-2 rounded-xl"
              style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 5%, transparent)' }}
            >
              <div
                className="h-3 w-3 mx-auto rounded mb-1"
                style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)' }}
              />
              <div
                className="h-4 w-8 mx-auto rounded mb-1"
                style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 10%, transparent)' }}
              />
              <div
                className="h-2 w-12 mx-auto rounded"
                style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}
              />
            </div>
          ))}
        </div>

        {/* Storage and sparkline skeleton */}
        <div className="flex items-center justify-between gap-2">
          <div
            className="h-7 w-28 rounded-lg"
            style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}
          />
          <div
            className="h-5 w-24 rounded"
            style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}
          />
        </div>

        {/* Status footer skeleton */}
        <div
          className="h-9 w-full rounded-xl"
          style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}
        />
      </div>
    </div>
  );
}
