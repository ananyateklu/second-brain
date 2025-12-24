/**
 * Status Icons
 * Icons for indicating status: loading, info, warning, error, success
 */

import { defaultIconProps, type IconProps } from './types';

/**
 * Spinner/Loading icon
 * Used for: loading states
 */
export function Spinner(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props} className={`animate-spin ${props.className || ''}`}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

/**
 * Info/Information icon
 * Used for: info tooltips, help
 */
export function Info(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/**
 * Warning/Alert icon
 * Used for: warnings, alerts
 */
export function Warning(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

/**
 * Error/X Circle icon
 * Used for: errors, failed states
 */
export function Error(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/**
 * Success/Check Circle icon
 * Used for: success states, completed
 */
export function Success(props: IconProps) {
  return (
    <svg {...defaultIconProps} {...props}>
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
