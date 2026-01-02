/**
 * VoiceWaveform Component
 * Animated waveform bars that respond to audio level
 *
 * Features:
 * - 5 vertical bars with staggered animations
 * - Height responds to audioLevel (0-1 range)
 * - State-based coloring (Idle, Listening, Processing, Speaking)
 * - Smooth spring animations using Framer Motion
 * - Respects prefers-reduced-motion
 */

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { VoiceSessionState } from '../types/voice-types';

interface VoiceWaveformProps {
  /** Audio level from 0-1 for bar heights */
  audioLevel: number;
  /** Whether waveform is actively animating */
  isActive: boolean;
  /** Current session state for color theming */
  state: VoiceSessionState;
  /** Number of bars (default: 5) */
  barCount?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

// Colors by state
const STATE_COLORS: Record<VoiceSessionState, string> = {
  Idle: 'var(--text-tertiary)',
  Listening: 'var(--color-blue-500)',
  Processing: 'var(--color-amber-500)',
  Speaking: 'var(--color-brand-500)',
  Interrupted: 'var(--color-red-500)',
  Ended: 'var(--text-tertiary)',
};

// Size configurations
const SIZE_CONFIG = {
  sm: {
    barWidth: 3,
    barGap: 2,
    baseHeight: 6,
    maxHeight: 20,
    borderRadius: 2,
  },
  md: {
    barWidth: 4,
    barGap: 3,
    baseHeight: 8,
    maxHeight: 32,
    borderRadius: 3,
  },
  lg: {
    barWidth: 5,
    barGap: 4,
    baseHeight: 10,
    maxHeight: 40,
    borderRadius: 4,
  },
};

// Staggered delays for organic feel
const BAR_DELAYS = [0, 0.1, 0.05, 0.15, 0.08];

export function VoiceWaveform({
  audioLevel,
  isActive,
  state,
  barCount = 5,
  size = 'md',
}: VoiceWaveformProps) {
  const prefersReducedMotion = useReducedMotion();
  const config = SIZE_CONFIG[size];
  const color = STATE_COLORS[state] || STATE_COLORS.Idle;

  // Generate bar heights based on audio level
  const barHeights = useMemo(() => {
    if (!isActive || prefersReducedMotion) {
      return Array(barCount).fill(config.baseHeight);
    }

    // Create varied heights based on audio level with some randomization
    return Array(barCount)
      .fill(0)
      .map((_, i) => {
        // Create a wave pattern - center bars are taller
        const centerDistance = Math.abs(i - (barCount - 1) / 2) / ((barCount - 1) / 2);
        const waveMultiplier = 1 - centerDistance * 0.3;

        // Calculate height based on audio level
        const audioBoost = audioLevel * (config.maxHeight - config.baseHeight);
        const height = config.baseHeight + audioBoost * waveMultiplier;

        return Math.min(Math.max(height, config.baseHeight), config.maxHeight);
      });
  }, [audioLevel, isActive, barCount, config, prefersReducedMotion]);

  // Container width
  const containerWidth = barCount * config.barWidth + (barCount - 1) * config.barGap;

  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: containerWidth,
        height: config.maxHeight,
      }}
      role="img"
      aria-label={`Voice waveform: ${state}`}
    >
      <div
        className="flex items-center gap-[var(--gap)]"
        style={{
          '--gap': `${config.barGap}px`,
        } as React.CSSProperties}
      >
        {barHeights.map((height, index) => (
          <motion.div
            key={index}
            className="rounded-full"
            style={{
              width: config.barWidth,
              backgroundColor: color,
              borderRadius: config.borderRadius,
            }}
            initial={{ height: config.baseHeight }}
            animate={{
              height: height,
              opacity: isActive ? 1 : 0.5,
            }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    type: 'spring',
                    stiffness: 300,
                    damping: 15,
                    delay: BAR_DELAYS[index % BAR_DELAYS.length],
                  }
            }
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Pulsing waveform variant for loading/connecting states
 */
export function VoiceWaveformPulse({
  state = 'Processing',
  size = 'md',
  barCount = 5,
}: {
  state?: VoiceSessionState;
  size?: 'sm' | 'md' | 'lg';
  barCount?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const config = SIZE_CONFIG[size];
  const color = STATE_COLORS[state];
  const containerWidth = barCount * config.barWidth + (barCount - 1) * config.barGap;

  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: containerWidth,
        height: config.maxHeight,
      }}
      role="img"
      aria-label="Voice connecting"
    >
      <div
        className="flex items-center gap-[var(--gap)]"
        style={{
          '--gap': `${config.barGap}px`,
        } as React.CSSProperties}
      >
        {Array(barCount)
          .fill(0)
          .map((_, index) => (
            <motion.div
              key={index}
              className="rounded-full"
              style={{
                width: config.barWidth,
                backgroundColor: color,
                borderRadius: config.borderRadius,
              }}
              initial={{ height: config.baseHeight }}
              animate={
                prefersReducedMotion
                  ? { opacity: [0.5, 1] }
                  : {
                      height: [config.baseHeight, config.maxHeight * 0.6, config.baseHeight],
                    }
              }
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: index * 0.15,
              }}
            />
          ))}
      </div>
    </div>
  );
}
