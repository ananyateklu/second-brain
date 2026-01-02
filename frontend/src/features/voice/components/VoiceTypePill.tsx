/**
 * VoiceTypePill Component
 * Toggle button for switching between GrokVoice and Standard voice modes
 */

import { BoltIcon } from '@heroicons/react/24/outline';
import type { VoiceProviderType } from '../types/voice-types';

interface VoiceTypePillProps {
  voiceProviderType: VoiceProviderType;
  onVoiceProviderTypeChange: (type: VoiceProviderType) => void;
  grokVoiceAvailable: boolean;
  disabled?: boolean;
}

export function VoiceTypePill({
  voiceProviderType,
  onVoiceProviderTypeChange,
  grokVoiceAvailable,
  disabled = false,
}: VoiceTypePillProps) {
  const isGrokMode = voiceProviderType === 'GrokVoice';

  const handleToggle = () => {
    if (disabled) return;
    const newType = isGrokMode ? 'Standard' : 'GrokVoice';
    // Only switch to GrokVoice if it's available
    if (newType === 'GrokVoice' && !grokVoiceAvailable) return;
    onVoiceProviderTypeChange(newType);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      title={!grokVoiceAvailable && !isGrokMode ? 'Grok Voice is not available - check xAI API key' : undefined}
      className={`
        flex items-center gap-1.5 px-3 py-2.5 my-1 rounded-xl backdrop-blur-md text-xs font-medium
        transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.03] active:scale-[0.97]'}
      `}
      style={{
        backgroundColor: isGrokMode
          ? 'color-mix(in srgb, var(--color-xai, #6366f1) 15%, transparent)'
          : 'var(--surface-elevated)',
        color: isGrokMode
          ? 'var(--color-xai, #818cf8)'
          : 'var(--text-secondary)',
        border: `1px solid ${isGrokMode ? 'var(--color-xai, #6366f1)' : 'var(--border)'}`,
        boxShadow: isGrokMode
          ? '0 0 12px -4px var(--color-xai, #6366f1)'
          : 'none',
      }}
    >
      {/* Icon */}
      <BoltIcon className="w-3.5 h-3.5 flex-shrink-0" />

      {/* Label */}
      <span>{isGrokMode ? 'Grok Voice' : 'Standard'}</span>

      {/* Active indicator */}
      {isGrokMode && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
          style={{ backgroundColor: 'var(--color-xai, #818cf8)' }}
        />
      )}
    </button>
  );
}
