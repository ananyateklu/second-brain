import { AgentModeToggle } from './AgentModeToggle';
import { AgentCapabilityToggle } from './AgentCapabilityToggle';

interface Capability {
  id: string;
  displayName: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  icon?: React.ReactNode;
  color?: {
    enabledBg?: string;
    enabledText?: string;
    enabledBorder?: string;
    enabledDot?: string;
  };
}

interface AgentControlsGroupProps {
  agentEnabled: boolean;
  onAgentChange: (enabled: boolean) => void;
  agentRagEnabled: boolean;
  onAgentRagChange: (enabled: boolean) => void;
  capabilities: Capability[];
  disabled?: boolean;
}

// Search icon for Agent RAG toggle
const SearchIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

export function AgentControlsGroup({
  agentEnabled,
  onAgentChange,
  agentRagEnabled,
  onAgentRagChange,
  capabilities,
  disabled = false,
}: AgentControlsGroupProps) {
  return (
    <div className="flex-shrink-0 flex items-center gap-2">
      {/* Agent Toggle */}
      <AgentModeToggle
        enabled={agentEnabled}
        onChange={onAgentChange}
        disabled={disabled}
      />

      {/* Capabilities and Agent RAG - only show when agent is enabled */}
      {agentEnabled && (capabilities.length > 0 || true) && (
        <div className="flex items-center gap-1.5 relative pl-2">
          {/* Connecting line */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-px w-2"
            style={{
              backgroundColor: 'var(--border)',
              opacity: 0.5,
            }}
          />
          
          {/* Agent RAG toggle */}
          <AgentCapabilityToggle
            capabilityId="agent-rag"
            displayName="Auto Context"
            enabled={agentRagEnabled}
            onChange={onAgentRagChange}
            disabled={disabled}
            icon={<SearchIcon />}
            color={{
              enabledBg: 'var(--color-accent-blue-alpha)',
              enabledText: 'var(--color-accent-blue-text)',
              enabledBorder: 'var(--color-accent-blue-border)',
              enabledDot: 'var(--color-accent-blue-dot)',
            }}
          />
          
          {/* Capability toggles */}
          {capabilities.map((capability) => (
            <AgentCapabilityToggle
              key={capability.id}
              capabilityId={capability.id}
              displayName={capability.displayName}
              enabled={capability.enabled}
              onChange={capability.onChange}
              disabled={disabled}
              icon={capability.icon}
              color={capability.color}
            />
          ))}
        </div>
      )}
    </div>
  );
}

