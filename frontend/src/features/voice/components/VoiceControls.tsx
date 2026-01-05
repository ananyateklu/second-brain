/**
 * VoiceControls Component
 * Control buttons for voice session (start, stop, mute, interrupt)
 */

import { motion } from 'framer-motion';
import {
  MicrophoneIcon,
  StopIcon,
  SpeakerXMarkIcon,
  SpeakerWaveIcon,
  HandRaisedIcon,
} from '@heroicons/react/24/solid';
import { VoiceSessionState } from '../types/voice-types';

interface VoiceControlsProps {
  state: VoiceSessionState;
  isConnected: boolean;
  isConnecting: boolean;
  isMicrophoneEnabled: boolean;
  isAudioPlaying: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleMicrophone: () => void;
  onInterrupt: () => void;
}

export function VoiceControls({
  state,
  isConnected,
  isConnecting,
  isMicrophoneEnabled,
  isAudioPlaying,
  onStart,
  onStop,
  onToggleMicrophone,
  onInterrupt,
}: VoiceControlsProps) {
  const isActive = isConnected && state !== 'Ended';

  return (
    <div className="flex items-center justify-center gap-4">
      {/* Start/Stop Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isActive ? onStop : onStart}
        disabled={isConnecting}
        className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={isActive ? {
          backgroundColor: 'color-mix(in srgb, var(--color-error) 20%, transparent)',
          color: 'var(--color-error)',
        } : {
          backgroundColor: 'var(--btn-primary-bg)',
          color: 'var(--btn-primary-text)',
          border: '1px solid var(--btn-primary-border)',
        }}
        aria-label={isActive ? 'End session' : 'Start session'}
      >
        {isConnecting ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
            />
            <span>Connecting...</span>
          </>
        ) : isActive ? (
          <>
            <StopIcon className="w-5 h-5" />
            <span>End Session</span>
          </>
        ) : (
          <>
            <MicrophoneIcon className="w-5 h-5" />
            <span>Start Session</span>
          </>
        )}
      </motion.button>

      {/* Microphone Toggle - only visible when connected */}
      {isActive && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleMicrophone}
          className="p-3 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={
            isMicrophoneEnabled
              ? {
                  backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                  color: 'var(--text-primary)',
                }
              : {
                  backgroundColor: 'color-mix(in srgb, var(--color-error) 20%, transparent)',
                  color: 'var(--color-error)',
                }
          }
          aria-label={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isMicrophoneEnabled ? (
            <SpeakerWaveIcon className="w-6 h-6" />
          ) : (
            <SpeakerXMarkIcon className="w-6 h-6" />
          )}
        </motion.button>
      )}

      {/* Interrupt Button - only visible when AI is speaking */}
      {isActive && isAudioPlaying && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onInterrupt}
          className="p-3 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-warning) 20%, transparent)',
            color: 'var(--color-warning)',
          }}
          aria-label="Interrupt AI"
        >
          <HandRaisedIcon className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  );
}
