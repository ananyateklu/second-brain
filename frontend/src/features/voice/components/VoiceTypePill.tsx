/**
 * VoiceTypePill Component
 * Segmented toggle for switching between GrokVoice and Standard voice modes
 * Both options are always visible, active one has green highlight
 */

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

  const handleSelect = (type: VoiceProviderType) => {
    if (disabled) return;
    // Only switch to GrokVoice if it's available
    if (type === 'GrokVoice' && !grokVoiceAvailable) return;
    onVoiceProviderTypeChange(type);
  };

  return (
    <div
      className={`
        inline-flex items-center gap-0.5 p-0.5 rounded-lg
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Standard Option */}
      <button
        type="button"
        onClick={() => handleSelect('Standard')}
        disabled={disabled}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
          transition-all duration-200
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          backgroundColor: !isGrokMode
            ? 'var(--btn-primary-bg)'
            : 'transparent',
          color: !isGrokMode
            ? 'var(--btn-primary-text)'
            : 'var(--text-secondary)',
          boxShadow: !isGrokMode
            ? '0 4px 12px -2px rgba(54, 105, 61, 0.3)'
            : 'none',
        }}
      >
        <span>Standard</span>
      </button>

      {/* Grok Voice Option */}
      <button
        type="button"
        onClick={() => handleSelect('GrokVoice')}
        disabled={disabled || !grokVoiceAvailable}
        title={!grokVoiceAvailable ? 'Grok Voice is not available - check xAI API key' : undefined}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
          transition-all duration-200
          ${disabled || !grokVoiceAvailable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        `}
        style={{
          backgroundColor: isGrokMode
            ? 'var(--btn-primary-bg)'
            : 'transparent',
          color: isGrokMode
            ? 'var(--btn-primary-text)'
            : 'var(--text-secondary)',
          boxShadow: isGrokMode
            ? '0 4px 12px -2px rgba(54, 105, 61, 0.3)'
            : 'none',
        }}
      >
        <span>Grok</span>
      </button>
    </div>
  );
}
