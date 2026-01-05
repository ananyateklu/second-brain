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
          className="inline-flex items-center gap-3"
          style={{
            padding: 'var(--chat-space-md) var(--chat-space-lg)',
            borderRadius: 'var(--chat-radius-full)',
            backgroundColor: 'color-mix(in srgb, var(--background) 85%, transparent)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
            boxShadow: 'var(--chat-shadow-md)',
          }}
        >
          {/* Start/Stop Button */}
          <motion.button
            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            onClick={isActive ? onStop : onStart}
            disabled={isConnecting || showDisconnected || (!canStart && !isActive)}
            title={disabledReason}
            className="flex items-center justify-center gap-2 font-medium text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              padding: 'var(--chat-space-sm) var(--chat-space-lg)',
              borderRadius: 'var(--chat-radius-full)',
              transition: `all var(--chat-duration-normal) var(--chat-ease-out)`,
              ...(showDisconnected
                ? {
                    backgroundColor: 'color-mix(in srgb, var(--color-error) 15%, transparent)',
                    color: 'var(--color-error)',
                    border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)',
                  }
                : isActive
                  ? {
                      backgroundColor: 'color-mix(in srgb, var(--color-error) 15%, transparent)',
                      color: 'var(--color-error)',
                      border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)',
                    }
                  : {
                      backgroundColor: 'var(--btn-primary-bg)',
                      color: 'var(--btn-primary-text)',
                      border: '1px solid var(--btn-primary-border)',
                    }),
            }}
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
                    style={{
                      width: 'var(--chat-icon-md)',
                      height: 'var(--chat-icon-md)',
                      border: '2px solid currentColor',
                      borderTopColor: 'transparent',
                      borderRadius: 'var(--chat-radius-full)',
                    }}
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
                  <XCircleIcon style={{ width: 'var(--chat-icon-md)', height: 'var(--chat-icon-md)' }} />
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
                  <StopIcon style={{ width: 'var(--chat-icon-md)', height: 'var(--chat-icon-md)' }} />
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
                  <MicrophoneIcon style={{ width: 'var(--chat-icon-md)', height: 'var(--chat-icon-md)' }} />
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
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{
                    padding: 'var(--chat-space-sm)',
                    borderRadius: 'var(--chat-radius-full)',
                    transition: `all var(--chat-duration-fast) var(--chat-ease-out)`,
                    ...(isMicrophoneEnabled
                      ? {
                          backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                          color: 'var(--text-primary)',
                          border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                        }
                      : {
                          backgroundColor: 'color-mix(in srgb, var(--color-error) 15%, transparent)',
                          color: 'var(--color-error)',
                          border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)',
                        }),
                  }}
                  aria-label={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {isMicrophoneEnabled ? (
                    <SpeakerWaveIcon style={{ width: 'var(--chat-icon-md)', height: 'var(--chat-icon-md)' }} />
                  ) : (
                    <SpeakerXMarkIcon style={{ width: 'var(--chat-icon-md)', height: 'var(--chat-icon-md)' }} />
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
                      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                      style={{
                        padding: 'var(--chat-space-sm)',
                        borderRadius: 'var(--chat-radius-full)',
                        transition: `all var(--chat-duration-fast) var(--chat-ease-out)`,
                        backgroundColor: 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
                        color: 'var(--color-warning)',
                        border: '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)',
                      }}
                      aria-label="Interrupt AI"
                    >
                      <HandRaisedIcon style={{ width: 'var(--chat-icon-md)', height: 'var(--chat-icon-md)' }} />
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
