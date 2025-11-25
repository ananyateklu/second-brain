interface AgentModeToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  showAsChild?: boolean;
}

export function AgentModeToggle({ enabled, onChange, disabled }: AgentModeToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
        transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}
      `}
      style={{
        backgroundColor: enabled
          ? 'color-mix(in srgb, var(--color-brand-500) 20%, transparent)'
          : 'var(--surface-card)',
        color: enabled
          ? 'var(--color-brand-400)'
          : 'var(--text-secondary)',
        border: enabled
          ? '1px solid var(--color-brand-500)'
          : '1px solid var(--border)',
        boxShadow: enabled ? 'var(--shadow-md)' : 'none',
      }}
      title={enabled ? 'Agent mode enabled - AI can use tools' : 'Enable agent mode'}
    >
      <svg
        className="w-4 h-4 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      <span>Agent</span>
      {enabled && (
        <span
          className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
          style={{ backgroundColor: 'var(--color-brand-400)' }}
        />
      )}
    </button>
  );
}
