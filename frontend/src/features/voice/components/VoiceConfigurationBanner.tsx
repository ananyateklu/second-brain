/**
 * VoiceConfigurationBanner Component
 * Shows inline configuration status when the selected voice mode is not properly configured.
 * Displays specific missing requirements for Grok Voice vs Standard Voice modes.
 */

import { motion } from 'framer-motion';
import { MicrophoneIcon, ExclamationTriangleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import type { VoiceProviderType } from '../types/voice-types';

interface VoiceConfigurationBannerProps {
  voiceProviderType: VoiceProviderType;
  grokVoiceAvailable: boolean;
  deepgramAvailable: boolean;
  elevenLabsAvailable: boolean;
  onSwitchMode: (mode: VoiceProviderType) => void;
}

export function VoiceConfigurationBanner({
  voiceProviderType,
  grokVoiceAvailable,
  deepgramAvailable,
  elevenLabsAvailable,
  onSwitchMode,
}: VoiceConfigurationBannerProps) {
  const isGrokMode = voiceProviderType === 'GrokVoice';
  const standardVoiceAvailable = deepgramAvailable && elevenLabsAvailable;

  // Determine if current mode is configured
  const isCurrentModeConfigured = isGrokMode ? grokVoiceAvailable : standardVoiceAvailable;

  // Don't show banner if current mode is configured
  if (isCurrentModeConfigured) {
    return null;
  }

  // Check if the other mode is available for switching
  const otherModeAvailable = isGrokMode ? standardVoiceAvailable : grokVoiceAvailable;
  const otherModeName = isGrokMode ? 'Standard Voice' : 'Grok Voice';
  const otherModeType: VoiceProviderType = isGrokMode ? 'Standard' : 'GrokVoice';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-6 p-8 h-full"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        <MicrophoneIcon className="w-12 h-12" style={{ color: 'var(--text-tertiary)' }} />
      </motion.div>

      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          {isGrokMode ? 'Grok Voice Not Configured' : 'Standard Voice Not Configured'}
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {isGrokMode
            ? 'Configure your xAI API key in the backend settings to enable Grok Voice.'
            : 'Configure the required API keys to enable Standard Voice.'}
        </p>

        {/* Status indicators for Standard mode */}
        {!isGrokMode && (
          <div
            className="space-y-2 text-left rounded-lg p-4 mb-4"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  deepgramAvailable ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Deepgram STT: {deepgramAvailable ? 'Connected' : 'Not configured'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  elevenLabsAvailable ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                ElevenLabs TTS: {elevenLabsAvailable ? 'Connected' : 'Not configured'}
              </span>
            </div>
          </div>
        )}

        {/* Status indicator for Grok mode */}
        {isGrokMode && (
          <div
            className="space-y-2 text-left rounded-lg p-4 mb-4"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                xAI API key not configured
              </span>
            </div>
          </div>
        )}

        {/* Switch mode button if other mode is available */}
        {otherModeAvailable && (
          <button
            onClick={() => onSwitchMode(otherModeType)}
            className="
              inline-flex items-center gap-2 px-4 py-2 rounded-lg
              font-medium text-sm transition-all duration-200 hover:-translate-y-0.5
            "
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: '1px solid var(--btn-primary-border)',
            }}
          >
            Switch to {otherModeName}
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        )}

        {/* Help text when no modes available */}
        {!otherModeAvailable && (
          <p className="text-xs mt-4" style={{ color: 'var(--text-tertiary)' }}>
            Configure the API keys in your backend settings to enable voice conversations.
          </p>
        )}
      </div>
    </motion.div>
  );
}
