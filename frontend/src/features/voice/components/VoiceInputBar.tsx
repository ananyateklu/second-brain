/**
 * VoiceInputBar Component
 * Floating bar at bottom containing waveform + controls
 *
 * Desktop Layout:
 * ┌─────────────────────────────────────────────────────────┐
 * │  [Tool Chips scrolling above - AnimatePresence]         │
 * ├─────────────────────────────────────────────────────────┤
 * │  [Start] │ ═══ Waveform Bars ═══ │ [Mic] [Interrupt]   │
 * └─────────────────────────────────────────────────────────┘
 *
 * Mobile Layout (two-row):
 * ┌─────────────────────────────────────────────────────────┐
 * │  [Tool Chips scrolling above - AnimatePresence]         │
 * ├─────────────────────────────────────────────────────────┤
 * │  [Standard|Grok] [🔊 Voice ▼] [⚙️Agent]                │
 * ├─────────────────────────────────────────────────────────┤
 * │  [🎤 Start]  ═══ Waveform ═══  [🔇][✋]                 │
 * └─────────────────────────────────────────────────────────┘
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  MicrophoneIcon,
  StopIcon,
  SpeakerXMarkIcon,
  SpeakerWaveIcon,
  HandRaisedIcon,
  XCircleIcon,
  SparklesIcon,
  SpeakerWaveIcon as SpeakerIcon,
  ChevronDownIcon,
  CheckIcon,
} from '@heroicons/react/24/solid';
import { VoiceWaveform, VoiceWaveformPulse } from './VoiceWaveform';
import { VoiceToolChipsContainer } from './VoiceToolChip';
import type {
  VoiceSessionState,
  VoiceToolExecution,
  VoiceProviderType,
  VoiceInfo,
  GrokVoiceInfo,
} from '../types/voice-types';

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

  // Mobile controls (from VoiceHeader) - optional for backward compatibility
  voiceProviderType?: VoiceProviderType;
  onVoiceProviderTypeChange?: (type: VoiceProviderType) => void;
  grokVoiceAvailable?: boolean;
  standardVoiceAvailable?: boolean;
  selectedVoiceId?: string | null;
  availableVoices?: VoiceInfo[];
  onVoiceChange?: (voiceId: string) => void;
  selectedGrokVoice?: string;
  availableGrokVoices?: GrokVoiceInfo[];
  onGrokVoiceChange?: (voice: string) => void;
  agentEnabled?: boolean;
  onAgentModeChange?: (enabled: boolean) => void;
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
  // Mobile controls
  voiceProviderType = 'Standard',
  onVoiceProviderTypeChange,
  grokVoiceAvailable = false,
  standardVoiceAvailable = true,
  selectedVoiceId,
  availableVoices = [],
  onVoiceChange,
  selectedGrokVoice,
  availableGrokVoices = [],
  onGrokVoiceChange,
  agentEnabled = false,
  onAgentModeChange,
}: VoiceInputBarProps) {
  const prefersReducedMotion = useReducedMotion();
  const isActive = isConnected && sessionState !== 'Ended';
  const isSessionActive = isConnected && sessionState !== 'Idle' && sessionState !== 'Ended';
  const isGrokMode = voiceProviderType === 'GrokVoice';

  // Voice dropdown state for mobile
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
  const voiceDropdownRef = useRef<HTMLDivElement>(null);

  // Close voice dropdown when clicking outside
  useEffect(() => {
    if (!isVoiceDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (voiceDropdownRef.current && !voiceDropdownRef.current.contains(event.target as Node)) {
        setIsVoiceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVoiceDropdownOpen]);

  // Get current voice display
  const currentVoice = isGrokMode
    ? availableGrokVoices.find((v) => v.voiceId === selectedGrokVoice)
    : availableVoices.find((v) => v.voiceId === selectedVoiceId);

  // Check if mobile controls are available
  const hasMobileControls = onVoiceProviderTypeChange && onAgentModeChange;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 px-3 md:px-4 pb-10 md:pb-6 pt-2 z-20 pointer-events-none"
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

      {/* Mobile Layout - Two-row design */}
      {hasMobileControls && (
        <div className="md:hidden flex justify-center pointer-events-auto">
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-3 w-full max-w-sm"
            style={{
              padding: '16px',
              borderRadius: '24px',
              backgroundColor: 'color-mix(in srgb, var(--background) 22%, transparent)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
              boxShadow: 'var(--chat-shadow-md)',
            }}
          >
            {/* Top row: Voice configuration controls */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {/* Voice Type Toggle */}
              <div
                className="inline-flex items-center gap-0.5 p-0.5"
                style={{
                  borderRadius: '8px',
                  backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                  opacity: isSessionActive ? 0.5 : 1,
                  pointerEvents: isSessionActive ? 'none' : 'auto',
                }}
              >
                <button
                  type="button"
                  onClick={() => onVoiceProviderTypeChange?.('Standard')}
                  disabled={isSessionActive}
                  className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-md transition-all"
                  style={{
                    backgroundColor: !isGrokMode ? 'var(--btn-primary-bg)' : 'transparent',
                    color: !isGrokMode ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                    opacity: !standardVoiceAvailable && isGrokMode ? 0.6 : 1,
                  }}
                >
                  <span>Standard</span>
                  {!standardVoiceAvailable && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onVoiceProviderTypeChange?.('GrokVoice')}
                  disabled={isSessionActive}
                  className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-md transition-all"
                  style={{
                    backgroundColor: isGrokMode ? 'var(--btn-primary-bg)' : 'transparent',
                    color: isGrokMode ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                    opacity: !grokVoiceAvailable && !isGrokMode ? 0.6 : 1,
                  }}
                >
                  <span>Grok</span>
                  {!grokVoiceAvailable && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </button>
              </div>

              {/* Voice Dropdown (Compact) */}
              <div ref={voiceDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => !isSessionActive && setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
                  disabled={isSessionActive}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg transition-all"
                  style={{
                    backgroundColor: isVoiceDropdownOpen
                      ? 'var(--surface-card)'
                      : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                    color: 'var(--text-primary)',
                    opacity: isSessionActive ? 0.5 : 1,
                  }}
                >
                  <SpeakerIcon className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-500)' }} />
                  <span className="max-w-[60px] truncate">{currentVoice?.name || 'Voice'}</span>
                  <ChevronDownIcon
                    className="w-3 h-3 transition-transform"
                    style={{ transform: isVoiceDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>

                {/* Voice Dropdown Menu */}
                {isVoiceDropdownOpen && (
                  <div
                    className="absolute bottom-full left-0 mb-2 w-56 max-h-48 overflow-y-auto rounded-xl z-50"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--background) 22%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                      backdropFilter: 'blur(24px) saturate(180%)',
                      boxShadow: 'var(--chat-shadow-lg)',
                    }}
                  >
                    <div className="p-1.5">
                      {(isGrokMode ? availableGrokVoices : availableVoices).map((voice) => (
                        <button
                          key={voice.voiceId}
                          type="button"
                          onClick={() => {
                            if (isGrokMode) {
                              onGrokVoiceChange?.(voice.voiceId);
                            } else {
                              onVoiceChange?.(voice.voiceId);
                            }
                            setIsVoiceDropdownOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center gap-2"
                          style={{
                            backgroundColor:
                              (isGrokMode ? selectedGrokVoice : selectedVoiceId) === voice.voiceId
                                ? 'var(--color-primary-alpha)'
                                : 'transparent',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <span className="flex-1 truncate">{voice.name}</span>
                          {(isGrokMode ? selectedGrokVoice : selectedVoiceId) === voice.voiceId && (
                            <CheckIcon className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
                          )}
                        </button>
                      ))}
                      {(isGrokMode ? availableGrokVoices : availableVoices).length === 0 && (
                        <div className="px-2.5 py-2 text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
                          No voices available
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Agent Toggle Button */}
              <button
                type="button"
                onClick={() => onAgentModeChange?.(!agentEnabled)}
                disabled={isSessionActive}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                style={{
                  backgroundColor: agentEnabled
                    ? 'var(--color-brand-600)'
                    : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                  border: agentEnabled
                    ? '1px solid var(--color-brand-500)'
                    : '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                  color: agentEnabled ? 'white' : 'var(--text-secondary)',
                  opacity: isSessionActive ? 0.5 : 1,
                }}
                title={agentEnabled ? 'Agent mode enabled' : 'Agent mode disabled'}
              >
                <SparklesIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom row: Session controls */}
            <div className="flex items-center justify-center gap-3">
              {/* Start/Stop Button */}
              <motion.button
                whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                onClick={isActive ? onStop : onStart}
                disabled={isConnecting || showDisconnected || (!canStart && !isActive)}
                title={disabledReason}
                className="flex items-center justify-center gap-2 font-medium text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  transition: 'all 200ms ease-out',
                  ...(showDisconnected || isActive
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
                {isConnecting ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 border-2 border-current rounded-full animate-spin"
                      style={{ borderTopColor: 'transparent' }}
                    />
                    <span>...</span>
                  </div>
                ) : showDisconnected ? (
                  <XCircleIcon className="w-5 h-5" />
                ) : isActive ? (
                  <StopIcon className="w-5 h-5" />
                ) : (
                  <MicrophoneIcon className="w-5 h-5" />
                )}
              </motion.button>

              {/* Waveform */}
              <div className="flex items-center">
                {isConnecting ? (
                  <VoiceWaveformPulse state="Processing" size="sm" />
                ) : (
                  <VoiceWaveform
                    audioLevel={audioLevel}
                    isActive={isActive && (sessionState === 'Listening' || sessionState === 'Speaking')}
                    state={sessionState}
                    size="sm"
                  />
                )}
              </div>

              {/* Mic Toggle - only when active */}
              {isActive && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                  onClick={onToggleMicrophone}
                  className="w-9 h-9 flex items-center justify-center rounded-full"
                  style={{
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
                    <SpeakerWaveIcon className="w-5 h-5" />
                  ) : (
                    <SpeakerXMarkIcon className="w-5 h-5" />
                  )}
                </motion.button>
              )}

              {/* Interrupt Button - only when AI is speaking */}
              {isActive && isAudioPlaying && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                  onClick={onInterrupt}
                  className="w-9 h-9 flex items-center justify-center rounded-full"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
                    color: 'var(--color-warning)',
                    border: '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)',
                  }}
                  aria-label="Interrupt AI"
                >
                  <HandRaisedIcon className="w-5 h-5" />
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Desktop Layout - Original single-row design */}
      <div className={`${hasMobileControls ? 'hidden md:flex' : 'flex'} justify-center pointer-events-auto`}>
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="inline-flex items-center gap-3"
          style={{
            padding: 'var(--chat-space-md) var(--chat-space-lg)',
            borderRadius: 'var(--chat-radius-full)',
            backgroundColor: 'color-mix(in srgb, var(--background) 22%, transparent)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
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
