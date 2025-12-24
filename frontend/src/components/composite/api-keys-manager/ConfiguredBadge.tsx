/**
 * "Configured" badge component.
 * Uses CSS variable instead of hard-coded color.
 */
export function ConfiguredBadge() {
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
        color: 'var(--color-success)',
      }}
    >
      Configured
    </span>
  );
}
