/**
 * Design System Tokens
 * Central export for all design tokens
 */

export * from './colors';
export * from './spacing';
export * from './typography';
export * from './shadows';
export * from './borders';
export * from './animations';

// Re-export main token objects
import { colors } from './colors';
import { spacing, gap, padding, margin, layoutSpacing } from './spacing';
import { typography, fontSize, lineHeight, fontWeight, fontFamily, textStyles } from './typography';
import { shadows, cardShadows, buttonShadows, focusShadows, glassShadows, allShadows } from './shadows';
import { borders, borderRadius, borderWidth, borderPresets } from './borders';
import { animations, duration, easing, transitions, animationNames } from './animations';

/**
 * Combined tokens object for convenience
 */
export const tokens = {
  colors,
  spacing,
  gap,
  padding,
  margin,
  layoutSpacing,
  typography,
  fontSize,
  lineHeight,
  fontWeight,
  fontFamily,
  textStyles,
  shadows: allShadows,
  boxShadow: shadows,
  cardShadow: cardShadows,
  buttonShadow: buttonShadows,
  focusShadow: focusShadows,
  glassShadow: glassShadows,
  borders,
  borderRadius,
  borderWidth,
  borderPresets,
  animations,
  duration,
  easing,
  transitions,
  animationNames,
} as const;

export type Tokens = typeof tokens;
