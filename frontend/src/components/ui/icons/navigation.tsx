/**
 * Navigation Icons
 * Chevrons, Menu, and other navigation-related icons
 */

import { defaultIconProps, type IconProps } from './types';

/**
 * Chevron Down icon
 * Used for: dropdowns, expand/collapse indicators
 */
export function ChevronDown(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/**
 * Chevron Up icon
 * Used for: collapse indicators, up navigation
 */
export function ChevronUp(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M5 15l7-7 7 7" />
    </svg>
  );
}

/**
 * Chevron Right icon
 * Used for: navigation, expand indicators
 */
export function ChevronRight(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

/**
 * Chevron Left icon
 * Used for: back navigation, collapse indicators
 */
export function ChevronLeft(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M15 19l-7-7 7-7" />
    </svg>
  );
}

/**
 * Menu/Hamburger icon
 * Used for: mobile menu toggle
 */
export function Menu(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
