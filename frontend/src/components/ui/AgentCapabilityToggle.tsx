interface AgentCapabilityToggleProps {
  capabilityId: string;
  displayName: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  color?: {
    enabledBg?: string;
    enabledText?: string;
    enabledBorder?: string;
    enabledDot?: string;
  };
}

export function AgentCapabilityToggle({
  displayName,
  enabled,
  onChange,
  disabled,
  icon,
  color,
}: AgentCapabilityToggleProps) {
  const enabledBg = color?.enabledBg || 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)';
  const enabledText = color?.enabledText || 'var(--color-brand-400)';
  const enabledBorder = color?.enabledBorder || 'var(--color-brand-500)';
  const enabledDot = color?.enabledDot || 'var(--color-brand-400)';

  return (
    <button
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
        transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}
      `}
      style={{
        backgroundColor: enabled
          ? enabledBg
          : 'color-mix(in srgb, var(--surface-card) 80%, transparent)',
        color: enabled
          ? enabledText
          : 'var(--text-secondary)',
        border: enabled
          ? `1px solid ${enabledBorder}`
          : '1px solid var(--border)',
        opacity: enabled ? 1 : 0.8,
      }}
      title={enabled ? `${displayName} tools enabled` : `Enable ${displayName} tools`}
    >
      {icon || (
        <svg
          className="w-3.5 h-3.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      )}
      <span>{displayName}</span>
      {enabled && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: enabledDot }}
        />
      )}
    </button>
  );
}
