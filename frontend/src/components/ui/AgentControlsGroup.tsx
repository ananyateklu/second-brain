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
  capabilities: Capability[];
  disabled?: boolean;
}

export function AgentControlsGroup({
  agentEnabled,
  onAgentChange,
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

      {/* Capabilities - only show when agent is enabled */}
      {agentEnabled && capabilities.length > 0 && (
        <div className="flex items-center gap-1.5 relative pl-2">
          {/* Connecting line */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-px w-2"
            style={{
              backgroundColor: 'var(--border)',
              opacity: 0.5,
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

