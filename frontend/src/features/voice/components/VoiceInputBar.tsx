/**
 * VoiceInputBar Component
 * Floating bar at bottom containing waveform + controls
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────┐
 * │  [Tool Chips scrolling above - AnimatePresence]         │
 * ├─────────────────────────────────────────────────────────┤
 * │  [Start] │ ═══ Waveform Bars ═══ │ [Mic] [Interrupt]   │
 * └─────────────────────────────────────────────────────────┘
 */

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  MicrophoneIcon,
  StopIcon,
  SpeakerXMarkIcon,
  SpeakerWaveIcon,
  HandRaisedIcon,
} from '@heroicons/react/24/solid';
import { VoiceWaveform, VoiceWaveformPulse } from './VoiceWaveform';
import { VoiceToolChipsContainer } from './VoiceToolChip';
import type { VoiceSessionState, VoiceToolExecution } from '../types/voice-types';

interface VoiceInputBarProps {
  // Session state
  isConnected: boolean;
  isConnecting: boolean;
  sessionState: VoiceSessionState;
  audioLevel: number;

  // Tool state
  activeTools: VoiceToolExecution[];
  onToolComplete?: (toolId: string) => void;

  // Controls
  isMicrophoneEnabled: boolean;
  isAudioPlaying: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleMicrophone: () => void;
  onInterrupt: () => void;

  // Disabled state
  canStart: boolean;
  disabledReason?: string;
}

export function VoiceInputBar({
  isConnected,
  isConnecting,
  sessionState,
  audioLevel,
  activeTools,
  onToolComplete,
  isMicrophoneEnabled,
  isAudioPlaying,
  onStart,
  onStop,
  onToggleMicrophone,
  onInterrupt,
  canStart,
  disabledReason,
}: VoiceInputBarProps) {
  const prefersReducedMotion = useReducedMotion();
  const isActive = isConnected && sessionState !== 'Ended';
  const isIdle = !isConnected && !isConnecting;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-2 z-20 pointer-events-none"
      style={{
        background: 'linear-gradient(to top, var(--surface-primary) 60%, transparent 100%)',
      }}
    >
      {/* Tool chips above the bar */}
      <AnimatePresence>
        {activeTools.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex justify-center mb-3 pointer-events-auto"
          >
            <VoiceToolChipsContainer
              tools={activeTools}
              onToolComplete={onToolComplete}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main floating bar */}
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center gap-4 px-6 py-4 rounded-[2rem]"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--surface-card) 85%, transparent)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--border)',
            boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Left: Start/Stop Button */}
          <motion.button
            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            onClick={isActive ? onStop : onStart}
            disabled={isConnecting || (!canStart && !isActive)}
            title={disabledReason}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={
              isActive
                ? {
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: 'rgb(239, 68, 68)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }
                : {
                    backgroundColor: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                    border: '1px solid var(--btn-primary-border)',
                    boxShadow: '0 2px 8px -2px rgba(54, 105, 61, 0.3)',
                  }
            }
            aria-label={isActive ? 'End session' : 'Start session'}
          >
            {isConnecting ? (
              <>
                <motion.div
                  animate={prefersReducedMotion ? {} : { rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                />
                <span>Connecting</span>
              </>
            ) : isActive ? (
              <>
                <StopIcon className="w-4 h-4" />
                <span>End</span>
              </>
            ) : (
              <>
                <MicrophoneIcon className="w-4 h-4" />
                <span>Start</span>
              </>
            )}
          </motion.button>

          {/* Center: Waveform */}
          <div className="flex items-center justify-center px-4">
            {isConnecting ? (
              <VoiceWaveformPulse state="Processing" size="md" />
            ) : (
              <VoiceWaveform
                audioLevel={audioLevel}
                isActive={isActive && (sessionState === 'Listening' || sessionState === 'Speaking')}
                state={sessionState}
                size="md"
              />
            )}
          </div>

          {/* Right: Control Buttons */}
          <div className="flex items-center gap-2">
            {/* Microphone Toggle - only visible when connected */}
            <AnimatePresence>
              {isActive && (
                <motion.button
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                  onClick={onToggleMicrophone}
                  className="p-2.5 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={
                    isMicrophoneEnabled
                      ? {
                          backgroundColor: 'var(--surface-elevated)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border)',
                        }
                      : {
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: 'rgb(239, 68, 68)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                        }
                  }
                  aria-label={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {isMicrophoneEnabled ? (
                    <SpeakerWaveIcon className="w-5 h-5" />
                  ) : (
                    <SpeakerXMarkIcon className="w-5 h-5" />
                  )}
                </motion.button>
              )}
            </AnimatePresence>

            {/* Interrupt Button - only visible when AI is speaking */}
            <AnimatePresence>
              {isActive && isAudioPlaying && (
                <motion.button
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                  onClick={onInterrupt}
                  className="p-2.5 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: 'rgb(245, 158, 11)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}
                  aria-label="Interrupt AI"
                >
                  <HandRaisedIcon className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Placeholder for consistent width when buttons are hidden */}
            {isIdle && <div className="w-10 h-10" aria-hidden />}
          </div>
        </motion.div>

        {/* Status indicator text */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="flex justify-center mt-2"
            >
              <span
                className="text-xs font-medium px-3 py-1 rounded-full"
                style={{
                  color: 'var(--text-tertiary)',
                  backgroundColor: 'color-mix(in srgb, var(--surface-elevated) 80%, transparent)',
                }}
              >
                {sessionState === 'Listening' && 'Listening...'}
                {sessionState === 'Processing' && 'Processing...'}
                {sessionState === 'Speaking' && 'Speaking...'}
                {sessionState === 'Interrupted' && 'Interrupted'}
                {sessionState === 'Idle' && 'Ready'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
