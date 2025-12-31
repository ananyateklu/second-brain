/**
 * Notice component for features that are only available in the desktop (Tauri) app
 */

interface WebDisabledNoticeProps {
  /** Icon to display */
  icon: React.ReactNode;
  /** Section title */
  title: string;
  /** Section description */
  description: string;
  /** Reason why this feature is desktop-only */
  reason: string;
}

export function WebDisabledNotice({ icon, title, description, reason }: WebDisabledNoticeProps) {
  return (
    <section
      className="rounded-3xl border p-4 opacity-60"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--text-secondary) 12%, transparent)',
            borderColor: 'color-mix(in srgb, var(--text-secondary) 30%, transparent)',
          }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] uppercase tracking-wider leading-none whitespace-nowrap"
              style={{ color: 'var(--text-secondary)' }}
            >
              Desktop Only
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              |
            </span>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h3>
          </div>
          <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
          <div
            className="text-xs px-3 py-2 rounded-xl"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            <span className="font-medium">Why?</span> {reason}
          </div>
        </div>
      </div>
    </section>
  );
}
