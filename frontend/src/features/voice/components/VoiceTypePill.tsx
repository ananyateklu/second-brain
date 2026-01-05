/**
 * VoiceTypePill Component
 * Segmented toggle for switching between GrokVoice and Standard voice modes
 * Both options are always visible, active one has green highlight
 * Users can switch between modes even when one is unavailable to see configuration status
 */

import type { VoiceProviderType } from '../types/voice-types';

interface VoiceTypePillProps {
  voiceProviderType: VoiceProviderType;
  onVoiceProviderTypeChange: (type: VoiceProviderType) => void;
  grokVoiceAvailable: boolean;
  standardVoiceAvailable?: boolean;
  disabled?: boolean;
}

export function VoiceTypePill({
  voiceProviderType,
  onVoiceProviderTypeChange,
  grokVoiceAvailable,
  standardVoiceAvailable = true,
  disabled = false,
}: VoiceTypePillProps) {
  const isGrokMode = voiceProviderType === 'GrokVoice';

  const handleSelect = (type: VoiceProviderType) => {
    if (disabled) return;
    // Allow switching between modes even when unavailable (to show config status)
    onVoiceProviderTypeChange(type);
  };

  // Get tooltip text for each mode
  const getStandardTooltip = () => {
    if (!standardVoiceAvailable) {
      return 'Standard Voice not configured - click to see details';
    }
    return undefined;
  };

  const getGrokTooltip = () => {
    if (!grokVoiceAvailable) {
      return 'Grok Voice not configured - click to see details';
    }
    return undefined;
  };

  return (
    <div
      className={`
        inline-flex items-center gap-0.5 p-0.5
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      style={{
        borderRadius: 'var(--chat-radius-sm)',
        backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
        border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
      }}
    >
      {/* Standard Option */}
      <button
        type="button"
        onClick={() => handleSelect('Standard')}
        disabled={disabled}
        title={getStandardTooltip()}
        className={`
          flex items-center gap-1.5 text-xs font-medium
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          padding: 'var(--chat-space-xs) var(--chat-space-md)',
          borderRadius: 'var(--chat-radius-xs)',
          backgroundColor: !isGrokMode
            ? 'var(--btn-primary-bg)'
            : 'transparent',
          color: !isGrokMode
            ? 'var(--btn-primary-text)'
            : 'var(--text-secondary)',
          transition: `all var(--chat-duration-fast) var(--chat-ease-out)`,
          // Visual indicator for unavailable mode (subtle opacity when not selected)
          opacity: !standardVoiceAvailable && isGrokMode ? 0.6 : 1,
        }}
      >
        <span>Standard</span>
        {!standardVoiceAvailable && (
          <span style={{ width: '6px', height: '6px', borderRadius: 'var(--chat-radius-full)', backgroundColor: 'var(--color-warning)' }} title="Not configured" />
        )}
      </button>

      {/* Grok Voice Option */}
      <button
        type="button"
        onClick={() => handleSelect('GrokVoice')}
        disabled={disabled}
        title={getGrokTooltip()}
        className={`
          flex items-center gap-1.5 text-xs font-medium
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          padding: 'var(--chat-space-xs) var(--chat-space-md)',
          borderRadius: 'var(--chat-radius-xs)',
          backgroundColor: isGrokMode
            ? 'var(--btn-primary-bg)'
            : 'transparent',
          color: isGrokMode
            ? 'var(--btn-primary-text)'
            : 'var(--text-secondary)',
          transition: `all var(--chat-duration-fast) var(--chat-ease-out)`,
          // Visual indicator for unavailable mode (subtle opacity when not selected)
          opacity: !grokVoiceAvailable && !isGrokMode ? 0.6 : 1,
        }}
      >
        <span>Grok</span>
        {!grokVoiceAvailable && (
          <span style={{ width: '6px', height: '6px', borderRadius: 'var(--chat-radius-full)', backgroundColor: 'var(--color-warning)' }} title="Not configured" />
        )}
      </button>
    </div>
  );
}
