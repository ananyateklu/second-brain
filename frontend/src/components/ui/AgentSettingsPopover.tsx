import { ReactNode } from 'react';

interface AgentCapability {
  id: string;
  displayName: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  icon?: ReactNode;
  description?: string;
}

interface AgentSettingsPopoverProps {
  /** Whether Agent mode is enabled */
  agentEnabled: boolean;
  /** Called when Agent mode is toggled */
  onAgentToggle: (enabled: boolean) => void;
  /** Agent capabilities (e.g., Notes management) */
  capabilities: AgentCapability[];
  /** Whether the controls are disabled */
  disabled?: boolean;
}

export function AgentSettingsPopover({
  agentEnabled,
  onAgentToggle,
  capabilities,
  disabled = false,
}: AgentSettingsPopoverProps) {
  return (
    <div className="space-y-3">
      {/* Agent Enable Toggle */}
      <div
        className="flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all duration-200"
        style={{
          backgroundColor: agentEnabled
            ? 'color-mix(in srgb, var(--color-brand-500) 10%, var(--surface))'
            : 'var(--surface)',
          borderColor: agentEnabled ? 'var(--color-brand-500)' : 'var(--border)',
        }}
      >
        <div className="flex items-center gap-2.5 flex-1">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: agentEnabled
                ? 'color-mix(in srgb, var(--color-brand-500) 20%, transparent)'
                : 'var(--surface-elevated)',
              color: agentEnabled ? 'var(--color-brand-400)' : 'var(--text-tertiary)',
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <div
              className="text-xs font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Enable Agent
            </div>
            <div
              className="text-[10px] mt-0.5"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Use tools and take actions
            </div>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={agentEnabled}
          disabled={disabled}
          onClick={() => { onAgentToggle(!agentEnabled); }}
          className={`
            relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 flex-shrink-0
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
          `}
          style={{
            backgroundColor: agentEnabled ? 'var(--color-brand-500)' : 'var(--border)',
            boxShadow: agentEnabled ? '0 0 12px -2px var(--color-brand-500)' : 'none',
          }}
        >
          <span
            className={`
              inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 shadow-sm
              ${agentEnabled ? 'translate-x-[18px]' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* Agent Capabilities - Only show when Agent is enabled */}
      {agentEnabled && capabilities.length > 0 && (
        <div className="space-y-1.5">
          <div
            className="text-[10px] font-semibold uppercase tracking-wider px-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Capabilities
          </div>

          {/* Capabilities */}
          {capabilities.map((capability) => (
            <div
              key={capability.id}
              className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl border transition-all duration-200"
              style={{
                backgroundColor: capability.enabled
                  ? 'color-mix(in srgb, var(--color-notes) 10%, var(--surface))'
                  : 'var(--surface)',
                borderColor: capability.enabled ? 'var(--color-notes-border)' : 'var(--border)',
              }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: capability.enabled
                      ? 'color-mix(in srgb, var(--color-notes) 20%, transparent)'
                      : 'var(--surface-elevated)',
                    color: capability.enabled
                      ? 'var(--color-notes-text)'
                      : 'var(--text-tertiary)',
                  }}
                >
                  {capability.icon || (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <div
                    className="text-xs font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {capability.displayName}
                  </div>
                  {capability.description && (
                    <div
                      className="text-[10px]"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {capability.description}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={capability.enabled}
                disabled={disabled}
                onClick={() => { capability.onChange(!capability.enabled); }}
                className={`
                  relative inline-flex h-4.5 w-8 items-center rounded-full transition-all duration-200 flex-shrink-0
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                style={{
                  backgroundColor: capability.enabled ? 'var(--color-notes)' : 'var(--border)',
                  boxShadow: capability.enabled ? '0 0 8px -2px var(--color-notes)' : 'none',
                }}
              >
                <span
                  className={`
                    inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 shadow-sm
                    ${capability.enabled ? 'translate-x-[16px]' : 'translate-x-0.5'}
                  `}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

