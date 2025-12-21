/**
 * VoiceOrb Component
 * Fluid, Siri-like blob that visualizes voice agent state
 * Features organic morphing, gradient color shifts, and audio-reactive animations
 *
 * - Circle shape when idle/ended
 * - Organic morphing when active (listening, processing, speaking)
 */

import { useMemo } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { VoiceSessionState } from '../types/voice-types';

// Inline keyframe styles (injected once)
const keyframeStyles = `
  @keyframes blobMorph1 {
    0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
    25% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
    50% { border-radius: 50% 60% 30% 60% / 30% 40% 70% 60%; }
    75% { border-radius: 40% 30% 60% 50% / 60% 70% 40% 30%; }
  }

  @keyframes blobMorph2 {
    0%, 100% { border-radius: 40% 60% 60% 40% / 70% 30% 60% 40%; }
    33% { border-radius: 60% 40% 40% 60% / 40% 60% 40% 60%; }
    66% { border-radius: 50% 50% 60% 40% / 50% 50% 40% 60%; }
  }

  @keyframes blobMorph3 {
    0%, 100% { border-radius: 50% 50% 40% 60% / 40% 60% 50% 50%; }
    50% { border-radius: 40% 60% 50% 50% / 60% 40% 60% 40%; }
  }

  @keyframes gradientRotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .voice-orb-blob {
      animation-name: none !important;
    }
    .voice-orb-gradient {
      animation-name: none !important;
    }
  }
`;

// Inject styles once
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = keyframeStyles;
  document.head.appendChild(style);
  stylesInjected = true;
}

interface VoiceOrbProps {
  state: VoiceSessionState;
  audioLevel: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
}

const sizeMap = {
  sm: { orb: 120, glow: 160 },
  md: { orb: 180, glow: 240 },
  lg: { orb: 240, glow: 320 },
};

// State-based color configurations
// Uses CSS variables for theme compatibility, with softer/muted tones
interface StateColors {
  color1: string;
  color2: string;
  color3: string;
  glow: string;
}

// Theme-aware color configurations - softer, more muted colors
function getStateColors(state: VoiceSessionState): StateColors {
  // Get theme context
  const theme = typeof document !== 'undefined'
    ? document.documentElement.getAttribute('data-theme') || 'dark'
    : 'dark';

  const isBlueTheme = theme === 'blue';
  const isLightTheme = theme === 'light';

  switch (state) {
    case 'Idle':
      // Super light green - app's signature color
      if (isBlueTheme) {
        return {
          color1: 'hsl(150, 35%, 55%)',
          color2: 'hsl(145, 30%, 60%)',
          color3: 'hsl(148, 32%, 57%)',
          glow: 'hsla(148, 35%, 55%, 0.25)',
        };
      }
      return {
        color1: isLightTheme ? 'hsl(145, 30%, 60%)' : 'hsl(145, 28%, 42%)',
        color2: isLightTheme ? 'hsl(150, 25%, 65%)' : 'hsl(150, 25%, 47%)',
        color3: isLightTheme ? 'hsl(148, 28%, 62%)' : 'hsl(148, 26%, 45%)',
        glow: isLightTheme ? 'hsla(148, 30%, 55%, 0.15)' : 'hsla(148, 28%, 45%, 0.2)',
      };

    case 'Listening':
      // Soft blue/cyan - matches web-search capability colors
      if (isBlueTheme) {
        return {
          color1: 'hsl(210, 45%, 50%)',
          color2: 'hsl(220, 40%, 55%)',
          color3: 'hsl(200, 45%, 52%)',
          glow: 'hsla(210, 45%, 55%, 0.3)',
        };
      }
      return {
        color1: isLightTheme ? 'hsl(200, 40%, 50%)' : 'hsl(200, 35%, 45%)',
        color2: isLightTheme ? 'hsl(210, 35%, 55%)' : 'hsl(210, 30%, 50%)',
        color3: isLightTheme ? 'hsl(195, 40%, 52%)' : 'hsl(195, 35%, 48%)',
        glow: isLightTheme ? 'hsla(205, 40%, 55%, 0.25)' : 'hsla(205, 35%, 50%, 0.3)',
      };

    case 'Processing':
      // Soft amber/gold - matches warning color tone
      return {
        color1: isLightTheme ? 'hsl(35, 50%, 55%)' : 'hsl(35, 45%, 45%)',
        color2: isLightTheme ? 'hsl(40, 45%, 58%)' : 'hsl(40, 40%, 48%)',
        color3: isLightTheme ? 'hsl(30, 50%, 52%)' : 'hsl(30, 45%, 42%)',
        glow: isLightTheme ? 'hsla(35, 50%, 55%, 0.25)' : 'hsla(35, 45%, 50%, 0.3)',
      };

    case 'Speaking':
      // Brand green - uses app's primary palette
      if (isBlueTheme) {
        // Slight green tint for blue theme
        return {
          color1: 'hsl(160, 35%, 42%)',
          color2: 'hsl(150, 30%, 45%)',
          color3: 'hsl(155, 32%, 43%)',
          glow: 'hsla(155, 35%, 45%, 0.3)',
        };
      }
      return {
        color1: isLightTheme ? 'hsl(140, 35%, 45%)' : 'hsl(140, 30%, 38%)',
        color2: isLightTheme ? 'hsl(145, 30%, 48%)' : 'hsl(145, 28%, 42%)',
        color3: isLightTheme ? 'hsl(138, 32%, 46%)' : 'hsl(138, 30%, 40%)',
        glow: isLightTheme ? 'hsla(140, 35%, 48%, 0.25)' : 'hsla(140, 30%, 42%, 0.3)',
      };

    case 'Interrupted':
      // Soft coral/red - matches error color but muted
      return {
        color1: isLightTheme ? 'hsl(0, 50%, 55%)' : 'hsl(0, 45%, 48%)',
        color2: isLightTheme ? 'hsl(5, 45%, 58%)' : 'hsl(5, 40%, 50%)',
        color3: isLightTheme ? 'hsl(355, 48%, 56%)' : 'hsl(355, 42%, 49%)',
        glow: isLightTheme ? 'hsla(0, 50%, 55%, 0.25)' : 'hsla(0, 45%, 50%, 0.3)',
      };

    case 'Ended':
    default:
      // Very muted - almost neutral
      if (isBlueTheme) {
        return {
          color1: 'hsl(215, 15%, 32%)',
          color2: 'hsl(215, 12%, 35%)',
          color3: 'hsl(215, 15%, 33%)',
          glow: 'hsla(215, 15%, 35%, 0.15)',
        };
      }
      return {
        color1: isLightTheme ? 'hsl(140, 5%, 60%)' : 'hsl(140, 8%, 30%)',
        color2: isLightTheme ? 'hsl(140, 5%, 62%)' : 'hsl(140, 6%, 32%)',
        color3: isLightTheme ? 'hsl(140, 5%, 61%)' : 'hsl(140, 7%, 31%)',
        glow: isLightTheme ? 'hsla(140, 5%, 55%, 0.1)' : 'hsla(140, 8%, 30%, 0.15)',
      };
  }
}

// Animation durations per state (in seconds)
const stateDurations = {
  Idle: { morph: 0, gradient: 0 }, // No morphing when idle
  Listening: { morph: 6, gradient: 8 },
  Processing: { morph: 8, gradient: 4 },
  Speaking: { morph: 4, gradient: 6 },
  Interrupted: { morph: 0, gradient: 0 }, // No morphing when interrupted
  Ended: { morph: 0, gradient: 0 }, // No morphing when ended
};

// Check if state should have morphing animation
function shouldMorph(state: VoiceSessionState): boolean {
  return state === 'Listening' || state === 'Processing' || state === 'Speaking';
}

export function VoiceOrb({ state, audioLevel, size = 'md', onClick, disabled = false }: VoiceOrbProps) {
  // Inject keyframe styles on first render
  injectStyles();

  const dimensions = sizeMap[size];
  // Get theme-aware colors (memoized per state)
  const colors = useMemo(() => getStateColors(state), [state]);
  const durations = stateDurations[state];
  const isMorphing = shouldMorph(state);

  // Smooth audio level with spring physics
  const smoothAudioLevel = useSpring(audioLevel, {
    stiffness: 300,
    damping: 30,
  });

  // Map audio level to scale (subtle: 1.0 to 1.08 for listening, 1.0 to 1.1 for speaking)
  const audioScale = useTransform(
    smoothAudioLevel,
    [0, 1],
    state === 'Speaking' ? [1, 1.1] : state === 'Listening' ? [1, 1.08] : [1, 1.03]
  );

  // Base scale for different states
  const baseScale = useMemo(() => {
    switch (state) {
      case 'Interrupted':
        return 0.92;
      case 'Ended':
        return 0.85;
      case 'Processing':
        return 0.98;
      default:
        return 1;
    }
  }, [state]);

  // Opacity for ended state
  const opacity = state === 'Ended' ? 0.6 : 1;

  // Whether gradient should rotate
  const shouldRotateGradient = state === 'Processing' || state === 'Listening' || state === 'Speaking';

  // Get border-radius style - circle when not morphing, animated when morphing
  const getBlobStyle = (layerIndex: number): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      transition: 'background 0.5s ease, border-radius 0.5s ease',
    };

    if (!isMorphing) {
      // Perfect circle when not active
      return {
        ...baseStyle,
        borderRadius: '50%',
      };
    }

    // Morphing animation when active
    const animationNames = ['blobMorph1', 'blobMorph2', 'blobMorph3'];
    const durationMultipliers = [1, 0.8, 0.6];
    const delays = [0, -2, -1];

    return {
      ...baseStyle,
      animationName: animationNames[layerIndex],
      animationDuration: `${durations.morph * durationMultipliers[layerIndex]}s`,
      animationTimingFunction: 'ease-in-out',
      animationIterationCount: 'infinite',
      animationDelay: `${delays[layerIndex]}s`,
    };
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || state === 'Ended'}
      className="relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 rounded-full transition-opacity duration-300"
      style={{
        width: dimensions.glow,
        height: dimensions.glow,
        opacity: disabled ? 0.5 : opacity,
        cursor: disabled || state === 'Ended' ? 'default' : 'pointer',
      }}
      aria-label={`Voice agent ${state.toLowerCase()}`}
    >
      {/* Ambient Glow Layer - soft background glow */}
      <motion.div
        className="absolute rounded-full"
        initial={{ opacity: 0 }}
        animate={{
          opacity: state !== 'Idle' && state !== 'Ended' ? 0.8 : 0.2,
          scale: state !== 'Idle' && state !== 'Ended' ? [1, 1.03, 1] : 1,
        }}
        transition={{
          opacity: { duration: 0.5 },
          scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{
          width: dimensions.glow,
          height: dimensions.glow,
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 65%)`,
          filter: 'blur(25px)',
        }}
      />

      {/* Main Blob Container - scales with audio */}
      <motion.div
        className="absolute flex items-center justify-center"
        style={{
          width: dimensions.orb,
          height: dimensions.orb,
          scale: audioScale,
        }}
        animate={{
          scale: baseScale,
        }}
        transition={{
          duration: 0.3,
          ease: 'easeOut',
        }}
      >
        {/* Blob Layer 1 - Slowest, base layer */}
        <div
          className="voice-orb-blob absolute"
          style={{
            width: '100%',
            height: '100%',
            background: `linear-gradient(135deg, ${colors.color1} 0%, ${colors.color2} 50%, ${colors.color3} 100%)`,
            opacity: 0.85,
            ...getBlobStyle(0),
          }}
        />

        {/* Blob Layer 2 - Medium speed */}
        <div
          className="voice-orb-blob absolute"
          style={{
            width: '92%',
            height: '92%',
            background: `linear-gradient(225deg, ${colors.color2} 0%, ${colors.color3} 50%, ${colors.color1} 100%)`,
            opacity: 0.7,
            ...getBlobStyle(1),
          }}
        />

        {/* Blob Layer 3 - Fastest, most responsive */}
        <div
          className="voice-orb-blob absolute"
          style={{
            width: '80%',
            height: '80%',
            background: `linear-gradient(315deg, ${colors.color3} 0%, ${colors.color1} 50%, ${colors.color2} 100%)`,
            opacity: 0.9,
            ...getBlobStyle(2),
          }}
        />

        {/* Rotating Gradient Overlay - subtle shimmer */}
        {shouldRotateGradient && (
          <div
            className="voice-orb-gradient absolute rounded-full"
            style={{
              width: '100%',
              height: '100%',
              background: `conic-gradient(from 0deg, ${colors.color1}25, ${colors.color2}35, ${colors.color3}25, ${colors.color1}25)`,
              animationName: 'gradientRotate',
              animationDuration: `${durations.gradient}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              opacity: 0.4,
              mixBlendMode: 'soft-light',
            }}
          />
        )}

        {/* Inner Core - soft center glow for depth */}
        <motion.div
          className="absolute rounded-full"
          animate={{
            scale: state === 'Processing' ? [1, 1.08, 1] : 1,
            opacity: state === 'Ended' ? 0.3 : 0.6,
          }}
          transition={{
            scale: { duration: 1.5, repeat: state === 'Processing' ? Infinity : 0, ease: 'easeInOut' },
            opacity: { duration: 0.3 },
          }}
          style={{
            width: '35%',
            height: '35%',
            background: `radial-gradient(circle, ${colors.color2}60 0%, ${colors.color1}20 60%, transparent 100%)`,
            filter: 'blur(12px)',
          }}
        />

        {/* Highlight - subtle top reflection */}
        <div
          className="absolute rounded-full"
          style={{
            width: '55%',
            height: '35%',
            top: '12%',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 100%)',
            transform: 'rotate(-15deg)',
          }}
        />
      </motion.div>

      {/* Pulse ring for idle state - very subtle breathing */}
      {state === 'Idle' && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: dimensions.orb + 16,
            height: dimensions.orb + 16,
            border: `1px solid ${colors.color2}`,
            opacity: 0.2,
          }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.2, 0.1, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Ripple effect for listening state - subtle */}
      {state === 'Listening' && (
        <>
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: dimensions.orb,
                height: dimensions.orb,
                border: `1px solid ${colors.color1}`,
              }}
              initial={{ scale: 1, opacity: 0.25 }}
              animate={{
                scale: [1, 1.35],
                opacity: [0.25, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 1.25,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}
    </button>
  );
}
