/**
 * VoiceAgentSettingsPopover Component
 * Popover content for voice agent capabilities settings
 * Used with FeatureModePill for the Agent toggle in the header
 */

import { GlobeAltIcon } from '@heroicons/react/24/outline';
import type { VoiceProviderType } from '../types/voice-types';

interface VoiceAgentSettingsPopoverProps {
  voiceProviderType: VoiceProviderType;
  agentEnabled: boolean;
  onAgentModeChange: (enabled: boolean) => void;
  capabilities: string[];
  onCapabilityToggle: (capability: string) => void;
  // RAG settings
  voiceRagEnabled?: boolean;
  onVoiceRagChange?: (enabled: boolean) => void;
  // Grok search options (only for GrokVoice mode)
  enableGrokWebSearch?: boolean;
  enableGrokXSearch?: boolean;
  onGrokWebSearchChange?: (enabled: boolean) => void;
  onGrokXSearchChange?: (enabled: boolean) => void;
  disabled?: boolean;
}

export function VoiceAgentSettingsPopover({
  voiceProviderType,
  agentEnabled,
  onAgentModeChange,
  capabilities,
  onCapabilityToggle,
  voiceRagEnabled = true,
  onVoiceRagChange,
  enableGrokWebSearch = true,
  enableGrokXSearch = true,
  onGrokWebSearchChange,
  onGrokXSearchChange,
  disabled = false,
}: VoiceAgentSettingsPopoverProps) {
  const isGrokMode = voiceProviderType === 'GrokVoice';

  return (
    <div className="space-y-4">
      {/* Agent Mode Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {isGrokMode ? 'Enable App Functions' : 'Enable Agent Tools'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {isGrokMode
              ? 'Allow Grok Voice to use notes functions'
              : 'Allow voice to use tools like notes & web search'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onAgentModeChange(!agentEnabled)}
          disabled={disabled}
          className="relative w-11 h-6 rounded-full transition-colors"
          style={{
            backgroundColor: agentEnabled ? 'var(--btn-primary-bg)' : 'var(--surface-elevated)',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          aria-pressed={agentEnabled}
        >
          <span
            className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform"
            style={{
              transform: agentEnabled ? 'translateX(20px)' : 'translateX(0)',
            }}
          />
        </button>
      </div>

      {/* Capability Toggles (when agent is enabled) */}
      {agentEnabled && (
        <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          {/* Notes CRUD Capability */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={capabilities.includes('notes-crud')}
              onChange={() => onCapabilityToggle('notes-crud')}
              disabled={disabled}
              className="w-4 h-4 rounded"
              style={{
                accentColor: 'var(--color-brand-500)',
                borderColor: 'var(--border)',
              }}
            />
            <div className="flex-1">
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Notes CRUD</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Create, read, update, delete notes
              </p>
            </div>
          </label>

          {/* Notes Search Capability */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={capabilities.includes('notes-search')}
              onChange={() => onCapabilityToggle('notes-search')}
              disabled={disabled}
              className="w-4 h-4 rounded"
              style={{
                accentColor: 'var(--color-brand-500)',
                borderColor: 'var(--border)',
              }}
            />
            <div className="flex-1">
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Notes Search</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Semantic & keyword search
              </p>
            </div>
          </label>

          {/* Web Search Capability - Only for Standard mode */}
          {!isGrokMode && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={capabilities.includes('web')}
                onChange={() => onCapabilityToggle('web')}
                disabled={disabled}
                className="w-4 h-4 rounded"
                style={{
                  accentColor: 'var(--color-brand-500)',
                  borderColor: 'var(--border)',
                }}
              />
              <div className="flex-1">
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Web Search</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Live and deep web search
                </p>
              </div>
            </label>
          )}

          {/* RAG Toggle - Knowledge Search */}
          <label className="flex items-center gap-3 cursor-pointer pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <input
              type="checkbox"
              checked={voiceRagEnabled}
              onChange={(e) => onVoiceRagChange?.(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 rounded"
              style={{
                accentColor: 'var(--color-brand-500)',
                borderColor: 'var(--border)',
              }}
            />
            <div className="flex-1">
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Knowledge Search (RAG)</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Search your notes for context
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Grok Built-in Search (for GrokVoice mode only) */}
      {isGrokMode && (
        <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <GlobeAltIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Built-in Search
            </span>
          </div>

          {/* Web Search Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableGrokWebSearch}
              onChange={(e) => onGrokWebSearchChange?.(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 rounded"
              style={{
                accentColor: 'var(--color-brand-500)',
                borderColor: 'var(--border)',
              }}
            />
            <div className="flex-1">
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Web Search</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Search the web for current information
              </p>
            </div>
          </label>

          {/* X Search Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableGrokXSearch}
              onChange={(e) => onGrokXSearchChange?.(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 rounded"
              style={{
                accentColor: 'var(--color-brand-500)',
                borderColor: 'var(--border)',
              }}
            />
            <div className="flex-1">
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>X (Twitter) Search</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Search posts and trends on X
              </p>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
