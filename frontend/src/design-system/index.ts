/**
 * Second Brain Design System
 *
 * A comprehensive design system providing tokens and primitives
 * for consistent UI development.
 *
 * @example
 * ```tsx
 * import { Box, Flex, Stack, Grid, tokens, colors, spacing } from '@/design-system';
 *
 * // Using primitives
 * <Flex gap={4} align="center" justify="between">
 *   <Box p={4} bg={colors.semantic.surfaceCard} rounded="lg">
 *     Content
 *   </Box>
 * </Flex>
 *
 * // Using tokens in styles
 * <div style={{ padding: spacing[4], color: colors.semantic.textPrimary }}>
 *   Text
 * </div>
 * ```
 */

// ============================================
// Tokens
// ============================================

export * from './tokens';
export { tokens } from './tokens';

// Direct token exports for convenience
export {
  colors,
  brandColors,
  blueColors,
  semanticColors,
  errorColors,
  accentColors,
  buttonColors,
  iconColors,
  gradientColors,
  inputColors,
  promptChipColors,
  glassColors,
} from './tokens/colors';

export {
  spacing,
  gap,
  padding,
  margin,
  layoutSpacing,
} from './tokens/spacing';

export {
  typography,
  fontSize,
  lineHeight,
  fontWeight,
  fontFamily,
  letterSpacing,
  textDecoration,
  textTransform,
  textStyles,
} from './tokens/typography';

export {
  shadows,
  cardShadows,
  buttonShadows,
  focusShadows,
  glassShadows,
  allShadows,
} from './tokens/shadows';

export {
  borders,
  borderRadius,
  borderWidth,
  borderStyle,
  borderPresets,
  ringWidth,
  ringOffset,
} from './tokens/borders';

export {
  animations,
  duration,
  easing,
  transitions,
  animationNames,
  animationPresets,
} from './tokens/animations';

// ============================================
// Primitives
// ============================================

export {
  Box,
  type BoxProps,
  type BoxStyleProps,
} from './primitives/Box';

export {
  Flex,
  type FlexProps,
} from './primitives/Flex';

export {
  Stack,
  VStack,
  HStack,
  type StackProps,
} from './primitives/Stack';

export {
  Grid,
  GridItem,
  SimpleGrid,
  type GridProps,
  type GridStyleProps,
  type GridItemProps,
  type SimpleGridProps,
} from './primitives/Grid';

// ============================================
// Hooks
// ============================================

export * from './hooks';

export {
  useDesignTokens,
  useTokenValue,
  useTheme,
  type UseDesignTokensReturn,
} from './hooks/use-design-tokens';

// ============================================
// Types
// ============================================

export type {
  BrandColorKey,
  SemanticColorKey,
  Colors,
} from './tokens/colors';

export type {
  SpacingKey,
  GapKey,
  PaddingKey,
  MarginKey,
} from './tokens/spacing';

export type {
  FontSizeKey,
  LineHeightKey,
  FontWeightKey,
  FontFamilyKey,
  TextStyleKey,
} from './tokens/typography';

export type {
  ShadowKey,
  CardShadowKey,
  ButtonShadowKey,
} from './tokens/shadows';

export type {
  BorderRadiusKey,
  BorderWidthKey,
  BorderStyleKey,
  BorderPresetKey,
} from './tokens/borders';

export type {
  DurationKey,
  EasingKey,
  TransitionKey,
  AnimationNameKey,
} from './tokens/animations';

export type { Tokens } from './tokens';
