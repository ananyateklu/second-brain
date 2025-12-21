/**
 * VoiceStatusIndicator Component
 * Displays current session state with animated indicator
 */

import { motion } from 'framer-motion';
import { VoiceSessionState } from '../types/voice-types';

interface VoiceStatusIndicatorProps {
  /** Voice session state - should be normalized by caller using normalizeState() */
  state: VoiceSessionState;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

const stateConfig: Record<
  VoiceSessionState,
  { label: string; color: string; bgColor: string; animation?: 'pulse' | 'spin' | 'bounce' }
> = {
  Idle: {
    label: 'Ready to start',
    color: 'var(--text-secondary)',
    bgColor: 'var(--border)',
  },
  Listening: {
    label: 'Listening...',
    color: 'var(--color-primary)',
    bgColor: 'var(--color-primary)',
    animation: 'pulse',
  },
  Processing: {
    label: 'Processing...',
    color: '#f59e0b',
    bgColor: '#f59e0b',
    animation: 'spin',
  },
  Speaking: {
    label: 'Speaking...',
    color: 'var(--color-brand-400)',
    bgColor: 'var(--color-brand-400)',
    animation: 'bounce',
  },
  Interrupted: {
    label: 'Interrupted',
    color: '#ef4444',
    bgColor: '#ef4444',
  },
  Ended: {
    label: 'Session ended',
    color: 'var(--text-tertiary)',
    bgColor: 'var(--border)',
  },
};

export function VoiceStatusIndicator({
  state,
  isConnected,
  isConnecting,
  error,
}: VoiceStatusIndicatorProps) {
  const config = stateConfig[state];

  // Show error state
  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-sm font-medium text-red-500">{error}</span>
      </div>
    );
  }

  // Show connecting state
  if (isConnecting) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full"
        />
        <span className="text-sm font-medium text-[var(--text-secondary)]">Connecting...</span>
      </div>
    );
  }

  // Show not connected state
  if (!isConnected && state === 'Idle') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)]">
        <div className="w-2 h-2 rounded-full bg-[var(--text-tertiary)]" />
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          Click the orb or Start Session to begin
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-full"
      style={{ backgroundColor: `${config.bgColor}15` }}
    >
      {/* Animated indicator */}
      <motion.div
        animate={
          config.animation === 'pulse'
            ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }
            : config.animation === 'spin'
            ? { rotate: 360 }
            : config.animation === 'bounce'
            ? { y: [0, -3, 0] }
            : {}
        }
        transition={
          config.animation
            ? { duration: config.animation === 'spin' ? 1 : 0.8, repeat: Infinity, ease: 'easeInOut' }
            : {}
        }
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: config.bgColor }}
      />

      {/* Status text */}
      <span className="text-sm font-medium" style={{ color: config.color }}>
        {config.label}
      </span>

      {/* Connection indicator */}
      {isConnected && (
        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-[var(--border)]">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-xs text-[var(--text-tertiary)]">Connected</span>
        </div>
      )}
    </div>
  );
}
