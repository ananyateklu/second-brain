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
  XCircleIcon,
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

  // Disconnect feedback - shows "Connection closed" briefly after disconnect
  showDisconnected?: boolean;
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
  showDisconnected = false,
}: VoiceInputBarProps) {
  const prefersReducedMotion = useReducedMotion();
  const isActive = isConnected && sessionState !== 'Ended';

  return (
    <div
      className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-2 z-20 pointer-events-none"
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
      <div className="flex justify-center pointer-events-auto">
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="inline-flex items-center gap-3 px-4 py-3 rounded-full"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--surface-card) 85%, transparent)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--border)',
            boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Start/Stop Button */}
          <motion.button
            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            onClick={isActive ? onStop : onStart}
            disabled={isConnecting || showDisconnected || (!canStart && !isActive)}
            title={disabledReason}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={
              showDisconnected
                ? {
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: 'rgb(239, 68, 68)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }
                : isActive
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
            aria-label={showDisconnected ? 'Connection closed' : isActive ? 'End session' : 'Start session'}
          >
            <AnimatePresence mode="wait">
              {isConnecting ? (
                <motion.div
                  key="connecting"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    animate={prefersReducedMotion ? {} : { rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                  />
                  <span>Connecting</span>
                </motion.div>
              ) : showDisconnected ? (
                <motion.div
                  key="disconnected"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2"
                >
                  <XCircleIcon className="w-4 h-4" />
                  <span>Disconnected</span>
                </motion.div>
              ) : isActive ? (
                <motion.div
                  key="end"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2"
                >
                  <StopIcon className="w-4 h-4" />
                  <span>End</span>
                </motion.div>
              ) : (
                <motion.div
                  key="start"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2"
                >
                  <MicrophoneIcon className="w-4 h-4" />
                  <span>Start</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Waveform + Status */}
          <div className="flex items-center gap-2">
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

            {/* Status label - integrated into bar */}
            <AnimatePresence>
              {isActive && sessionState !== 'Idle' && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-xs font-medium overflow-hidden whitespace-nowrap"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {sessionState === 'Listening' && 'Listening...'}
                  {sessionState === 'Processing' && 'Processing...'}
                  {sessionState === 'Speaking' && 'Speaking...'}
                  {sessionState === 'Interrupted' && 'Interrupted'}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Control Buttons - only visible when active */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, width: 'auto' }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
                className="flex items-center gap-2 overflow-hidden"
              >
                {/* Microphone Toggle */}
                <motion.button
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                  onClick={onToggleMicrophone}
                  className="p-2 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
                    <SpeakerWaveIcon className="w-4 h-4" />
                  ) : (
                    <SpeakerXMarkIcon className="w-4 h-4" />
                  )}
                </motion.button>

                {/* Interrupt Button - only visible when AI is speaking */}
                <AnimatePresence>
                  {isAudioPlaying && (
                    <motion.button
                      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                      whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                      onClick={onInterrupt}
                      className="p-2 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                      style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        color: 'rgb(245, 158, 11)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                      }}
                      aria-label="Interrupt AI"
                    >
                      <HandRaisedIcon className="w-4 h-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
