/**
 * Animation Tokens
 * Timing functions, durations, and animation presets
 */

/**
 * Duration scale
 */
export const duration = {
  0: '0ms',
  75: '75ms',
  100: '100ms',
  150: '150ms',
  200: '200ms',
  300: '300ms',
  500: '500ms',
  700: '700ms',
  1000: '1000ms',
} as const;

/**
 * Timing functions (easing)
 */
export const easing = {
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  // Custom easings for bouncy/spring effects
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  spring: 'cubic-bezier(0.21, 1.02, 0.73, 1)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/**
 * Transition presets
 */
export const transitions = {
  none: 'none',
  all: `all ${duration[200]} ${easing.inOut}`,
  allFast: `all ${duration[150]} ${easing.inOut}`,
  allSlow: `all ${duration[300]} ${easing.inOut}`,
  colors: `color ${duration[200]} ${easing.inOut}, background-color ${duration[200]} ${easing.inOut}, border-color ${duration[200]} ${easing.inOut}`,
  opacity: `opacity ${duration[200]} ${easing.inOut}`,
  shadow: `box-shadow ${duration[200]} ${easing.inOut}`,
  transform: `transform ${duration[200]} ${easing.inOut}`,
} as const;

/**
 * Animation keyframe names (defined in styles/globals/ and styles/components/)
 */
export const animationNames = {
  fadeIn: 'fadeIn',
  fadeInSlideUp: 'fadeInSlideUp',
  scaleIn: 'scaleIn',
  shimmer: 'shimmer',
  pulseGlow: 'pulse-glow',
  slideInFromLeft: 'slideInFromLeft',
  float: 'float',
  rotateSlow: 'rotate-slow',
  // Chat input animations
  borderGlow: 'borderGlow',
  sendPulse: 'sendPulse',
  sendClick: 'sendClick',
  attachmentSlideIn: 'attachmentSlideIn',
  attachmentSlideOut: 'attachmentSlideOut',
  toolbarSlideDown: 'toolbarSlideDown',
  promptChipFade: 'promptChipFade',
  mentionDropdownFade: 'mentionDropdownFade',
  typingGlow: 'typingGlow',
  lightboxFadeIn: 'lightboxFadeIn',
  lightboxImageZoom: 'lightboxImageZoom',
  // Toast animations
  toastSlideIn: 'toastSlideIn',
  toastSlideOut: 'toastSlideOut',
  // Selection animations
  checkIn: 'checkIn',
  checkOut: 'checkOut',
  checkmarkDraw: 'checkmarkDraw',
  shakeDelete: 'shakeDelete',
  pulseDelete: 'pulseDelete',
  slideDownReveal: 'slideDownReveal',
  staggerFadeIn: 'staggerFadeIn',
  selectHighlight: 'selectHighlight',
  toggleRotateIn: 'toggleRotateIn',
  toggleRotateOut: 'toggleRotateOut',
} as const;

/**
 * Animation presets
 */
export const animationPresets = {
  fadeIn: `${animationNames.fadeIn} ${duration[200]} ${easing.out}`,
  fadeInSlideUp: `${animationNames.fadeInSlideUp} ${duration[300]} ${easing.out}`,
  scaleIn: `${animationNames.scaleIn} ${duration[200]} ${easing.out}`,
  shimmer: `${animationNames.shimmer} ${duration[1000]} infinite`,
  float: `${animationNames.float} 3s ${easing.inOut} infinite`,
} as const;

/**
 * Combined animations export
 */
export const animations = {
  duration,
  easing,
  transitions,
  names: animationNames,
  presets: animationPresets,
} as const;

export type DurationKey = keyof typeof duration;
export type EasingKey = keyof typeof easing;
export type TransitionKey = keyof typeof transitions;
export type AnimationNameKey = keyof typeof animationNames;
