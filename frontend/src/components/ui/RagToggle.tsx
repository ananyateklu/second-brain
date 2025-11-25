interface RagToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function RagToggle({ enabled, onChange, disabled = false }: RagToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          backgroundColor: enabled ? 'var(--color-brand-600)' : 'var(--border)',
        }}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${enabled ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
      
      <div className="flex flex-col">
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          RAG Mode
        </span>
      </div>
    </div>
  );
}

