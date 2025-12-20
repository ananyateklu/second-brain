/**
 * VoiceOrb Component
 * Animated central orb that visualizes voice agent state
 * States: Idle (pulsing), Listening (ripples), Processing (spinning), Speaking (waveform)
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceSessionState } from '../types/voice-types';

interface VoiceOrbProps {
  state: VoiceSessionState;
  audioLevel: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
}

const sizeMap = {
  sm: { orb: 120, ring: 140, outer: 160 },
  md: { orb: 180, ring: 210, outer: 240 },
  lg: { orb: 240, ring: 280, outer: 320 },
};

export function VoiceOrb({ state, audioLevel, size = 'md', onClick, disabled = false }: VoiceOrbProps) {
  const dimensions = sizeMap[size];
  const normalizedLevel = Math.min(1, Math.max(0, audioLevel));

  // State-based colors
  const colors = useMemo(() => {
    switch (state) {
      case 'Listening':
        return {
          primary: 'var(--color-primary)',
          secondary: 'var(--color-primary-alpha)',
          glow: 'var(--color-primary)',
        };
      case 'Processing':
        return {
          primary: '#f59e0b', // amber
          secondary: 'rgba(245, 158, 11, 0.3)',
          glow: '#f59e0b',
        };
      case 'Speaking':
        return {
          primary: 'var(--color-brand-400)', // green
          secondary: 'color-mix(in srgb, var(--color-brand-400) 30%, transparent)',
          glow: 'var(--color-brand-400)',
        };
      case 'Interrupted':
        return {
          primary: '#ef4444', // red
          secondary: 'rgba(239, 68, 68, 0.3)',
          glow: '#ef4444',
        };
      case 'Ended':
        return {
          primary: 'var(--text-tertiary)',
          secondary: 'var(--border)',
          glow: 'transparent',
        };
      default: // Idle
        return {
          primary: 'var(--text-secondary)',
          secondary: 'var(--border)',
          glow: 'var(--color-primary)',
        };
    }
  }, [state]);

  // Animation variants for different states
  const orbVariants = {
    idle: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
    listening: {
      scale: 1 + normalizedLevel * 0.15,
      transition: {
        duration: 0.1,
        ease: 'easeOut' as const,
      },
    },
    processing: {
      rotate: 360,
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'linear' as const,
      },
    },
    speaking: {
      scale: 1 + normalizedLevel * 0.1,
      transition: {
        duration: 0.05,
        ease: 'easeOut' as const,
      },
    },
    interrupted: {
      scale: 0.95,
      transition: {
        duration: 0.2,
      },
    },
    ended: {
      scale: 0.9,
      opacity: 0.6,
      transition: {
        duration: 0.3,
      },
    },
  };

  const getVariant = () => {
    switch (state) {
      case 'Listening':
        return 'listening';
      case 'Processing':
        return 'processing';
      case 'Speaking':
        return 'speaking';
      case 'Interrupted':
        return 'interrupted';
      case 'Ended':
        return 'ended';
      default:
        return 'idle';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || state === 'Ended'}
      className="relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 rounded-full transition-opacity"
      style={{
        width: dimensions.outer,
        height: dimensions.outer,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled || state === 'Ended' ? 'default' : 'pointer',
      }}
      aria-label={`Voice agent ${state.toLowerCase()}`}
    >
      {/* Outer glow ring - only visible when active */}
      <AnimatePresence>
        {state !== 'Idle' && state !== 'Ended' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.1, 1],
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute rounded-full"
            style={{
              width: dimensions.outer,
              height: dimensions.outer,
              background: `radial-gradient(circle, ${colors.glow}20 0%, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Ripple rings for listening state */}
      <AnimatePresence>
        {state === 'Listening' && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: [0.4, 0],
                  scale: [1, 1.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.6,
                  ease: 'easeOut',
                }}
                className="absolute rounded-full border-2"
                style={{
                  width: dimensions.ring,
                  height: dimensions.ring,
                  borderColor: colors.primary,
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Processing spinner ring */}
      <AnimatePresence>
        {state === 'Processing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, rotate: 360 }}
            exit={{ opacity: 0 }}
            transition={{
              rotate: { duration: 1.5, repeat: Infinity, ease: 'linear' },
              opacity: { duration: 0.2 },
            }}
            className="absolute rounded-full"
            style={{
              width: dimensions.ring,
              height: dimensions.ring,
              background: `conic-gradient(from 0deg, transparent 0%, ${colors.primary} 50%, transparent 100%)`,
              mask: 'radial-gradient(transparent 60%, black 61%)',
              WebkitMask: 'radial-gradient(transparent 60%, black 61%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Speaking waveform bars */}
      <AnimatePresence>
        {state === 'Speaking' && (
          <div
            className="absolute flex items-center justify-center gap-1"
            style={{
              width: dimensions.orb,
              height: dimensions.orb,
            }}
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scaleY: 0.3 }}
                animate={{
                  scaleY: [0.3, 0.3 + normalizedLevel * 0.7 * (0.5 + Math.random() * 0.5), 0.3],
                }}
                transition={{
                  duration: 0.15 + Math.random() * 0.1,
                  repeat: Infinity,
                  delay: i * 0.05,
                }}
                className="rounded-full"
                style={{
                  width: 4,
                  height: dimensions.orb * 0.4,
                  backgroundColor: colors.primary,
                  transformOrigin: 'center',
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Main orb */}
      <motion.div
        variants={orbVariants}
        animate={getVariant()}
        className="absolute rounded-full flex items-center justify-center"
        style={{
          width: dimensions.orb,
          height: dimensions.orb,
          background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary}40 100%)`,
          border: `2px solid ${colors.primary}`,
          boxShadow:
            state !== 'Idle' && state !== 'Ended'
              ? `0 0 30px ${colors.glow}40, 0 0 60px ${colors.glow}20`
              : 'none',
        }}
      >
        {/* Inner glow */}
        <div
          className="absolute rounded-full"
          style={{
            width: dimensions.orb * 0.6,
            height: dimensions.orb * 0.6,
            background: `radial-gradient(circle, ${colors.primary}60 0%, transparent 70%)`,
          }}
        />

        {/* State icon/indicator */}
        <div className="relative z-10">
          {state === 'Idle' && (
            <svg
              className="w-12 h-12"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.primary}
              strokeWidth="1.5"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
          {state === 'Processing' && (
            <svg className="w-10 h-10 animate-pulse" viewBox="0 0 24 24" fill={colors.primary}>
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
          {state === 'Ended' && (
            <svg
              className="w-12 h-12"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.primary}
              strokeWidth="1.5"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2" />
            </svg>
          )}
        </div>
      </motion.div>
    </button>
  );
}
